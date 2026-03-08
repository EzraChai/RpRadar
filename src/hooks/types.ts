export type BusScheduleType = CompressedRoute[];

export interface CompressedRoute {
  r: string; // route_id
  d: number; // direction_id
  dt: string; // date (YYYYMMDD)
  t: string[]; // array of times (HH:mm:ss)
  trip_ids: string[]; // array of trip IDs
}

export interface RouteType {
  route_id: string;
  route_code: string;
  route_name: string;
  shape_id: string[];
}

export interface RouteSchedule {
  r: string;
  dt: Direction[];
}

export interface Direction {
  direction_id: number;
  dates: ServiceDate[];
}

export interface ServiceDate {
  date: string; // YYYYMMDD
  times: TripTime[];
}

export interface TripTime {
  time: string; // HH:mm:ss
  trip_id: string;
}
