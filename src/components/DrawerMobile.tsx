import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { Input } from "./ui/input";
import routes from "@/assets/routes_with_shapes.json";
import { RouteCard } from "./app-sidebar";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Link } from "react-router";
import { Button } from "./ui/button";
import type { CircleMarker } from "leaflet";
import { useMap } from "react-leaflet";

const SNAP_POINTS = [0.2, 0.5, 1];

export function DrawerMobile({
  markerRefs,
  route,
  direction,
  setDirection,
}: {
  markerRefs: React.RefObject<{
    [key: string]: CircleMarker<unknown> | null;
  }>;
  direction: number;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  route?:
    | {
        route_id: string;
        route_short_name: string;
        directions: {
          direction_id: number;
          shape_id: string;
          route_long_name: string;
          stops: {
            stop_id: string;
            stop_name: string;
            lat: number;
            lon: number;
          }[];
        }[];
      }
    | undefined;
}) {
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);
  const [search, setSearch] = useState("");
  const map = useMap();

  const [filteredRoutes, setFilteredRoutes] = useState(routes); // initial list
  const activeScrollRef = useRef<HTMLDivElement>(null);
  const list2Ref = useRef<HTMLDivElement>(null);
  const list1Ref = useRef<HTMLDivElement>(null);

  const touchStartY = useRef<number | null>(null);
  const dragOffset = useRef<number>(0);
  const isDragging = useRef(false);

  // Track finger start
  const handleTouchStart =
    (ref: React.RefObject<HTMLDivElement | null>) => (e: React.TouchEvent) => {
      activeScrollRef.current = ref.current;
      touchStartY.current = e.touches[0].clientY;
      dragOffset.current = 0;
      isDragging.current = false;
    };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeScrollRef.current || touchStartY.current === null) return;

    const dy = e.touches[0].clientY - touchStartY.current;
    const scrollTop = activeScrollRef.current.scrollTop;
    const scrollHeight = activeScrollRef.current.scrollHeight;
    const clientHeight = activeScrollRef.current.clientHeight;

    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight;

    if ((atTop && dy > 0) || (atBottom && dy < 0)) {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      dragOffset.current = dy;

      const currentIndex =
        typeof snap === "number" ? SNAP_POINTS.indexOf(snap) : 0;
      if (dy > 50 && currentIndex > 0 && atTop) {
        setSnap(SNAP_POINTS[currentIndex - 1]);
        touchStartY.current = e.touches[0].clientY;
      } else if (
        dy < -50 &&
        currentIndex < SNAP_POINTS.length - 1 &&
        atBottom
      ) {
        setSnap(SNAP_POINTS[currentIndex + 1]);
        touchStartY.current = e.touches[0].clientY;
      }
    } else {
      isDragging.current = false;
      dragOffset.current = 0;
    }
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (!isDragging.current) return;

    const currentIndex =
      typeof snap === "number" ? SNAP_POINTS.indexOf(snap) : 0;
    const dy = dragOffset.current;

    // Snap to nearest point on release
    if (dy > 50 && currentIndex > 0) setSnap(SNAP_POINTS[currentIndex - 1]);
    else if (dy < -50 && currentIndex < SNAP_POINTS.length - 1)
      setSnap(SNAP_POINTS[currentIndex + 1]);

    dragOffset.current = 0;
    touchStartY.current = null;
    isDragging.current = false;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = search.trim().toLowerCase();

      const results = routes.filter(
        (bus) =>
          bus.route_code.toLowerCase().includes(term) ||
          bus.route_name.toLowerCase().includes(term)
      );

      setFilteredRoutes(results);
    }, 300); // wait 300ms after user stops typing

    return () => clearTimeout(handler); //
  }, [search]);

  return (
    <Drawer.Root
      repositionInputs={false}
      open
      dismissible={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-testid="content"
          className="fixed z-[1000] flex p-2 flex-col backdrop-blur-lg border border-b-0 border-x-0 dark:border-neutral-500 bg-white/50 dark:bg-white/10 rounded-t-[10px] bottom-0 left-0 right-0 h-full  max-h-[97%] mx-[-1px]"
        >
          <div className="max-w-md w-full mx-auto rounded-t-[10px]">
            <Drawer.Handle />
            {route ? (
              <div
                ref={list1Ref}
                onTouchStart={handleTouchStart(list1Ref)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                // onPointerDownCapture={(e) => e.stopPropagation()}
                className="overflow-y-auto overscroll-contain "
              >
                <div className="p-2 py-0 flex justify-between items-center">
                  <div className="border-2 border-red-500 rounded-lg px-2">
                    {route?.route_short_name}
                  </div>
                  <DialogTitle className=" w-full p-2 font-bold text-xl">
                    {
                      route?.directions.filter(
                        (d) => d.direction_id === direction
                      )[0].route_long_name
                    }
                  </DialogTitle>
                  <Link to={"/"} className="p-2 hover:bg-white/10 rounded-full">
                    <X size={24} />
                  </Link>
                </div>
                <div>
                  {route?.directions.length === 2 && (
                    <Button
                      variant={"outline"}
                      className="bg-white w-full"
                      onClick={() =>
                        setDirection((prev) => {
                          if (route?.directions.length == 2) {
                            return prev === 1 ? 0 : 1;
                          }
                          return 0;
                        })
                      }
                    >
                      Change Direction
                    </Button>
                  )}
                  <div
                    className={`mt-4 ml-2 overflow-y-auto overflow-x-clip ${
                      snap === SNAP_POINTS[2] && "max-h-[78dvh]"
                    }
                  ${snap === SNAP_POINTS[1] && "max-h-[50dvh]"}
                  `}
                  >
                    {route?.directions
                      .filter((d) => d.direction_id === direction)[0]
                      .stops.map((stop, idx) => (
                        <div
                          onPointerDownCapture={(e) => e.stopPropagation()}
                          key={idx}
                          className={`${
                            idx === 0 && "mt-2"
                          } flex lative w-full `}
                        >
                          {/* Bullet */}
                          <div className="flex flex-col items-center mr-1">
                            <div className="w-3 h-3 rounded-full bg-blue-600 z-10"></div>
                            {/* Vertical line */}
                            {idx <
                              route?.directions.filter(
                                (d) => d.direction_id === direction
                              )[0].stops.length -
                                1 && (
                              <div className=" h-6 w-1 bg-blue-500"></div>
                            )}
                          </div>
                          {/* Stop Name */}
                          <Button
                            variant={"ghost"}
                            onClick={() => {
                              const marker = markerRefs.current[stop.stop_id];
                              if (marker) {
                                if (!marker.isPopupOpen()) {
                                  marker.openPopup();
                                }
                                map.flyTo([stop.lat, stop.lon], 16, {
                                  animate: true,
                                });
                                setSnap(SNAP_POINTS[0]);
                              }
                            }}
                            className="cursor-pointer text-sm font-medium rounded-none mx-1 -mt-3 justify-start w-full text-left whitespace-normal break-words"
                          >
                            {stop.stop_name}
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Drawer.Title>
                  <div
                    className={`flex flex-row gap-1 items-center  pt-2 px-4 `}
                  >
                    <img
                      className={`w-6 h-6 object-cover rounded-2xl`}
                      src="/RpRadar.png"
                      alt="logo of RPRadar"
                    />

                    <h2
                      className={`font-bold font-serif text-lg whitespace-nowrap`}
                    >
                      <span className="text-red-600 dark:text-red-500">Rp</span>
                      Radar
                    </h2>
                  </div>
                </Drawer.Title>
                <div
                  ref={list2Ref}
                  onTouchStart={handleTouchStart(list2Ref)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="py-1 text-black overflow-y-auto overscroll-contain"
                >
                  <div className="px-4 relative ">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      onFocus={() => {
                        if (snap === SNAP_POINTS[0]) setSnap(SNAP_POINTS[1]);
                      }}
                      className="mb-3 pl-10 pr-2 py-2 h-12 text-white !text-lg bg-neutral-50 dark:!bg-neutral-900"
                      placeholder="Search Routes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className={`p-4 pt-3 overflow-y-auto max-h-[80dvh]`}>
                    {filteredRoutes.map((r, idx) => (
                      <RouteCard
                        key={idx}
                        setSnap={setSnap}
                        line={r}
                        length={filteredRoutes.length}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
