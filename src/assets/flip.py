import json

def flip_linestring_conditional(geojson):
    for feature in geojson.get("features", []):
        geom = feature.get("geometry", {})
        if geom.get("type") == "LineString":
            coords = geom.get("coordinates", [])
            new_coords = []
            for coord in coords:
                if len(coord) >= 2 and coord[0] > coord[1]:
                    # Swap only if first > second
                    new_coords.append([coord[1], coord[0]])
                else:
                    new_coords.append(coord)
            geom["coordinates"] = new_coords
    return geojson


# === Usage ===
input_file = "shapes.json"
output_file = "shapes_flipped.json"

with open(input_file, "r") as f:
    data = json.load(f)

flipped = flip_linestring_conditional(data)

with open(output_file, "w") as f:
    json.dump(flipped, f, indent=2)

print(f"✅ Conditional flipped LineString saved to {output_file}")