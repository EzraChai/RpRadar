import json

def flip_linestring(geojson):
    for feature in geojson.get("features", []):
        geom = feature.get("geometry", {})
        if geom.get("type") == "LineString":
            coords = geom.get("coordinates", [])
            # flip each [lat, lon] -> [lon, lat]
            geom["coordinates"] = [[lon, lat] for lat, lon in coords]
    return geojson


# === Usage ===
input_file = "input.json"
output_file = "output_flipped.json"

with open(input_file, "r") as f:
    data = json.load(f)

flipped = flip_linestring(data)

with open(output_file, "w") as f:
    json.dump(flipped, f, indent=2)

print(f"✅ Flipped LineString saved to {output_file}")