import type {
  nextBusTime,
  getCurrentDate,
  hasCurrentTimePassed,
} from "@/lib/utils";
import type {
  CollapsibleTrigger,
  CollapsibleContent,
} from "@radix-ui/react-collapsible";
import { Star, X } from "lucide-react";
import type { Collapsible } from "radix-ui";
import { useMap } from "react-leaflet";
import type { Link } from "react-router";
import type { Button } from "./ui/button";
import type { Card, CardTitle } from "./ui/card";

const StopsCard = () => {
  const map = useMap();
  if (route)
    return (
      <Card
        onMouseEnter={() => {
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.dragging.disable();
        }}
        onMouseLeave={() => {
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.dragging.enable();
        }}
        className="absolute z-1000 py-0 overflow-hidden gap-0 w-1/5 scroll-smooth bottom-8 backdrop-blur-lg border-white dark:border-neutral-500 bg-white/50 dark:bg-white/10 right-4  shadow-md h-1/2 "
      >
        <div className="flex justify-between w-full items-center px-6 pt-6 pb-1">
          <div
            className={`px-2 h-6 font-semibold flex justify-center items-center text-sm border-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-[#e74e9f]" : "border-red-500"} rounded-lg text-black dark:text-white`}
          >
            {route?.route_short_name}
          </div>
          <div className="flex items-center gap-3">
            <Star
              fill={
                starredRoutes.starred.includes(route.route_id || "")
                  ? "oklch(79.5% 0.184 86.047)"
                  : "none"
              }
              onClick={() => starredRoutes.toggle(route.route_id || "")}
              className={`w-4 h-4 cursor-pointer ${
                starredRoutes.starred.includes(route.route_id || "") &&
                "text-yellow-500 "
              }`}
            />
            <Link to={"/"}>
              <X className="w-5 h-5 text-black dark:text-white" />
            </Link>
          </div>
        </div>

        <CardTitle className="space-y-2 px-6 pb-6">
          <div className="flex justify-between items-center gap-2">
            <h4 className="font-semibold text-balance text-xl">
              {
                route?.directions.find((d) => d.direction_id === direction)
                  ?.route_long_name
              }
            </h4>
          </div>

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
        </CardTitle>

        <div className="mt-2 ml-2 overflow-y-auto h-full overflow-x-clip ">
          {route?.directions
            .find((d) => d.direction_id === direction)
            ?.stops.map((stop, idx) => (
              <div
                key={idx}
                className={`${idx === 0 && "mt-2"} flex relative w-full `}
              >
                {/* Bullet */}
                <div className="flex w-3 flex-col items-center mr-1">
                  <div
                    className={`w-3 h-3 absolute rounded-full ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-500" : "bg-blue-600"} z-10`}
                  ></div>
                  {/* Vertical line */}
                  {idx <
                    route?.directions.filter(
                      (d) => d.direction_id === direction,
                    )[0]?.stops.length -
                      1 && (
                    <div
                      className={`h-full w-1 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-blue-500"}`}
                    ></div>
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
                    className="cursor-pointer m-2 !hover:bg-transparent  text-sm font-medium rounded-none mx-1 -mt-4 justify-start w-full text-left whitespace-normal wrap-break-words"
                  >
                    <p>{stop.stop_name.trim()}</p>
                  </Button>
                  {idx === 0 &&
                    BusSchedule &&
                    (provider === "rp" || provider === "ns") && (
                      <Collapsible className="px-6 mb-4">
                        <CollapsibleTrigger asChild>
                          <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                            Next bus will depart at{" "}
                            {nextBusTime(
                              BusSchedule.find(
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
                          <div className="grid grid-cols-6 self-center ">
                            {BusSchedule.find(
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
                  {idx === 0 &&
                    BusSchedule &&
                    provider === "rkl" &&
                    BusSchedule.length > 0 &&
                    nextBusTime(
                      BusSchedule.find(
                        (s) =>
                          s.r === route.route_id &&
                          s.d === direction &&
                          s.dt === getCurrentDate(),
                      )?.t || [],
                    ) && (
                      <Collapsible className="px-6 mb-4">
                        <CollapsibleTrigger asChild>
                          <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                            Next bus will depart at{" "}
                            {nextBusTime(
                              BusSchedule.find(
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
                          <div className="grid grid-cols-6 self-center ">
                            {BusSchedule.find(
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
      </Card>
    );
  return null;
};

export default StopsCard;
