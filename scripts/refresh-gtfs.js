import fs from "fs";
import unzipper from "unzipper";
import csv from "csv-parser";

const GTFS_RP_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-penang";
const GTFS_RKL_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl";

const OUTPUT_FILES = {
  rp: {
    trips: "data/rapid-penang-trips.json",
    schedule: "data/rapid-penang-schedule.json",
  },
  rkl: {
    trips: "data/rapid-kl-trips.json",
    schedule: "data/rapid-kl-schedule.json",
  },
};

// Convert HH:MM:SS to seconds
function parseTimeToSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// Expand service to actual dates (limit to next 7 days)
function expandCalendar(service, maxDays = 7) {
  const dates = [];
  const today = new Date();
  const endDate = new Date(
    +service.end_date.slice(0, 4),
    +service.end_date.slice(4, 6) - 1,
    +service.end_date.slice(6, 8),
  );

  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  let count = 0;
  for (
    let d = new Date(today);
    d <= endDate && count < maxDays;
    d.setDate(d.getDate() + 1)
  ) {
    if (service[weekdays[d.getDay()]] === "1") {
      dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
      count++;
    }
  }
  return dates;
}

// Generate all departures from a frequency entry
function generateDeparturesFromFrequency(freq) {
  const departures = [];
  let [h, m, s] = freq.start_time.split(":").map(Number);
  let currentSeconds = h * 3600 + m * 60 + s;
  const [endH, endM, endS] = freq.end_time.split(":").map(Number);
  const endSeconds = endH * 3600 + endM * 60 + endS;

  while (currentSeconds <= endSeconds) {
    const hh = String(Math.floor(currentSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((currentSeconds % 3600) / 60)).padStart(
      2,
      "0",
    );
    const ss = String(currentSeconds % 60).padStart(2, "0");
    departures.push(`${hh}:${mm}:${ss}`);
    currentSeconds += +freq.headway_secs;
  }
  return departures;
}

async function refreshGTFS(url, tripsFilePath, scheduleFilePath, maxDays = 7) {
  console.log(`Downloading GTFS feed from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download GTFS");

  const buffer = await res.arrayBuffer();
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));

  const tripsFile = directory.files.find((f) => f.path === "trips.txt");
  const stopsFile = directory.files.find((f) => f.path === "stop_times.txt");
  const calendarFile = directory.files.find((f) => f.path === "calendar.txt");
  const frequenciesFile = directory.files.find(
    (f) => f.path === "frequencies.txt",
  );

  if (!tripsFile || !stopsFile || !calendarFile)
    throw new Error("Missing GTFS files");

  // Load calendar
  const services = {};
  await new Promise((resolve, reject) => {
    calendarFile
      .stream()
      .pipe(csv())
      .on("data", (row) => (services[row.service_id] = row))
      .on("end", resolve)
      .on("error", reject);
  });

  // Load trips
  const trips = [];
  const tripsMap = new Map();
  await new Promise((resolve, reject) => {
    tripsFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        const trip = {
          trip_id: row.trip_id,
          route_id: row.route_id,
          service_id: row.service_id,
          direction_id: +row.direction_id,
        };
        trips.push(trip);
        tripsMap.set(row.trip_id, trip);
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Load frequencies (optional)
  const frequencies = {};
  if (frequenciesFile) {
    await new Promise((resolve, reject) => {
      frequenciesFile
        .stream()
        .pipe(csv())
        .on("data", (row) => {
          frequencies[row.trip_id] = row; // one row per trip_id
        })
        .on("end", resolve)
        .on("error", reject);
    });
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(tripsFilePath, JSON.stringify(trips, null, 2));
  console.log(`✅ Saved trips to ${tripsFilePath}`);

  // Process stop_times (first stop only)
  const departures = {};
  await new Promise((resolve, reject) => {
    stopsFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        if (row.stop_sequence !== "1") return;
        const trip = tripsMap.get(row.trip_id);
        if (!trip) return;

        const key = `${trip.route_id}_${trip.direction_id}_${trip.service_id}`;
        if (!departures[key]) departures[key] = [];

        // Generate departure times using frequencies if available
        let times = [row.departure_time];
        if (frequencies[trip.trip_id]) {
          times = generateDeparturesFromFrequency(frequencies[trip.trip_id]);
        }

        for (const t of times) {
          departures[key].push({ time: t, trip_id: trip.trip_id });
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Flatten schedule (Penang-style)
  const flattened = [];
  for (const [key, timesArr] of Object.entries(departures)) {
    const [route_id, direction_id, service_id] = key.split("_");

    timesArr.sort(
      (a, b) => parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time),
    );

    const dates = expandCalendar(services[service_id], maxDays);

    for (const dt of dates) {
      flattened.push({
        r: route_id,
        d: +direction_id,
        dt,
        t: timesArr.map((x) => x.time),
        trip_ids: timesArr.map((x) => x.trip_id),
      });
    }
  }

  fs.writeFileSync(scheduleFilePath, JSON.stringify(flattened, null, 2));
  console.log(`✅ Saved schedule to ${scheduleFilePath}`);
}

// Rapid Penang (next 7 days)
refreshGTFS(
  GTFS_RP_URL,
  OUTPUT_FILES.rp.trips,
  OUTPUT_FILES.rp.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});

// Rapid KL (next 7 days)
refreshGTFS(
  GTFS_RKL_URL,
  OUTPUT_FILES.rkl.trips,
  OUTPUT_FILES.rkl.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
