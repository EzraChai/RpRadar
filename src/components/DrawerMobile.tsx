import { Search, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { Input } from "./ui/input";
import { RouteCard } from "./app-sidebar";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Link } from "react-router";
import { Button } from "./ui/button";
import type { CircleMarker } from "leaflet";
import { useMap } from "react-leaflet";
import RpRadarIcon from "@/assets/RpRadar.png";
import { getCurrentDate, hasCurrentTimePassed, nextBusTime } from "@/lib/utils";
import { Card } from "./ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import RapidPenangRoutes from "@/assets/rp/rp_routes_with_shapes.json";
import RapidKLRoutes from "@/assets/rkl/rkl_routes_with_shapes.json";
import MRTFeederRoutes from "@/assets/mrt/mrt_routes_with_shapes.json";
import MyBasNSARoutes from "@/assets/ns_a/ns_a_routes_with_shapes.json";
import MyBasNSBRoutes from "@/assets/ns_b/ns_b_routes_with_shapes.json";
import MyBasMkRoutes from "@/assets/mk/mk_routes_with_shapes.json";
import MyBasJbRoutes from "@/assets/jb/jb_routes_with_shapes.json";
import MyBasPkRoutes from "@/assets/pk/pk_routes_with_shapes.json";
import MyBasKtnRoutes from "@/assets/ktn/ktn_routes_with_shapes.json";
import MyBasAlrRoutes from "@/assets/alr/alr_routes_with_shapes.json";
import MyBasKgrRoutes from "@/assets/kgr/kgr_routes_with_shapes.json";
import MyBasKtbRoutes from "@/assets/ktb/ktb_routes_with_shapes.json";
import RapidPenangSchedule from "@/../data/rapid-penang-schedule.json";
import RapidKLSchedule from "@/../data/rapid-kl-schedule.json";
import MRTFeederSchedule from "@/../data/mrt-feeder-schedule.json";
import MYBasNSASchedule from "@/../data/ns-a-schedule.json";
import MYBasNSBSchedule from "@/../data/ns-b-schedule.json";
import MyBasMkSchedule from "@/../data/mk-schedule.json";
import MyBasJbSchedule from "@/../data/jb-schedule.json";
import MyBasPkSchedule from "@/../data/pk-schedule.json";
import MyBasKtnSchedule from "@/../data/rapid-ktn-schedule.json";
import MyBasAlrSchedule from "@/../data/alr-schedule.json";
import MyBasKgrSchedule from "@/../data/kgr-schedule.json";
import MyBasKtbSchedule from "@/../data/ktb-schedule.json";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import type { BusScheduleType, RouteType } from "@/hooks/types";

