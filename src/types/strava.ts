export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  calories?: number;
  suffer_score?: number;
  map?: {
    id: string;
    summary_polyline: string;
    polyline: string;
  };
  splits_metric?: StravaSplit[];
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_heartrate?: number;
  pace_zone: number;
}

export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

export type StravaActivityType =
  | "Run" | "Ride" | "Swim" | "Walk" | "Hike"
  | "WeightTraining" | "Workout" | "Yoga"
  | "Soccer" | "CrossFit" | "Elliptical"
  | "StairStepper" | "Rowing" | "Golf";

export function mapStravaTypeToActivityType(
  stravaType: string
): string {
  const mapping: Record<string, string> = {
    Run: "run",
    Ride: "ride",
    Swim: "swim",
    Walk: "walk",
    Hike: "hike",
    WeightTraining: "weight_training",
    Workout: "cross_train",
    Yoga: "yoga",
    Soccer: "football",
    CrossFit: "cross_train",
    Elliptical: "cross_train",
    StairStepper: "cross_train",
    Rowing: "cross_train",
  };
  return mapping[stravaType] || "other";
}
