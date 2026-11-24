import { Search, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { Input } from "./ui/input";
import { RouteCard, StopCard } from "./app-sidebar";
import { useStopSearch } from "@/hooks/use-stop-search";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { useMap } from "./maplibre-adapter";
import type { CircleMarkerRef } from "./maplibre-adapter";
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
import MyBasTrgRoutes from "@/assets/trg/trg_routes_with_shapes.json";
import MyBasSwRoutes from "@/assets/sw/sw_routes_with_shapes.json";
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
import MyBasTrgSchedule from "@/../data/trg-schedule.json";
import MyBasSwSchedule from "@/../data/sw-schedule.json";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import type { BusScheduleType, RouteType } from "@/hooks/types";

const SNAP_POINTS = [0.26, 0.5, 1];

export function DrawerMobile({
  markerRefs,
  route,
  direction,
  setDirection,
}: {
  markerRefs: React.RefObject<{
    [key: string]: CircleMarkerRef | null;
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
  const touchStartYRef = useRef<number | null>(null);
  const touchSnapTriggeredRef = useRef(false);
  const isAndroid = /Android/i.test(navigator.userAgent);
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
    } else if (provider === "trg") {
      return MyBasTrgSchedule as unknown as BusScheduleType;
    } else if (provider === "sw") {
      return MyBasSwSchedule as unknown as BusScheduleType;
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
    } else if (provider === "trg") {
      return MyBasTrgRoutes.sort((a, b) =>
        a.route_id.localeCompare(b.route_id),
      ) as unknown as RouteType[];
    } else if (provider === "sw") {
      return MyBasSwRoutes as unknown as RouteType[];
    }
    return RapidPenangRoutes as unknown as RouteType[];
  });
  const map = useMap();
  const [savedRoutes, setSavedRoutes] = useState<(RouteType | undefined)[]>([]);

  const { starred, toggle } = useStarredRoutes();

  const handleListTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isAndroid) return;
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchSnapTriggeredRef.current = false;
  };

  const handleListTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (
      !isAndroid ||
      touchStartYRef.current === null ||
      touchSnapTriggeredRef.current ||
      event.currentTarget.scrollTop > 0
    ) {
      return;
    }

    const pullDistance = event.touches[0].clientY - touchStartYRef.current;
    if (pullDistance < 64) return;

    const snapIndex = typeof snap === "number" ? SNAP_POINTS.indexOf(snap) : -1;
    if (snapIndex <= 0) return;

    touchSnapTriggeredRef.current = true;
    setSnap(SNAP_POINTS[snapIndex - 1]);
  };

  const resetListTouch = () => {
    touchStartYRef.current = null;
    touchSnapTriggeredRef.current = false;
  };

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

  // When a route is loaded, reset snap to lowest height so map is visible
  useEffect(() => {
    if (route) {
      setSnap(SNAP_POINTS[0]);
    }
  }, [route?.route_id]);

  const [filteredRoutes, setFilteredRoutes] = useState(routes); // initial list
  const [searchMode, setSearchMode] = useState<"routes" | "stops">("routes");

  // ----- Route search -----
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

  // ----- Stop search -----
  const allStops = useStopSearch(provider);
  const [filteredStops, setFilteredStops] = useState<typeof allStops>([]);
  const [totalStopMatches, setTotalStopMatches] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = search.trim().toLowerCase();
      if (!term) {
        setFilteredStops([]);
        setTotalStopMatches(0);
        return;
      }
      const matches = allStops.filter((s) =>
        s.stop_name.toLowerCase().includes(term),
      );
      setTotalStopMatches(matches.length);
      setFilteredStops(matches.slice(0, 30));
    }, 200);
    return () => clearTimeout(handler);
  }, [search, allStops]);

  const handleModeChange = (mode: "routes" | "stops") => {
    setSearchMode(mode);
    setSearch("");
  };

  return (
    <Drawer.Root
      repositionInputs={false}
      open
      dismissible={false}
      scrollLockTimeout={0}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-testid="content"
          className="fixed z-1000 flex overflow-hidden px-2 pt-2 flex-col backdrop-blur-lg border border-b-0 border-x-0 dark:border-neutral-500 bg-white/50 dark:bg-white/10 rounded-t-[10px] bottom-0 left-0 right-0 h-full outline-none max-h-[97%] -mx-px"
        >
          <div className="max-w-md w-full h-full min-h-0 mx-auto rounded-t-[10px] flex flex-col">
            <Drawer.Handle />
            {route ? (
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
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
                <div className="w-full p-2 font-bold text-xl">
                  {
                    route?.directions.filter(
                      (d) => d.direction_id === direction,
                    )[0].route_long_name
                  }
                </div>
                <div className="min-h-0 flex-1 flex flex-col">
                  {route?.directions.length >= 2 && (
                    <Button
                      variant={"outline"}
                      className="bg-white w-full"
                      onClick={() =>
                        setDirection((prev) => {
                          if (route?.directions.length >= 2) {
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
                    className="mt-4 ml-2 min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain touch-pan-y scroll-hidden pb-12"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onTouchStart={handleListTouchStart}
                    onTouchMove={handleListTouchMove}
                    onTouchEnd={resetListTouch}
                    onTouchCancel={resetListTouch}
                  >
                    {route?.directions
                      .filter((d) => d.direction_id === direction)[0]
                      .stops.map((stop, idx) => (
                        <div
                          key={stop.stop_id}
                          className={`${
                            idx === 0 && "mt-2"
                          } flex relative w-full`}
                        >
                            {/* Bullet */}

                            <div
                              className={`flex flex-col items-center w-4 mr-2`}
                            >
                              <div
                                className={`w-3 h-3 absolute rounded-full ${
                                  provider === "rkl" &&
                                  route?.directions[0].route_long_name ===
                                    route?.route_short_name
                                    ? "bg-[#28ab78]"
                                    : provider !== "rkl" && provider !== "rp"
                                      ? "bg-pink-500"
                                      : "bg-[#78BFF5]"
                                } z-10`}
                              ></div>
                              {/* Vertical line */}
                              {idx <
                                route?.directions.filter(
                                  (d) => d.direction_id === direction,
                                )[0].stops.length -
                                  1 && (
                                <div
                                  className={` h-full w-1 ${provider === "rkl" && route?.directions[0].route_long_name === route?.route_short_name ? "bg-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-500" : "bg-[#87CEFA]"}`}
                                ></div>
                              )}
                            </div>

                            {/* Stop Name */}
                            <div className="w-full -mt-2 pb-2">
                              <Button
                                variant={"ghost"}
                                onClick={() => {
                                  const marker =
                                    markerRefs.current[stop.stop_id];
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
                              {idx === 0 &&
                                BusSchedule &&
                                BusSchedule.find(
                                  (s) =>
                                    s.r === route.route_id &&
                                    s.d === direction &&
                                    s.dt === getCurrentDate(),
                                )?.t && (
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
                                            key={time + idx}
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
                    className={`flex flex-row gap-1 items-center pt-2 px-4 `}
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
                <div className="min-h-0 flex-1 pt-1 text-black flex flex-col">
                  <div className="px-4">
                    {/* Mode toggle */}
                    <div className="flex gap-2 mb-3 dark:text-white">
                      <Button
                        variant={searchMode === "routes" ? "outline" : "ghost"}
                        size="sm"
                        className="flex-1 gap-1 border-0 cursor-pointer"
                        onClick={() => handleModeChange("routes")}
                      >
                        Routes
                      </Button>
                      <Button
                        variant={searchMode === "stops" ? "outline" : "ghost"}
                        size="sm"
                        className="flex-1 gap-1 border-0 cursor-pointer"
                        onClick={() => handleModeChange("stops")}
                      >
                        Stops
                      </Button>
                    </div>
                    <div className="relative mb-3 h-12">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        onFocus={() => {
                          if (snap === SNAP_POINTS[0]) setSnap(SNAP_POINTS[1]);
                        }}
                        className="h-full w-full pl-10 pr-10 py-2 dark:text-white text-lg! bg-neutral-50 dark:bg-neutral-900!"
                        placeholder={
                          searchMode === "routes"
                            ? "Search Routes"
                            : "Search Stops"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search.length !== 0 && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setSearch("")}
                          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-gray-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain touch-pan-y scroll-hidden pb-12"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onTouchStart={handleListTouchStart}
                    onTouchMove={handleListTouchMove}
                    onTouchEnd={resetListTouch}
                    onTouchCancel={resetListTouch}
                  >
                    <div className="px-4">
                      {searchMode === "routes" &&
                        filteredRoutes.length === routes.length && (
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
                                    to={`/routes/${encodeURIComponent(route?.route_id ?? "")}`}
                                    preventScrollReset
                                    onClick={() => setSnap(SNAP_POINTS[0])}
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
                    <div className={`p-4 pt-3`}>
                      {searchMode === "routes" ? (
                        filteredRoutes.map((r, idx) => (
                          <RouteCard
                            provider={provider}
                            key={r.route_id}
                            setSnap={setSnap}
                            line={r}
                            length={filteredRoutes.length}
                            index={idx}
                          />
                        ))
                      ) : search.trim().length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Search by stop name
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                            Type a name to find stops and their bus routes
                          </p>
                        </div>
                      ) : filteredStops.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            No stops found
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                            Check for typos or try searching a different stop
                            name
                          </p>
                        </div>
                      ) : (
                        <>
                          {filteredStops.map((stop, idx) => (
                            <StopCard
                              key={stop.stop_id}
                              stop={stop}
                              index={idx}
                              length={filteredStops.length}
                              setSnap={setSnap}
                              provider={provider}
                            />
                          ))}
                          {totalStopMatches > filteredStops.length && (
                            <p className="py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                              Showing first {filteredStops.length} of{" "}
                              {totalStopMatches} stops. Type more to narrow
                              down.
                            </p>
                          )}
                        </>
                      )}
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
