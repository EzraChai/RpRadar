import type { transit_realtime } from "gtfs-realtime-bindings";
import MYBasNSADirections from "@/../data/ns-a-trips.json";
import MYBasNSBDirections from "@/../data/ns-b-trips.json";
import MyBasMkDirections from "@/../data/mk-trips.json";
import MyBasJbDirections from "@/../data/jb-trips.json";
import MyBasPkDirections from "@/../data/pk-trips.json";
import MyBasKtnDirections from "@/../data/rapid-ktn-trips.json";
import MyBasAlrDirections from "@/../data/alr-trips.json";
import MyBasKgrDirections from "@/../data/kgr-trips.json";
import MyBasKtbDirections from "@/../data/ktb-trips.json";
import MyBasTrgDirections from "@/../data/trg-trips.json";
import MyBasSwDirections from "@/../data/sw-trips.json";

type VehiclePosition = transit_realtime.IVehiclePosition;
type Direction = 0 | 1;
type TripDirection = {
  trip_id: string;
  route_id?: string;
  direction_id?: number;
};

export type VehicleDirectionBuckets = Record<Direction, VehiclePosition[]>;

type VehicleDirectionInput = {
  vehicles: Iterable<VehiclePosition>;
  provider: string | undefined;
  routeId: string | undefined;
  routeDirectionCount: number | undefined;
};

const routeFilteredProviders = new Set(["ns", "mk", "jb", "pk", "ktn"]);

function isDirection(value: unknown): value is Direction {
  return value === 0 || value === 1;
}

type TripDirectionIndex = {
  byTripId: ReadonlyMap<string, TripDirection>;
  byRouteAndTrip: ReadonlyMap<string, TripDirection>;
};

function indexTripDirections(
  trips: readonly TripDirection[],
): TripDirectionIndex {
  const byTripId = new Map<string, TripDirection>();
  const byRouteAndTrip = new Map<string, TripDirection>();

  for (const trip of trips) {
    if (!byTripId.has(trip.trip_id)) byTripId.set(trip.trip_id, trip);

    const routeTripKey = JSON.stringify([trip.route_id, trip.trip_id]);
    if (!byRouteAndTrip.has(routeTripKey)) {
      byRouteAndTrip.set(routeTripKey, trip);
    }
  }

  return { byTripId, byRouteAndTrip };
}

const tripDirectionIndexes = new WeakMap<
  readonly TripDirection[],
  TripDirectionIndex
>();

function getTripDirectionIndex(
  trips: readonly TripDirection[],
): TripDirectionIndex {
  const existing = tripDirectionIndexes.get(trips);
  if (existing) return existing;

  const index = indexTripDirections(trips);
  tripDirectionIndexes.set(trips, index);
  return index;
}

function tripDirectionFor(
  trips: readonly TripDirection[],
  vehicle: VehiclePosition,
  routeId?: string,
  routeScoped = false,
) {
  const tripId = vehicle.trip?.tripId;
  if (tripId == null) return undefined;
  const index = getTripDirectionIndex(trips);
  if (!routeScoped) return index.byTripId.get(tripId);
  return index.byRouteAndTrip.get(JSON.stringify([routeId, tripId]));
}

/** Derives the two display lists using each provider's established direction rules. */
export function deriveVehicleDirectionBuckets({
  vehicles,
  provider,
  routeId,
  routeDirectionCount,
}: VehicleDirectionInput): VehicleDirectionBuckets {
  const buckets: VehicleDirectionBuckets = { 0: [], 1: [] };

  const add = (direction: Direction, vehicle: VehiclePosition) => {
    buckets[direction].push(vehicle);
  };

  if (provider === "rp" || provider === "rkl") {
    for (const vehicle of vehicles) {
      const direction = Number(vehicle.trip?.directionId);
      if (isDirection(direction)) add(direction, vehicle);
    }
    return buckets;
  }

  const singleDirection = routeDirectionCount === 1;

  for (const vehicle of vehicles) {
    if (
      routeFilteredProviders.has(provider ?? "") &&
      vehicle.trip?.routeId !== routeId
    ) {
      continue;
    }

    const explicitDirection = vehicle.trip?.directionId;
    if (
      provider !== "sw" &&
      provider !== "trg" &&
      isDirection(explicitDirection)
    ) {
      add(explicitDirection, vehicle);
      continue;
    }

    let tripDirection: TripDirection | undefined;
    let wasBucketed = false;
    switch (provider) {
      case "ns":
        tripDirection = tripDirectionFor(MYBasNSADirections, vehicle);
        tripDirection ??= tripDirectionFor(MYBasNSBDirections, vehicle);
        if (!tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "mk":
        tripDirection = tripDirectionFor(MyBasMkDirections, vehicle);
        if (!tripDirection && singleDirection) {
          add(1, vehicle);
          wasBucketed = true;
        }
        break;
      case "jb":
        tripDirection = tripDirectionFor(MyBasJbDirections, vehicle);
        if (!tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "pk":
        tripDirection = tripDirectionFor(MyBasPkDirections, vehicle);
        if (!tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "ktn":
        tripDirection = tripDirectionFor(MyBasKtnDirections, vehicle);
        if (!tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "alr":
        if (MyBasAlrDirections.length === 0) continue;
        tripDirection = tripDirectionFor(
          MyBasAlrDirections,
          vehicle,
          routeId,
          true,
        );
        if (tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "kgr":
        tripDirection = tripDirectionFor(
          MyBasKgrDirections,
          vehicle,
          routeId,
          true,
        );
        if (tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "ktb":
        tripDirection = tripDirectionFor(
          MyBasKtbDirections,
          vehicle,
          routeId,
          true,
        );
        if (tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "sw":
        tripDirection = tripDirectionFor(
          MyBasSwDirections,
          vehicle,
          routeId,
          true,
        );
        if (tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      case "trg":
        tripDirection = tripDirectionFor(
          MyBasTrgDirections,
          vehicle,
          routeId,
          true,
        );
        if (tripDirection && singleDirection) {
          add(0, vehicle);
          wasBucketed = true;
        }
        break;
      default:
        continue;
    }

    if (
      !wasBucketed &&
      tripDirection &&
      isDirection(tripDirection.direction_id)
    ) {
      add(tripDirection.direction_id, vehicle);
    }
  }

  return buckets;
}
