export type RaceDistance =
  | "5k"
  | "10k"
  | "half_marathon"
  | "marathon"
  | "50k"
  | "100k"
  | "100mi"
  | "ultra_other";

export type RaceTerrain = "road" | "trail" | "mixed";

export type RaceDifficulty =
  | "beginner_friendly"
  | "intermediate"
  | "challenging"
  | "elite";

export type ElevationProfile = "flat" | "rolling" | "hilly" | "mountainous";

export type RaceContinent =
  | "north_america"
  | "south_america"
  | "europe"
  | "asia"
  | "africa"
  | "oceania";

export type RaceTag =
  | "world_major"
  | "bucket_list"
  | "scenic"
  | "fast_course"
  | "historic"
  | "iconic"
  | "big_field"
  | "small_field"
  | "charity"
  | "qualifier"
  | "prestigious"
  | "destination"
  | "first_timer"
  | "urban"
  | "nature";

export interface Race {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  continent: RaceContinent;
  distance: RaceDistance;
  distance_meters: number;
  terrain: RaceTerrain;
  month: number;
  typical_date_description: string;
  website: string;
  description: string;
  difficulty: RaceDifficulty;
  elevation_profile: ElevationProfile;
  estimated_finishers: number;
  year_established: number;
  qualification_required: boolean;
  tags: RaceTag[];
  highlights: string[];
}

export type UserRaceStatus = "completed" | "upcoming" | "interested";

export interface UserRace {
  id: string;
  user_id: string;
  race_id: string;
  status: UserRaceStatus;
  year: number | null;
  finish_time_seconds: number | null;
  notes: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}
