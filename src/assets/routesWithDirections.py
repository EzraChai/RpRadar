import csv
import json
from collections import defaultdict

# ---------- LOAD CSV ----------
def load_csv(filename):
    with open(filename, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

routes = load_csv("routes.txt")
trips = load_csv("trips.txt")
stop_times = load_csv("stop_times.txt")
stops = load_csv("stops.txt")

# ---------- INDEXES ----------
routes_by_id = {r["route_id"]: r for r in routes}
trips_by_id = {t["trip_id"]: t for t in trips}
stops_by_id = {s["stop_id"]: s for s in stops}

# stop_times indexed by trip_id (FAST lookup)
stop_times_by_trip = defaultdict(list)
for st in stop_times:
    stop_times_by_trip[st["trip_id"]].append(st)

# sort each trip by stop_sequence
for trip_id in stop_times_by_trip:
    stop_times_by_trip[trip_id].sort(key=lambda x: int(x["stop_sequence"]))

# ---------- GROUP TRIPS ----------
grouped = defaultdict(list)

for trip in trips:
    key = (
        trip["route_id"],
        trip["direction_id"],
        trip["shape_id"]
    )
    grouped[key].append(trip)

# ---------- BUILD OUTPUT ----------
output = []

routes_index = {}

for (route_id, direction_id, shape_id), trip_list in grouped.items():

    trip = trip_list[0]
    trip_id = trip["trip_id"]
    service_ids = list({t["service_id"] for t in trip_list})

    trip_stops = stop_times_by_trip[trip_id]

    stops_list = []
    for st in trip_stops:
        stop = stops_by_id.get(st["stop_id"])
        if not stop:
            continue

        stops_list.append({
            "stop_id": stop["stop_id"],
            "stop_name": stop["stop_name"],
            "lat": float(stop["stop_lat"]),
            "lon": float(stop["stop_lon"])
        })

    route_info = routes_by_id[route_id]

    if route_id not in routes_index:
        route_entry = {
            "route_id": route_id,
            "route_short_name": route_id,
            "route_long_name": route_info.get("route_long_name"),
            "directions": []
        }

        routes_index[route_id] = route_entry
        output.append(route_entry)

    if(direction_id == "1"):
        direction_entry = {
            "direction_id": 1,
            "route_long_name": routes_index[route_id]["route_long_name"],
            "shape_id": shape_id,
            "service_ids": service_ids,
            "stops": stops_list
        }

        routes_index[route_id]["directions"].append(direction_entry)
    else:
        direction_entry = {
            "direction_id": 0,
            "route_long_name": routes_index[route_id]["route_long_name"],
            "shape_id": shape_id,
            "service_ids": service_ids,
            "stops": stops_list
        }

        routes_index[route_id]["directions"].append(direction_entry)


# ---------- SAVE JSON ----------
with open("routes_with_directions.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("Done. routes_with_directions.json generated.")