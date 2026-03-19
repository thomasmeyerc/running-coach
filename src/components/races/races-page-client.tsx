"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  Race,
  UserRace,
  RaceDistance,
  RaceContinent,
  RaceTerrain,
  RaceDifficulty,
  RaceTag,
} from "@/types/races";
import {
  Search,
  MapPin,
  Calendar,
  Globe,
  Mountain,
  Trophy,
  ExternalLink,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Star,
  Users,
  X,
  Loader2,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";

interface RacesPageClientProps {
  races: Race[];
  userRaces: UserRace[];
}

const DISTANCE_LABELS: Record<RaceDistance, string> = {
  "5k": "5K",
  "10k": "10K",
  half_marathon: "Half Marathon",
  marathon: "Marathon",
  "50k": "50K",
  "100k": "100K",
  "100mi": "100 Miles",
  ultra_other: "Ultra",
};

const CONTINENT_LABELS: Record<RaceContinent, string> = {
  north_america: "North America",
  south_america: "South America",
  europe: "Europe",
  asia: "Asia",
  africa: "Africa",
  oceania: "Oceania",
};

const TERRAIN_LABELS: Record<RaceTerrain, string> = {
  road: "Road",
  trail: "Trail",
  mixed: "Mixed",
};

const DIFFICULTY_LABELS: Record<RaceDifficulty, string> = {
  beginner_friendly: "Beginner Friendly",
  intermediate: "Intermediate",
  challenging: "Challenging",
  elite: "Elite",
};

const DIFFICULTY_COLORS: Record<RaceDifficulty, string> = {
  beginner_friendly: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  intermediate: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  challenging: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  elite: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const TAG_LABELS: Partial<Record<RaceTag, string>> = {
  world_major: "World Major",
  bucket_list: "Bucket List",
  scenic: "Scenic",
  fast_course: "Fast Course",
  historic: "Historic",
  iconic: "Iconic",
  big_field: "Big Field",
  first_timer: "First Timer",
  destination: "Destination",
  nature: "Nature",
  prestigious: "Prestigious",
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type SortOption = "name" | "month" | "distance" | "finishers";

export function RacesPageClient({ races, userRaces }: RacesPageClientProps) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDistance, setSelectedDistance] = useState<RaceDistance | "">("");
  const [selectedContinent, setSelectedContinent] = useState<RaceContinent | "">("");
  const [selectedTerrain, setSelectedTerrain] = useState<RaceTerrain | "">("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<RaceDifficulty | "">("");
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");
  const [selectedTag, setSelectedTag] = useState<RaceTag | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // View tabs
  const [activeTab, setActiveTab] = useState<"discover" | "my_races">("discover");

  // Detail dialog
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  // Tracking
  const [trackingRaceId, setTrackingRaceId] = useState<string | null>(null);

  // Build userRaces lookup
  const userRaceMap = useMemo(() => {
    const map = new Map<string, UserRace[]>();
    for (const ur of userRaces) {
      const existing = map.get(ur.race_id) || [];
      existing.push(ur);
      map.set(ur.race_id, existing);
    }
    return map;
  }, [userRaces]);

  // Filter races
  const filteredRaces = useMemo(() => {
    let result = races;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    if (selectedDistance) result = result.filter((r) => r.distance === selectedDistance);
    if (selectedContinent) result = result.filter((r) => r.continent === selectedContinent);
    if (selectedTerrain) result = result.filter((r) => r.terrain === selectedTerrain);
    if (selectedDifficulty) result = result.filter((r) => r.difficulty === selectedDifficulty);
    if (selectedMonth) result = result.filter((r) => r.month === selectedMonth);
    if (selectedTag) result = result.filter((r) => r.tags.includes(selectedTag));

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "month": return a.month - b.month;
        case "distance": return a.distance_meters - b.distance_meters;
        case "finishers": return b.estimated_finishers - a.estimated_finishers;
        default: return 0;
      }
    });

    return result;
  }, [races, search, selectedDistance, selectedContinent, selectedTerrain, selectedDifficulty, selectedMonth, selectedTag, sortBy]);

  // My races
  const myCompletedRaces = useMemo(
    () => userRaces.filter((ur) => ur.status === "completed"),
    [userRaces]
  );
  const myUpcomingRaces = useMemo(
    () => userRaces.filter((ur) => ur.status === "upcoming"),
    [userRaces]
  );
  const myInterestedRaces = useMemo(
    () => userRaces.filter((ur) => ur.status === "interested"),
    [userRaces]
  );

  const getRaceById = useCallback(
    (id: string) => races.find((r) => r.id === id),
    [races]
  );

  const activeFilterCount = [selectedDistance, selectedContinent, selectedTerrain, selectedDifficulty, selectedMonth, selectedTag].filter(Boolean).length;

  function clearFilters() {
    setSelectedDistance("");
    setSelectedContinent("");
    setSelectedTerrain("");
    setSelectedDifficulty("");
    setSelectedMonth("");
    setSelectedTag("");
    setSearch("");
  }

  async function handleTrack(raceId: string, status: "completed" | "upcoming" | "interested") {
    setTrackingRaceId(raceId);
    try {
      const res = await fetch("/api/user-races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race_id: raceId,
          status,
          year: new Date().getFullYear(),
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        if (data.error) alert(data.error);
      }
    } catch {
      alert("Failed to track race");
    } finally {
      setTrackingRaceId(null);
    }
  }

  async function handleRemoveTrack(userRaceId: string) {
    try {
      const res = await fetch(`/api/user-races?id=${userRaceId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch {
      alert("Failed to remove");
    }
  }

  async function handleCreateGoal(race: Race) {
    // Map race distance to goal race_type
    const distanceToRaceType: Record<string, string> = {
      "5k": "5k",
      "10k": "10k",
      half_marathon: "half_marathon",
      marathon: "marathon",
      "50k": "ultra",
      "100k": "ultra",
      "100mi": "ultra",
      ultra_other: "ultra",
    };

    const raceType = distanceToRaceType[race.distance] || "custom";

    const goalData = {
      goal_name: race.name,
      goal_type: "race",
      race_type: raceType,
      priority: "primary",
    };

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalData),
      });

      if (res.ok) {
        const { goal } = await res.json();
        // Also track as upcoming
        await fetch("/api/user-races", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            race_id: race.id,
            status: "upcoming",
            year: new Date().getFullYear(),
            goal_id: goal.id,
          }),
        });
        router.refresh();
        router.push("/goals");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create goal");
      }
    } catch {
      alert("Failed to create goal");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Discover Races</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Find your next race from {races.length}+ events worldwide.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("discover")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "discover"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="mr-2 inline h-4 w-4" />
          Discover ({races.length})
        </button>
        <button
          onClick={() => setActiveTab("my_races")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "my_races"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="mr-2 inline h-4 w-4" />
          My Races ({userRaces.length})
        </button>
      </div>

      {activeTab === "discover" && (
        <>
          {/* Search + Filter Bar */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search races, cities, countries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                const options: SortOption[] = ["name", "month", "distance", "finishers"];
                const idx = options.indexOf(sortBy);
                setSortBy(options[(idx + 1) % options.length]);
              }} title={`Sort by: ${sortBy}`}>
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sorted by: <span className="font-medium text-foreground">{sortBy === "finishers" ? "popularity" : sortBy}</span></span>
              <span>&middot;</span>
              <span>{filteredRaces.length} races</span>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Distance */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Distance</label>
                    <select
                      value={selectedDistance}
                      onChange={(e) => setSelectedDistance(e.target.value as RaceDistance | "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All distances</option>
                      {Object.entries(DISTANCE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Continent */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Region</label>
                    <select
                      value={selectedContinent}
                      onChange={(e) => setSelectedContinent(e.target.value as RaceContinent | "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All regions</option>
                      {Object.entries(CONTINENT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Terrain */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Terrain</label>
                    <select
                      value={selectedTerrain}
                      onChange={(e) => setSelectedTerrain(e.target.value as RaceTerrain | "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All terrain</option>
                      {Object.entries(TERRAIN_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value as RaceDifficulty | "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All levels</option>
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Any month</option>
                      {MONTH_NAMES.slice(1).map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value as RaceTag | "")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All categories</option>
                      {Object.entries(TAG_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-1 h-3 w-3" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick filter tags */}
          <div className="flex flex-wrap gap-2">
            {(["world_major", "bucket_list", "fast_course", "first_timer", "scenic"] as RaceTag[]).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            ))}
          </div>

          {/* Race Grid */}
          {filteredRaces.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-3">
                <Globe className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No races found matching your filters. Try adjusting your search.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRaces.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  userEntries={userRaceMap.get(race.id)}
                  onSelect={() => setSelectedRace(race)}
                  onTrack={handleTrack}
                  isTracking={trackingRaceId === race.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "my_races" && (
        <div className="space-y-6">
          {userRaces.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-3">
                <Trophy className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No races tracked yet. Discover races and start building your race portfolio.
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("discover")}>
                  Discover races
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Upcoming */}
              {myUpcomingRaces.length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Upcoming ({myUpcomingRaces.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {myUpcomingRaces.map((ur) => {
                      const race = getRaceById(ur.race_id);
                      if (!race) return null;
                      return (
                        <MyRaceCard
                          key={ur.id}
                          race={race}
                          userRace={ur}
                          onSelect={() => setSelectedRace(race)}
                          onRemove={() => handleRemoveTrack(ur.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed */}
              {myCompletedRaces.length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Completed ({myCompletedRaces.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {myCompletedRaces.map((ur) => {
                      const race = getRaceById(ur.race_id);
                      if (!race) return null;
                      return (
                        <MyRaceCard
                          key={ur.id}
                          race={race}
                          userRace={ur}
                          onSelect={() => setSelectedRace(race)}
                          onRemove={() => handleRemoveTrack(ur.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interested */}
              {myInterestedRaces.length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Star className="h-5 w-5 text-amber-500" />
                    Interested ({myInterestedRaces.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {myInterestedRaces.map((ur) => {
                      const race = getRaceById(ur.race_id);
                      if (!race) return null;
                      return (
                        <MyRaceCard
                          key={ur.id}
                          race={race}
                          userRace={ur}
                          onSelect={() => setSelectedRace(race)}
                          onRemove={() => handleRemoveTrack(ur.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Race Detail Dialog */}
      <Dialog open={!!selectedRace} onOpenChange={(open) => !open && setSelectedRace(null)}>
        {selectedRace && (
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedRace.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {selectedRace.city}, {selectedRace.country}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                <Badge className={DIFFICULTY_COLORS[selectedRace.difficulty]}>
                  {DIFFICULTY_LABELS[selectedRace.difficulty]}
                </Badge>
                <Badge variant="outline">{DISTANCE_LABELS[selectedRace.distance]}</Badge>
                <Badge variant="outline">{TERRAIN_LABELS[selectedRace.terrain]}</Badge>
                {selectedRace.qualification_required && (
                  <Badge variant="destructive">Qualification Required</Badge>
                )}
                {selectedRace.tags.includes("world_major") && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Trophy className="mr-1 h-3 w-3" />
                    World Major
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selectedRace.description}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">When</div>
                  <div className="font-medium">{selectedRace.typical_date_description}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Elevation</div>
                  <div className="font-medium capitalize">{selectedRace.elevation_profile}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Finishers</div>
                  <div className="font-medium">{selectedRace.estimated_finishers.toLocaleString()}+</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Since</div>
                  <div className="font-medium">{selectedRace.year_established}</div>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Highlights</h3>
                <ul className="space-y-1.5">
                  {selectedRace.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* More Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedRace.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {TAG_LABELS[tag] || tag.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 border-t pt-4">
                <a
                  href={selectedRace.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Official Website
                </a>
                <Button onClick={() => { handleCreateGoal(selectedRace); setSelectedRace(null); }}>
                  <Target className="mr-2 h-4 w-4" />
                  Create Goal for This Race
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { handleTrack(selectedRace.id, "interested"); }}
                    disabled={trackingRaceId === selectedRace.id}
                  >
                    <Star className="mr-1 h-3 w-3" />
                    Interested
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { handleTrack(selectedRace.id, "upcoming"); }}
                    disabled={trackingRaceId === selectedRace.id}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Upcoming
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { handleTrack(selectedRace.id, "completed"); }}
                    disabled={trackingRaceId === selectedRace.id}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Completed
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Race Card (Discover Tab)
// ────────────────────────────────────────────────────────────
interface RaceCardProps {
  race: Race;
  userEntries?: UserRace[];
  onSelect: () => void;
  onTrack: (raceId: string, status: "completed" | "upcoming" | "interested") => void;
  isTracking: boolean;
}

function RaceCard({ race, userEntries, onSelect, onTrack, isTracking }: RaceCardProps) {
  const hasUserEntry = userEntries && userEntries.length > 0;

  return (
    <Card className="group relative cursor-pointer transition-shadow hover:shadow-md" onClick={onSelect}>
      {/* Tracked indicator */}
      {hasUserEntry && (
        <div className="absolute right-3 top-3 z-10">
          {userEntries.some((e) => e.status === "completed") ? (
            <div className="rounded-full bg-emerald-500 p-1"><CheckCircle className="h-3 w-3 text-white" /></div>
          ) : userEntries.some((e) => e.status === "upcoming") ? (
            <div className="rounded-full bg-blue-500 p-1"><Clock className="h-3 w-3 text-white" /></div>
          ) : (
            <div className="rounded-full bg-amber-500 p-1"><Star className="h-3 w-3 text-white" /></div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base leading-tight pr-8">{race.name}</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {race.city}, {race.country}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Key info */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">{DISTANCE_LABELS[race.distance]}</Badge>
          <Badge variant="outline" className="text-xs">{TERRAIN_LABELS[race.terrain]}</Badge>
          <Badge className={`text-xs ${DIFFICULTY_COLORS[race.difficulty]}`}>
            {DIFFICULTY_LABELS[race.difficulty]}
          </Badge>
        </div>

        {/* Date + Finishers */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {MONTH_NAMES[race.month]}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {race.estimated_finishers.toLocaleString()}
          </span>
          {race.elevation_profile !== "flat" && (
            <span className="flex items-center gap-1">
              <Mountain className="h-3 w-3" />
              {race.elevation_profile}
            </span>
          )}
        </div>

        {/* Description truncated */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {race.description}
        </p>

        {/* Feature tags */}
        <div className="flex flex-wrap gap-1">
          {race.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {TAG_LABELS[tag] || tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="xs"
            className="flex-1"
            onClick={() => onTrack(race.id, "interested")}
            disabled={isTracking}
          >
            {isTracking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="mr-1 h-3 w-3" />}
            Save
          </Button>
          <Button
            size="xs"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// My Race Card (My Races Tab)
// ────────────────────────────────────────────────────────────
interface MyRaceCardProps {
  race: Race;
  userRace: UserRace;
  onSelect: () => void;
  onRemove: () => void;
}

function MyRaceCard({ race, userRace, onSelect, onRemove }: MyRaceCardProps) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onSelect}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base leading-tight">{race.name}</CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {race.city}, {race.country}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove from My Races"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">{DISTANCE_LABELS[race.distance]}</Badge>
          <Badge variant="outline" className="text-xs">{MONTH_NAMES[race.month]}</Badge>
          {userRace.year && (
            <Badge variant="secondary" className="text-xs">{userRace.year}</Badge>
          )}
          {userRace.finish_time_seconds && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs">
              {formatFinishTime(userRace.finish_time_seconds)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
