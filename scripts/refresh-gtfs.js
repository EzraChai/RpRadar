import fs from "fs";
import unzipper from "unzipper";
import csv from "csv-parser";

const GTFS_RP_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-penang";
const GTFS_RKL_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl";
const GTFS_MRT_URL =
  "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-mrtfeeder";
const GTFS_NS_A_URL = "https://api.data.gov.my/gtfs-static/mybas-seremban-a";
const GTFS_NS_B_URL = "https://api.data.gov.my/gtfs-static/mybas-seremban-b";
const GTFS_MK_URL = "https://api.data.gov.my/gtfs-static/mybas-melaka";

const OUTPUT_FILES = {
  rp: {
    trips: "data/rapid-penang-trips.json",
    schedule: "data/rapid-penang-schedule.json",
  },
  rkl: {
    trips: "data/rapid-kl-trips.json",
    schedule: "data/rapid-kl-schedule.json",
  },
  mrt: {
    trips: "data/mrt-feeder-trips.json",
    schedule: "data/mrt-feeder-schedule.json",
  },
  ns_a: {
    trips: "data/ns-a-trips.json",
    schedule: "data/ns-a-schedule.json",
  },
  ns_b: {
    trips: "data/ns-b-trips.json",
    schedule: "data/ns-b-schedule.json",
  },
  mk: {
    trips: "data/mk-trips.json",
    schedule: "data/mk-schedule.json",
  },
};

// Convert HH:MM:SS to seconds
function parseTimeToSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function expandCalendar(service, maxDays = 7) {
  const dates = [];
  if (!service) return dates;

  const today = new Date();

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

  for (let i = 0; i < 30 && count < maxDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

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

async function refreshGTFS(url, tripsFilePath, scheduleFilePath) {
  console.log(`Downloading ${url}`);

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  const directory = await unzipper.Open.buffer(Buffer.from(buffer));

  const tripsFile = directory.files.find((f) => f.path === "trips.txt");
  const stopTimesFile = directory.files.find(
    (f) => f.path === "stop_times.txt",
  );
  const calendarFile = directory.files.find((f) => f.path === "calendar.txt");
  const frequenciesFile = directory.files.find(
    (f) => f.path === "frequencies.txt",
  );

  if (!tripsFile || !stopTimesFile || !calendarFile) {
    throw new Error("Missing GTFS files");
  }

  const services = {};
  const trips = [];
  const tripsMap = new Map();

  const frequencies = {};

  const firstStops = {};

  const departures = {};

  // calendar
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

  // trips
  await new Promise((resolve, reject) => {
    tripsFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        const trip = {
          trip_id: row.trip_id,
          route_id: row.route_id,
          service_id: row.service_id,
          direction_id:
            url === "https://api.data.gov.my/gtfs-static/mybas-melaka"
              ? Number(row.direction_id || 0) === 1
                ? 0
                : 1
              : Number(row.direction_id || 0),
        };

        trips.push(trip);
        tripsMap.set(row.trip_id, trip);
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // frequencies (optional)
  if (frequenciesFile) {
    await new Promise((resolve, reject) => {
      frequenciesFile
        .stream()
        .pipe(csv())
        .on("data", (row) => {
          frequencies[row.trip_id] = row;
        })
        .on("end", resolve)
        .on("error", reject);
    });
  }

  // find first stop of each trip (lowest stop_sequence)
  await new Promise((resolve, reject) => {
    stopTimesFile
      .stream()
      .pipe(csv())
      .on("data", (row) => {
        const seq = Number(row.stop_sequence);

        if (!firstStops[row.trip_id] || seq < firstStops[row.trip_id].seq) {
          firstStops[row.trip_id] = {
            seq,
            departure_time: row.departure_time,
          };
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // build departures
  for (const [trip_id, stop] of Object.entries(firstStops)) {
    const trip = tripsMap.get(trip_id);
    if (!trip) continue;

    const key = `${trip.route_id}_${trip.direction_id}_${trip.service_id}`;

    if (!departures[key]) departures[key] = [];

    let times = [stop.departure_time];

    if (frequencies[trip_id]) {
      times = generateDeparturesFromFrequency(frequencies[trip_id]);
    }

    for (const t of times) {
      departures[key].push({
        time: t,
        trip_id,
      });
    }
  }

  const flattened = [];

  for (const [key, timesArr] of Object.entries(departures)) {
    const [route_id, direction_id, service_id] = key.split("_");

    timesArr.sort(
      (a, b) => parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time),
    );

    const dates = expandCalendar(services[service_id], 7);

    for (const dt of dates) {
      flattened.push({
        r: route_id,
        d: Number(direction_id),
        dt,
        t: timesArr.map((x) => x.time),
        trip_ids: timesArr.map((x) => x.trip_id),
      });
    }
  }

  fs.mkdirSync("data", { recursive: true });

  fs.writeFileSync(tripsFilePath, JSON.stringify(trips));

  fs.writeFileSync(scheduleFilePath, JSON.stringify(flattened));

  console.log(`Saved ${scheduleFilePath}`);
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

refreshGTFS(
  GTFS_MRT_URL,
  OUTPUT_FILES.mrt.trips,
  OUTPUT_FILES.mrt.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});

refreshGTFS(
  GTFS_NS_A_URL,
  OUTPUT_FILES.ns_a.trips,
  OUTPUT_FILES.ns_a.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});

refreshGTFS(
  GTFS_NS_B_URL,
  OUTPUT_FILES.ns_b.trips,
  OUTPUT_FILES.ns_b.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});

refreshGTFS(
  GTFS_MK_URL,
  OUTPUT_FILES.mk.trips,
  OUTPUT_FILES.mk.schedule,
  7,
).catch((err) => {
  console.error(err);
  process.exit(1);
});
