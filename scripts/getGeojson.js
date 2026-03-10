import fs from "fs";

const relationId = 16868567;

const url = `https://overpass-api.de/api/interpreter?data=[out:json];relation(${relationId});out geom;`;

const res = await fetch(url);
const data = await res.json();

// Create an array of separate segments
const segments = [];

data.elements
  .filter((e) => e.type === "relation" && e.members)
  .forEach((rel) => {
    rel.members
      .filter((m) => m.geometry)
      .forEach((m) => {
        const coords = m.geometry.map((p) => [p.lat, p.lon]); // reversed
        // remove consecutive duplicates
        const cleanCoords = coords.filter(
          (c, i, arr) =>
            i === 0 || !(c[0] === arr[i - 1][0] && c[1] === arr[i - 1][1]),
        );
        segments.push(cleanCoords);
      });
  });

// --- Flatten segments safely into one array without connecting disconnected segments ---
let flatCoords = [];

segments.forEach((seg) => {
  if (flatCoords.length > 0) {
    // Avoid connecting the last point of previous segment with first of this segment
    if (
      flatCoords[flatCoords.length - 1][0] === seg[0][0] &&
      flatCoords[flatCoords.length - 1][1] === seg[0][1]
    ) {
      flatCoords = flatCoords.concat(seg.slice(1));
    } else {
      flatCoords = flatCoords.concat(seg);
    }
  } else {
    flatCoords = flatCoords.concat(seg);
  }
});

// Save flattened coordinates as JSON
fs.writeFileSync(
  `bus_${relationId}_flat.json`,
  JSON.stringify(flatCoords, null, 2),
);
console.log("Saved flattened coordinates array!");
