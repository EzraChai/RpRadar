import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function findT310Heading(time: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentTimeSubtractWith35Minutes = formatter.format(
    new Date(Date.now() - 35 * 60000),
  ); // minus 35 minutes, "HH:MM"
  for (let i = 0; i < 5; i++) {
    if (currentTimeSubtractWith35Minutes[i] === time[i]) {
      continue;
    } else if (currentTimeSubtractWith35Minutes[i] > time[i]) {
      return false;
    } else {
      return true;
    }
  }
  return true;
}

export function hasCurrentTimePassed(time: string): boolean {
  const currentTime = getCurrentTime();
  for (let i = 0; i < 5; i++) {
    if (currentTime[i] === time[i]) {
      continue;
    } else if (currentTime[i] > time[i]) {
      return true;
    } else {
      return false;
    }
  }
  return false;
}

export function nextBusTime(times: string[] | undefined) {
  if (times === undefined) {
    return null;
  }
  const nextTime = times[times.findIndex((t) => !hasCurrentTimePassed(t))];
  if (nextTime) {
    return nextTime.substring(0, 5);
  } else {
    return times[0].substring(0, 5);
  }
}

export function getCurrentTime() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date());
}

export function getCurrentDateEvenAfter12() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // output like "2025-08-26"
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const [hh, mm] = timeFormatter
    .format(now)
    .split(":")
    .map((v) => parseInt(v, 10));
  const totalMinutes = hh * 60 + mm;
  const dateToFormat =
    totalMinutes > 0 && totalMinutes < 120
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : now;

  const parts = formatter.format(dateToFormat);
  return parts.replace(/-/g, ""); // → "20250826"
}

export function getCurrentDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.format(new Date());
  return parts.replace(/-/g, ""); // → "20250826"
}
