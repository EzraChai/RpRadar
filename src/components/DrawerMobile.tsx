import { Search, Star, X } from "lucide-react";
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
import { getMalaysiaDate, hasCurrentTimePassed, nextBusTime } from "./Map";
import { Card } from "./ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import Schedule from "@/../data/schedule.json";
import { useStarredRoutes } from "@/hooks/use-starred-routes";

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
  const [savedRoutes, setSavedRoutes] = useState<
    (
      | {
          route_id: string;
          route_code: string;
          route_name: string;
          shape_ids: string[];
        }
      | undefined
    )[]
  >([]);

  const { starred, toggle } = useStarredRoutes();

  useEffect(() => {
    setSavedRoutes(starred.map((s) => routes.find((r) => r.route_id === s)));
  }, [starred]);

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
    if (dy > 100 && currentIndex > 0) setSnap(SNAP_POINTS[currentIndex - 1]);
    else if (dy < -100 && currentIndex < SNAP_POINTS.length - 1)
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
                className="overflow-y-auto overscroll-contain "
              >
                <div className="p-2 py-0 flex justify-between items-center">
                  <div className="border-2 font-semibold border-red-500 rounded-lg px-2">
                    {route?.route_short_name}
                  </div>
                  <DialogTitle className=" w-full p-2 font-bold text-lg">
                    {
                      route?.directions.filter(
                        (d) => d.direction_id === direction
                      )[0].route_long_name
                    }
                  </DialogTitle>

                  <Star
                    onClick={() => toggle(route.route_id || "")}
                    size={24}
                    fill={
                      starred.includes(route.route_id || "")
                        ? "oklch(79.5% 0.184 86.047)"
                        : "none"
                    }
                    className={`mr-2 ${
                      starred.includes(route.route_id || "") &&
                      "text-yellow-500 "
                    }`}
                  />

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
                          key={idx}
                          className={`${
                            idx === 0 && "mt-2"
                          } flex relative w-full `}
                        >
                          {/* Bullet */}
                          <div className="flex w-3 flex-col items-center mr-1">
                            <div className="w-3 h-3 absolute rounded-full bg-blue-600 z-10"></div>
                            {/* Vertical line */}
                            {idx <
                              route?.directions.filter(
                                (d) => d.direction_id === direction
                              )[0].stops.length -
                                1 && (
                              <div className=" h-full w-1 bg-blue-500"></div>
                            )}
                          </div>
                          {/* Stop Name */}
                          <div className="w-full">
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
                                }
                              }}
                              className="cursor-pointer m-2 !hover:bg-transparent  text-sm font-medium rounded-none mx-1 -mt-4 justify-start w-full text-left whitespace-normal break-words"
                            >
                              <p>{stop.stop_name}</p>
                            </Button>
                            {idx === 0 && Schedule && (
                              <Collapsible className="px-6 mb-4">
                                <CollapsibleTrigger asChild>
                                  <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                                    Next bus will depart at{" "}
                                    {nextBusTime(
                                      Schedule.find(
                                        (s) => s.route_id === route.route_id
                                      )
                                        ?.directions.filter(
                                          (d) => d.direction_id === direction
                                        )[0]
                                        .dates.find(
                                          (d) => d.date === getMalaysiaDate()
                                        )?.times
                                    )}
                                  </Card>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2">Scheduled</div>
                                  <div className="grid grid-cols-6 self-center ">
                                    {Schedule.find(
                                      (s) => s.route_id === route.route_id
                                    )
                                      ?.directions.filter(
                                        (d) => d.direction_id === direction
                                      )[0]
                                      .dates.find(
                                        (d) => d.date === getMalaysiaDate()
                                      )
                                      ?.times.map((t, idx) => (
                                        <div
                                          key={idx}
                                          className={`${
                                            hasCurrentTimePassed(t)
                                              ? "dark:text-neutral-500 text-neutral-400"
                                              : "dark:text-white text-black"
                                          } px-2`}
                                        >
                                          {t.substring(0, 5)}
                                        </div>
                                      ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
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
                      className="mb-3 pl-10 pr-10 py-2 h-12 dark:text-white !text-lg bg-neutral-50 dark:!bg-neutral-900"
                      placeholder="Search Routes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <X
                      onClick={() => setSearch("")}
                      className={`${
                        search ? "text-gray-100" : "text-gray-500"
                      } absolute right-8 top-1/2 -translate-y-1/2  w-4 h-4`}
                    />
                  </div>
                  <div className="mt-4 overflow-y-auto max-h-[84dvh]">
                    <div className="px-4">
                      {filteredRoutes.length === routes.length && (
                        <>
                          {savedRoutes.length !== 0 && (
                            <>
                              <p className="text-sm dark:text-white text-black px-4 pb-2">
                                Saved Routes
                              </p>
                              {savedRoutes.map((route, index) => (
                                <Link
                                  key={route?.route_id}
                                  className=" flex items-center gap-2"
                                  to={`/?id=${route?.route_id}`}
                                  preventScrollReset
                                >
                                  <Button
                                    className={`w-full dark:hover:bg-neutral-700 cursor-pointer overflow-hidden border-b dark:border-neutral-600 flex justify-between items-center rounded-none py-10 bg-neutral-50 dark:bg-neutral-900
                          ${index === 0 && "rounded-t-3xl"}
                          ${
                            index === savedRoutes.length - 1 &&
                            "rounded-b-3xl mb-4 border-b-0"
                          }`}
                                    variant={"ghost"}
                                    key={route?.route_id}
                                  >
                                    <p className="text-black  dark:text-white">
                                      {route?.route_name}
                                    </p>
                                    <div className="w-12 h-6 font-semibold flex justify-center items-center text-sm border-2 border-red-500 rounded-lg text-black dark:text-white">
                                      {route?.route_code}
                                    </div>
                                  </Button>
                                </Link>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className={`p-4 pt-3 `}>
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
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
