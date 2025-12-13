import csv
import json

input_file = "routes.txt"
output_file = "routes.json"

data = []

with open(input_file, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        data.append(row)

with open(output_file, mode="w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)

print("CSV converted to JSON successfully!")