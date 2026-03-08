import csv
import json

# File paths
ROUTES_FILE = "routes.txt"
TRIPS_FILE = "trips.txt"
OUTPUT_FILE = "routes_with_shapes.json"

# Step 1: Load routes.txt
routes = {}
with open(ROUTES_FILE, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        routes[row["route_id"]] = {
            "route_id": row["route_id"],
            "route_code": row["route_short_name"] if row["route_short_name"] else row["route_long_name"],
            "route_name": row["route_long_name"] if row["route_long_name"] else None,
            "shape_ids": set()
        }

# Step 2: Process trips.txt
with open(TRIPS_FILE, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        route_id = row["route_id"]
        if route_id not in routes:
            continue

        routes[route_id]["shape_ids"].add(row["shape_id"])

        if routes[route_id]["route_name"] is None:
            routes[route_id]["route_name"] = row["trip_headsign"]

# Step 3: Convert to list
output = [
    {
        "route_id": r["route_id"],
        "route_code": r["route_code"],
        "route_name": r["route_name"],
        "shape_ids": sorted(r["shape_ids"])
    }
    for r in routes.values()
]

# Step 4: Sort by route_code
output.sort(key=lambda x: x["route_code"])

# Step 5: Write JSON file
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ routes sorted by route_code and written to {OUTPUT_FILE}")
