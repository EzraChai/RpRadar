import csv
import json
from collections import defaultdict

input_file = "shapes.txt"
output_file = "shapes.json"

# Store: { shape_id: [(sequence, lon, lat), ...] }
shapes = defaultdict(list)

# Read shapes.csv
with open(input_file, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        shape_id = row["shape_id"]
        lat = float(row["shape_pt_lat"])
        lon = float(row["shape_pt_lon"])
        seq = int(row["shape_pt_sequence"])
        shapes[shape_id].append((seq, lon, lat))

# Build GeoJSON FeatureCollection
features = []

for shape_id, points in shapes.items():
    # Sort by sequence
    points.sort(key=lambda x: x[0])

    # Convert to [lon, lat]
    coordinates = [[lon, lat] for (_, lon, lat) in points]

    # Create one LineString per shape_id
    feature = {
        "type": "Feature",
        "properties": {"shape_id": shape_id},
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        }
    }

    features.append(feature)

# Entire output is one big file
geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Write to file
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(geojson, f, indent=2)

print("✔ Created one big GeoJSON file:", output_file)