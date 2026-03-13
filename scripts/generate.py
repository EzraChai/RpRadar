import requests
import json
import numpy as np
import math

# Your stops (lng,lat)
stops = [
    (101.07236,4.594224),
    (101.07452969,4.59593283),
    (101.07674002,4.60272255),
    (101.07706837,4.60426359),
    (101.07868731,4.61311727),
    (101.079811,4.61752269),
    (101.08059704,4.62114848),
    (101.08141279,4.6244411),
    (101.08210119,4.62771394),
    (101.08456174,4.63081352),
    (101.08621895,4.63214178),
    (101.09377742,4.64068607),
    (101.09828,4.644715),
    (101.10074043,4.64656221),
    (101.10276395,4.64886169),
    (101.105055,4.651537),
    (101.11047,4.658606),
    (101.11339605,4.66334325),
    (101.11739022,4.66990319),
    (101.12057269,4.67629507),
    (101.12086773,4.67901112),
    (101.12086773,4.6835717),
    (101.12102158,4.6868604),
    (101.12222493,4.6935589),
    (101.1227688,4.69935511),
    (101.1221589,4.70448007),
    (101.12195134,4.70745948),
    (101.12173676,4.716067),
    (101.12120613,4.71954295),
    (101.12140953,4.72261079),
    (101.12162411,4.72626878),
    (101.12145638,4.72867514),
    (101.12021298,4.73298367),
    (101.11927793,4.73673622),
    (101.11864598,4.73967689),
    (101.11716079,4.74835855),
    (101.11729141,4.75166957),
    (101.11523691,4.76421821),
    (101.11310033,4.77462065),
    (101.11038043,4.78068217),
    (101.10881458,4.78386206),
    (101.10586929,4.7904708),
    (101.10231516,4.79668799),
    (101.096938,4.806141),
    (101.089242,4.809742),
    (101.08643104,4.81104096),
    (101.08514327,4.8123873),
    (101.08152509,4.8147547),
    (101.0799903,4.81562038),
    (101.07536892,4.81784451),
    (101.07234777,4.81950546),
    (101.06896221,4.8213909),
    (101.06767765,4.82205219),
    (101.06443198,4.82389786),
    (101.057017,4.82675),
    (101.052839,4.82659755),
    (101.04506007,4.82654837),
    (101.01196328,4.83880426),
    (101.0087929,4.83941361),
    (101.00504456,4.84020626),
    (100.99648693,4.84025401),
    (100.99229876,4.84065204),
    (100.98732376,4.83999781),
    (100.9844858,4.83888089),
    (100.98365577,4.83805619),
    (100.97981973,4.83394528),
    (100.97765707,4.83125301),
    (100.97522399,4.82900602),
    (100.96846949,4.82255271),
    (100.96550626,4.83639126),
    (100.9684695,4.82255271),
    (100.96535917,4.81745326),
    (100.96005819,4.81796917),
    (100.95760656,4.81526096),
    (100.95427854,4.81001977),
    (100.95262276,4.8084412),
    (100.95144168,4.80728312),
    (100.94947281,4.80424576),
    (100.94824971,4.80148209),
    (100.94612,4.79424),
    (100.94540834,4.79271532),
    (100.94378123,4.78866574),
    (100.94323062,4.78516539),
    (100.94365637,4.78004153),
    (100.94149634,4.77779154),
    (100.94127917,4.77496411),
    (100.939519,4.771276)
]
# ---------------------------
# 2. Distance (meters)
# ---------------------------
def distance_m(lon1, lat1, lon2, lat2):
    return math.hypot((lat2 - lat1) * 111000, (lon2 - lon1) * 111000)

# ---------------------------
# 3. Snap stops to road (fuzzy if < tolerance)
# ---------------------------
def snap_to_road(stops, tolerance=20, max_segment=50):
    snapped = [stops[0]]
    i = 0
    while i < len(stops) - 1:
        start = snapped[-1]
        segment = [start]
        j = i + 1
        while j < len(stops) and len(segment) < max_segment:
            dist = distance_m(start[0], start[1], stops[j][0], stops[j][1])
            if dist > tolerance:
                segment.append(stops[j])
            j += 1
        if len(segment) > 1:
            coords_str = ";".join(f"{lng},{lat}" for lng, lat in segment)
            url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
            r = requests.get(url)
            if r.status_code != 200:
                raise Exception(f"OSRM error: {r.text}")
            data = r.json()
            if "routes" in data and len(data["routes"]) > 0:
                for lng, lat in data["routes"][0]["geometry"]["coordinates"]:
                    snapped.append([round(lng, 6), round(lat, 6)])
            else:
                snapped.append([round(segment[-1][0],6), round(segment[-1][1],6)])
        else:
            snapped.append([round(stops[j-1][0],6), round(stops[j-1][1],6)])
        i = j - 1
    return snapped

road_coords = snap_to_road(stops, tolerance=20)

# ---------------------------
# 4. Resample evenly
# ---------------------------
def resample_line(coords, target_points=800):
    dists = [0]
    for i in range(1, len(coords)):
        lon1, lat1 = coords[i-1]
        lon2, lat2 = coords[i]
        d = math.hypot((lat2 - lat1) * 111000, (lon2 - lon1) * 111000)
        dists.append(dists[-1] + d)
    total = dists[-1]
    spaced = np.linspace(0, total, target_points)
    resampled = []
    j = 0
    for s in spaced:
        while j < len(dists) - 1 and dists[j] < s:
            j += 1
        if j == 0:
            resampled.append(coords[0])
        else:
            frac = (s - dists[j-1]) / (dists[j] - dists[j-1])
            lon1, lat1 = coords[j-1]
            lon2, lat2 = coords[j]
            resampled.append([
                round(lon1 + frac*(lon2 - lon1), 6),
                round(lat1 + frac*(lat2 - lat1), 6)
            ])
    return resampled

resampled_coords = resample_line(road_coords, 1800)

# ---------------------------
# 5. Save GeoJSON
# ---------------------------
geojson = {
    "type": "Feature",
    "properties": {"direction": "outbound"},
    "geometry": {"type": "LineString", "coordinates": resampled_coords}
}

with open("a31a_outbound_road_fuzzy_6dp.geojson", "w") as f:
    json.dump(geojson, f, indent=2)

print("Saved outbound route with 6 decimal coordinates!")