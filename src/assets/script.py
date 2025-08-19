import csv
import json
from collections import defaultdict

# --- Load GTFS files ---
def load_csv(filename):
    with open(filename, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

routes = load_csv("routes.txt")
trips = load_csv("trips.txt")
stop_times = load_csv("stop_times.txt")
stops = load_csv("stops.txt")

# Index lookups
routes_by_id = {r["route_id"]: r for r in routes}
trips_by_id = {t["trip_id"]: t for t in trips}
stops_by_id = {s["stop_id"]: s for s in stops}

# Group stop_times by (route_id, direction_id)
grouped = defaultdict(list)
for st in stop_times:
    trip = trips_by_id[st["trip_id"]]
    key = (trip["route_id"], trip["direction_id"])
    grouped[key].append(st)

output = []

for (route_id, direction_id), stop_time_list in grouped.items():
    # Pick one trip_id for this direction
    trip_id = stop_time_list[0]["trip_id"]
    trip = trips_by_id[trip_id]
    shape_id = trip["shape_id"]
    headsign = trip["trip_headsign"]

    # Get stop_times for that trip, ordered by stop_sequence
    trip_stops = [st for st in stop_times if st["trip_id"] == trip_id]
    trip_stops.sort(key=lambda x: int(x["stop_sequence"]))

    # Collect stop details
    stops_list = []
    for st in trip_stops:
        stop = stops_by_id[st["stop_id"]]
        stops_list.append({
            "stop_id": st["stop_id"],
            "stop_name": stop["stop_name"],
            "lat": float(stop["stop_lat"]),
            "lon": float(stop["stop_lon"])
        })

    # Find or create the route entry
    route_info = routes_by_id[route_id]
    route_entry = next((r for r in output if r["route_id"] == route_id), None)
    if not route_entry:
        route_entry = {
            "route_id": route_id,
            "route_short_name": route_info["route_short_name"],
            "directions": []
        }
        output.append(route_entry)

    # Add this direction
    route_entry["directions"].append({
        "direction_id": int(direction_id),
        "shape_id": shape_id,
        "route_long_name": headsign,  # <-- use trip_headsign here
        "stops": stops_list
    })

# --- Save JSON ---
with open("routes_with_directions.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