export const SNAP_POINTS = [0.26, 0.5, 1];

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
  const [provider] = useState<string>(() => {
    return localStorage.getItem("provider") || "rp";
  });

  const [BusSchedule] = useState<BusScheduleType>(() => {
    if (provider === "rkl") {
      const combinedSchedule = [...RapidKLSchedule, ...MRTFeederSchedule];
      return combinedSchedule as unknown as BusScheduleType;
    } else if (provider === "ns") {
      const combinedSchedule = [...MYBasNSASchedule, ...MYBasNSBSchedule];
      return combinedSchedule as unknown as BusScheduleType;
    } else if (provider === "mk") {
      return MyBasMkSchedule as unknown as BusScheduleType;
    } else if (provider === "jb") {
      return MyBasJbSchedule as unknown as BusScheduleType;
    } else if (provider === "pk") {
      return MyBasPkSchedule as unknown as BusScheduleType;
    } else if (provider === "ktn") {
      return MyBasKtnSchedule as unknown as BusScheduleType;
    } else if (provider === "alr") {
      return MyBasAlrSchedule as unknown as BusScheduleType;
    } else if (provider === "kgr") {
      return MyBasKgrSchedule as unknown as BusScheduleType;
    } else if (provider === "ktb") {
      return MyBasKtbSchedule as unknown as BusScheduleType;
    }
    return RapidPenangSchedule as unknown as BusScheduleType;
  });

  const [routes] = useState<RouteType[]>(() => {
    if (provider === "rkl") {
      const combinedSelangorKLRoutes = [...RapidKLRoutes, ...MRTFeederRoutes];
      return combinedSelangorKLRoutes as unknown as RouteType[];
    } else if (provider === "ns") {
      const combinedNSRoutes = [...MyBasNSARoutes, ...MyBasNSBRoutes];
      return combinedNSRoutes.sort((a, b) =>
        a.route_id.localeCompare(b.route_id),
      ) as unknown as RouteType[];
    } else if (provider === "mk") {
      return MyBasMkRoutes.sort((a, b) =>
        a.route_id.localeCompare(b.route_id),
      ) as unknown as RouteType[];
    } else if (provider === "jb") {
      return MyBasJbRoutes.sort((a, b) =>
        a.route_id.localeCompare(b.route_id),
      ) as unknown as RouteType[];
    } else if (provider === "ktn") {
      return MyBasKtnRoutes as unknown as RouteType[];
    } else if (provider === "pk") {
      return MyBasPkRoutes as unknown as RouteType[];
    } else if (provider === "alr") {
      return MyBasAlrRoutes as unknown as RouteType[];
    } else if (provider === "kgr") {
      return MyBasKgrRoutes.sort((a, b) =>
        a.route_id.localeCompare(b.route_id),
      ) as unknown as RouteType[];
    } else if (provider === "ktb") {
      return MyBasKtbRoutes as unknown as RouteType[];
    }
    return RapidPenangRoutes as unknown as RouteType[];
  });
  const map = useMap();
  const [savedRoutes, setSavedRoutes] = useState<(RouteType | undefined)[]>([]);

  const { starred, toggle } = useStarredRoutes();

  useEffect(() => {
    if (!routes) {
      setSavedRoutes([]);
      return;
    }

    setSavedRoutes(
      routes.filter((r) => {
        return (
          r.route_id ===
          starred.find((starredName) => starredName === r.route_id)
        );
      }),
    );
  }, [starred, provider, routes]);

  const [filteredRoutes, setFilteredRoutes] = useState(routes); // initial list
  const activeScrollRef = useRef<HTMLDivElement>(null);
  const list2Ref = useRef<HTMLDivElement>(null);
  const list1Ref = useRef<HTMLDivElement>(null);

  const touchStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const lastTouchTime = useRef<number | null>(null);

  const handleTouchStart =
    (ref: React.RefObject<HTMLDivElement | null>) => (e: React.TouchEvent) => {
      activeScrollRef.current = ref.current;

      const y = e.touches[0].clientY;
      touchStartY.current = y;
      lastTouchY.current = y;
      lastTouchTime.current = performance.now();
    };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeScrollRef.current || lastTouchY.current === null) return;

    const currentY = e.touches[0].clientY;
    const now = performance.now();

    const dt = now - (lastTouchTime.current ?? now); // time in ms
    const velocity = dt > 0 ? (currentY - lastTouchY.current) / dt : 0; // px/ms

    lastTouchY.current = currentY;
    lastTouchTime.current = now;

    const scrollTop = activeScrollRef.current.scrollTop;
    const scrollHeight = activeScrollRef.current.scrollHeight;
    const clientHeight = activeScrollRef.current.clientHeight;

    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight;

    // Snap based purely on velocity
    const velocityThreshold = 2; // tweak this (px/ms)

    if (atTop && velocity > velocityThreshold) {
      // swipe down at top -> snap up
      const currentIndex =
        typeof snap === "number" ? SNAP_POINTS.indexOf(snap) : 0;
      if (currentIndex > 0) setSnap(SNAP_POINTS[currentIndex - 1]);
    } else if (atBottom && velocity < -velocityThreshold) {
      // swipe up at bottom -> snap down
      const currentIndex =
        typeof snap === "number" ? SNAP_POINTS.indexOf(snap) : 0;
      if (currentIndex < SNAP_POINTS.length - 1)
        setSnap(SNAP_POINTS[currentIndex + 1]);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = search.trim().toLowerCase();

      const results = routes.filter(
        (bus) =>
          bus.route_code.toLowerCase().includes(term) ||
          bus.route_name.toLowerCase().includes(term),
      );

      setFilteredRoutes(results);
    }, 300); // wait 300ms after user stops typing

    return () => clearTimeout(handler);
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
          className="fixed z-1000 flex p-2 flex-col backdrop-blur-lg border border-b-0 border-x-0 dark:border-neutral-500 bg-white/50 dark:bg-white/10 rounded-t-[10px] bottom-0 left-0 right-0 h-full outline-none max-h-[97%] -mx-px"
        >
          <div className="max-w-md w-full mx-auto rounded-t-[10px]">
            <Drawer.Handle />
            {route ? (
              <div
                ref={list1Ref}
                onTouchStart={handleTouchStart(list1Ref)}
                onTouchMove={handleTouchMove}
                className="overflow-y-auto overscroll-contain "
              >
                <div className="p-2 py-0 flex justify-between items-center">
                  <div
                    className={`border-2 font-semibold ${provider === "rkl" && route?.directions[0].route_long_name === route?.route_short_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-lg px-2`}
                  >
                    {route?.route_short_name}
                  </div>

                  <div className="flex items-center gap-2">
                    <Star
                      onClick={() => toggle(route.route_id || "")}
                      size={18}
                      fill={
                        starred.includes(route.route_id || "")
                          ? "oklch(79.5% 0.184 86.047)"
                          : "none"
                      }
                      className={`${
                        starred.includes(route.route_id || "") &&
                        "text-yellow-500"
                      }`}
                    />

                    <Link
                      to={"/"}
                      className="p-2 hover:bg-white/10 rounded-full"
                    >
                      <X size={24} />
                    </Link>
                  </div>
                </div>
                <DialogTitle className=" w-full p-2 font-bold text-xl">
                  {
                    route?.directions.filter(
                      (d) => d.direction_id === direction,
                    )[0].route_long_name
                  }
                </DialogTitle>
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
                    className={`mt-4 ml-2 overflow-y-auto overflow-x-clip scroll-hidden ${
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
                          } flex relative w-full`}
                        >
                          {/* Bullet */}

                          <div
                            className={`flex flex-col items-center w-4 mr-2`}
                          >
                            <div
                              className={`w-3 h-3 absolute rounded-full  ${provider === "rkl" && route?.directions[0].route_long_name === route?.route_short_name ? "bg-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-500" : "bg-blue-600"}  z-10`}
                            ></div>
                            {/* Vertical line */}
                            {idx <
                              route?.directions.filter(
                                (d) => d.direction_id === direction,
                              )[0].stops.length -
                                1 && (
                              <div
                                className={` h-full w-1 ${provider === "rkl" && route?.directions[0].route_long_name === route?.route_short_name ? "bg-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-500" : "bg-blue-500"}`}
                              ></div>
                            )}
                          </div>

                          {/* Stop Name */}
                          <div className="w-full -mt-2 pb-2">
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
                              className="cursor-pointer mr-2 m-2 !hover:bg-transparent text-sm font-medium rounded-none mx-1 -mt-4 justify-start w-full text-left whitespace-normal wrap-break-words"
                            >
                              <p>{stop.stop_name}</p>
                            </Button>
                            {idx === 0 && BusSchedule && (
                              <Collapsible className="px-6 mb-4">
                                <CollapsibleTrigger asChild>
                                  <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                                    Next bus will depart at{" "}
                                    {nextBusTime(
                                      BusSchedule?.find(
                                        (s) =>
                                          s.r === route.route_id &&
                                          s.d === direction &&
                                          s.dt === getCurrentDate(),
                                      )?.t || [],
                                    )}
                                  </Card>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2">Scheduled</div>
                                  <div className="grid grid-cols-6 self-center text-xs">
                                    {BusSchedule?.find(
                                      (s) =>
                                        s.r === route.route_id &&
                                        s.d === direction &&
                                        s.dt === getCurrentDate(),
                                    )?.t.map((time, idx) => (
                                      <div
                                        key={idx}
                                        className={`${
                                          hasCurrentTimePassed(time)
                                            ? "dark:text-neutral-500 text-neutral-400"
                                            : "dark:text-white text-black"
                                        } px-2`}
                                      >
                                        {time.substring(0, 5)}
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
                      className={`w-7 h-7 object-cover rounded-lg border border-white dark:border-neutral-500`}
                      src={RpRadarIcon}
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
                  className="py-1 text-black overflow-y-auto overscroll-contain"
                >
                  <div className="px-4 relative ">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      onFocus={() => {
                        if (snap === SNAP_POINTS[0]) setSnap(SNAP_POINTS[1]);
                      }}
                      className="mb-3 pl-10 pr-10 py-2 h-12 dark:text-white text-lg! bg-neutral-50 dark:bg-neutral-900!"
                      placeholder="Search Routes"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search.length !== 0 && (
                      <X
                        onClick={() => setSearch("")}
                        className={`${
                          search ? "text-gray-100" : "text-gray-500"
                        } absolute right-8 top-1/2 -translate-y-1/2  w-4 h-4`}
                      />
                    )}
                  </div>
                  <div className="mt-4 overflow-y-auto max-h-[84dvh] scroll-hidden">
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
                                  className=" flex items-center"
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
                                  >
                                    <p className="text-sm pr-4 whitespace-normal text-left wrap-break-word dark:text-neutral-50 text-neutral-900">
                                      {route?.route_name}
                                    </p>
                                    <div
                                      className={`min-w-12 px-1 h-6 font-semibold flex justify-center items-center text-sm border-2 ${provider === "rkl" && route?.route_code === route?.route_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-lg text-black dark:text-white`}
                                    >
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
                          provider={provider}
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
