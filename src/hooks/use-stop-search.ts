import { useMemo } from "react";

import RapidPenangDirections from "@/assets/rp/rp_routes_with_directions.json";
import RapidKLDirections from "@/assets/rkl/rkl_routes_with_directions.json";
import MRTFeederDirections from "@/assets/mrt/mrt_routes_with_directions.json";
import MyBasNSADirections from "@/assets/ns_a/ns_a_routes_with_directions.json";
import MyBasNSBDirections from "@/assets/ns_b/ns_b_routes_with_directions.json";
import MyBasMkDirections from "@/assets/mk/mk_routes_with_directions.json";
import MyBasJbDirections from "@/assets/jb/jb_routes_with_directions.json";
import MyBasPkDirections from "@/assets/pk/pk_routes_with_directions.json";
import MyBasKtnDirections from "@/assets/ktn/ktn_routes_with_directions.json";
import MyBasAlrDirections from "@/assets/alr/alr_routes_with_directions.json";
import MyBasKgrDirections from "@/assets/kgr/kgr_routes_with_directions.json";
import MyBasKtbDirections from "@/assets/ktb/ktb_routes_with_directions.json";
import MyBasTrgDirections from "@/assets/trg/trg_routes_with_directions.json";
import MyBasSwDirections from "@/assets/sw/sw_routes_with_directions.json";

export interface StopResult {
  stop_id: string;
  stop_name: string;
  routes: {
    route_id: string;
    route_code: string;
    route_name: string;
  }[];
}

type DirectionEntry = {
  route_id: string;
  route_short_name: string;
  directions: {
    direction_id: number;
    route_long_name: string;
    shape_id: string;
    stops: {
      stop_id: string;
      stop_name: string;
      lat: number;
      lon: number;
    }[];
  }[];
};

function getDirections(provider: string): DirectionEntry[] {
  if (provider === "rkl") {
    return [...RapidKLDirections, ...MRTFeederDirections] as unknown as DirectionEntry[];
  } else if (provider === "ns") {
    return [...MyBasNSADirections, ...MyBasNSBDirections] as unknown as DirectionEntry[];
  } else if (provider === "mk") {
    return MyBasMkDirections as unknown as DirectionEntry[];
  } else if (provider === "jb") {
    return MyBasJbDirections as unknown as DirectionEntry[];
  } else if (provider === "pk") {
    return MyBasPkDirections as unknown as DirectionEntry[];
  } else if (provider === "ktn") {
    return MyBasKtnDirections as unknown as DirectionEntry[];
  } else if (provider === "alr") {
    return MyBasAlrDirections as unknown as DirectionEntry[];
  } else if (provider === "kgr") {
    return MyBasKgrDirections as unknown as DirectionEntry[];
  } else if (provider === "ktb") {
    return MyBasKtbDirections as unknown as DirectionEntry[];
  } else if (provider === "trg") {
    return MyBasTrgDirections as unknown as DirectionEntry[];
  } else if (provider === "sw") {
    return MyBasSwDirections as unknown as DirectionEntry[];
  }
  return RapidPenangDirections as unknown as DirectionEntry[];
}

/**
 * Builds a deduplicated stop → routes lookup for the given provider.
 * Returns a flat array of StopResult sorted alphabetically by stop_name.
 */
export function useStopSearch(provider: string): StopResult[] {
  return useMemo(() => {
    const directions = getDirections(provider);

    // stop_id → StopResult
    const stopMap = new Map<string, StopResult>();

    for (const route of directions) {
      const routeInfo = {
        route_id: route.route_id,
        route_code: route.route_short_name,
        route_name: route.directions[0]?.route_long_name ?? route.route_short_name,
      };

      // Collect unique stops across all directions
      const seenStopsForRoute = new Set<string>();

      for (const dir of route.directions) {
        for (const stop of dir.stops) {
          if (!stopMap.has(stop.stop_id)) {
            stopMap.set(stop.stop_id, {
              stop_id: stop.stop_id,
              stop_name: stop.stop_name,
              routes: [],
            });
          }

          // Add this route to the stop only once per route
          if (!seenStopsForRoute.has(stop.stop_id)) {
            seenStopsForRoute.add(stop.stop_id);
            stopMap.get(stop.stop_id)!.routes.push(routeInfo);
          }
        }
      }
    }

    return Array.from(stopMap.values()).sort((a, b) =>
      a.stop_name.localeCompare(b.stop_name),
    );
  }, [provider]);
}
