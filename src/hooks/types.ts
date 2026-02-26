export type BusScheduleType = RouteSchedule[];

export interface RouteSchedule {
  route_id: string;
  directions: Direction[];
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
