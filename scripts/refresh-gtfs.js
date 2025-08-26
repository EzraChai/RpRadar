import fs from "fs";
import unzipper from "unzipper";
import csv from "csv-parser";

const GTFS_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-penang";
const OUTPUT_FILE = "data/trips.json";
const OUTPUT_FILE_2 = "data/schedule.json";

// helper: parse HH:MM:SS into seconds
function parseTimeToSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// expand a service_id from calendar.txt into YYYYMMDD dates
function expandCalendar(service) {
  const dates = new Set();

  const start = new Date(
    service.start_date.slice(0, 4),
    service.start_date.slice(4, 6) - 1,
    service.start_date.slice(6, 8)
  );
  const end = new Date(
    service.end_date.slice(0, 4),
    service.end_date.slice(4, 6) - 1,
    service.end_date.slice(6, 8)
  );

  const weekdayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = weekdayMap[d.getDay()];
    if (service[dayName] === "1") {
      const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
      dates.add(dateStr);
    }
  }

  return [...dates];
}

async function refreshGTFS() {
  console.log("Downloading GTFS feed...");
  const res = await fetch(GTFS_URL);
  if (!res.ok) throw new Error("Failed to download GTFS");

  const buffer = await res.arrayBuffer();
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));

  const tripsFile = directory.files.find((f) => f.path === "trips.txt");
  const stopsFile = directory.files.find((f) => f.path === "stop_times.txt");
  const calendarFile = directory.files.find((f) => f.path === "calendar.txt");

  if (!tripsFile || !stopsFile || !calendarFile) {
    throw new Error(
      "Missing GTFS files (trips, stop_times, calendar required)"
    );
  }

  // 1. Load calendar.txt
  const services = {};
  await new Promise((resolve, reject) => {
    calendarFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        services[row.service_id] = row;
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // 2. Expand service_id → actual dates
  const serviceDates = {};
  for (const serviceId of Object.keys(services)) {
    serviceDates[serviceId] = expandCalendar(services[serviceId]);
  }

  // 3. Load trips.txt
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
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trips, null, 2));
  console.log(`Saved ${trips.length} trips to ${OUTPUT_FILE}`);

  // 4. Process stop_times (first stop only)
  const departures = {};
  await new Promise((resolve, reject) => {
    stopsFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        if (row.stop_sequence === "1") {
          const trip = trips.find((t) => t.trip_id === row.trip_id);
          if (!trip) return;

          const { route_id, direction_id, service_id } = trip;
          const dates = serviceDates[service_id];
          if (!dates) return;

          const key = `${route_id}_${direction_id}`;
          if (!departures[key]) {
            departures[key] = {
              route_id,
              direction_id: Number(direction_id),
              dates: {},
            };
          }

          for (const date of dates) {
            if (!departures[key].dates[date]) departures[key].dates[date] = [];
            departures[key].dates[date].push(row.departure_time);
          }
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // 5. Convert to final structure
  const result = Object.values(
    Object.values(departures).reduce(
      (acc, { route_id, direction_id, dates }) => {
        if (!acc[route_id]) acc[route_id] = { route_id, directions: [] };

        const dateObjects = Object.entries(dates).map(([date, times]) => ({
          date,
          times: times.sort(
            (a, b) => parseTimeToSeconds(a) - parseTimeToSeconds(b)
          ),
        }));

        acc[route_id].directions.push({
          direction_id,
          dates: dateObjects,
        });
        return acc;
      },
      {}
    )
  );

  fs.writeFileSync(OUTPUT_FILE_2, JSON.stringify(result, null, 2));
  console.log(`✅ Saved route departures with dates to ${OUTPUT_FILE_2}`);
}

refreshGTFS().catch((err) => {
  console.error(err);
  process.exit(1);
});
