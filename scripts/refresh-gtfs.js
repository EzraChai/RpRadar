import fs from "fs";
import fetch from "node-fetch";
import unzipper from "unzipper";
import csv from "csv-parser";

const GTFS_URL =
  "GET https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-penang"; // replace with your feed
const OUTPUT_FILE = "data/trips.json";

async function refreshGTFS() {
  console.log("Downloading GTFS feed...");
  const res = await fetch(GTFS_URL);
  if (!res.ok) throw new Error("Failed to download GTFS");

  const buffer = await res.arrayBuffer();
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));

  const tripsFile = directory.files.find((f) => f.path === "trips.txt");
  if (!tripsFile) throw new Error("trips.txt not found in GTFS");

  const trips = [];
  await new Promise((resolve, reject) => {
    tripsFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        trips.push({
          trip_id: row.trip_id,
          route_id: row.route_id,
          service_id: row.service_id,
          direction_id: row.direction_id,
          shape_id: row.shape_id,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trips, null, 2));

  console.log(`Saved ${trips.length} trips to ${OUTPUT_FILE}`);
}

refreshGTFS().catch((err) => {
  console.error(err);
  process.exit(1);
});
