import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  color: string;
  wins: string;
  losses: string;
  league: string;
  coach: string;
  captain: string;
  chairperson: string;
  founded: number;
  arena: string;
  logo: string;
}

export interface Player {
  id: number;
  name: string;
  team_id: string;
  position: string;
  number: number;
  height: string;
  weight: string;
  age: number;
  ppg: number;
  rpg: number;
  apg: number;
}

export interface Game {
  id: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  date: string;
  status: string;
  venue: string;
  season: string;
  matchweek?: number;
  predictions?: { confidence_score: number }[];
}

export interface GameStat {
  game_id: number;
  player_id: number;
  points: number;
  rebounds: number;
  assists: number;
}

export interface NewsArticle {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  category: string;
}

export interface Standing {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  logo: string;
  wins: number;
  losses: number;
  winPct: number;
  matches_played: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  current_form: string;
}

export interface PredictionStats {
  totalGames: number;
  completedGames: number;
  upcomingGames: number;
  totalTeams: number;
  totalPlayers: number;
}

export interface Ranking {
  team: Team & {
    power_ranking: number;
    attack_rating: number;
    defense_rating: number;
    form_rating: number;
  };
  stats: {
    matches_played: number;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    point_differential: number;
    current_form: string;
    win_streak: number;
  };
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*");
  if (error) { console.error("Error fetching teams:", error.message); return []; }
  return data as Team[];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const { data, error } = await supabase.from("teams").select("*").eq("id", id).single();
  if (error) { console.error(`Error fetching team ${id}:`, error.message); return null; }
  return data as Team;
}

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*");
  if (error) { console.error("Error fetching players:", error.message); return []; }
  return data as Player[];
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single();
  if (error) { console.error(`Error fetching player ${id}:`, error.message); return null; }
  return data as Player;
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("*").eq("team_id", teamId);
  if (error) { console.error(`Error fetching players for team ${teamId}:`, error.message); return []; }
  return data as Player[];
}

// ─── GAMES ────────────────────────────────────────────────────────────────────

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").order("date", { ascending: false });
  if (error) { console.error("Error fetching games:", error.message); return []; }
  return data as Game[];
}

export async function getGameById(id: number): Promise<Game | null> {
  const { data, error } = await supabase.from("games").select("*").eq("id", id).single();
  if (error) { console.error(`Error fetching game ${id}:`, error.message); return null; }
  return data as Game;
}

export async function getRecentGames(limit = 10): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").order("date", { ascending: false }).limit(limit);
  if (error) { console.error("Error fetching recent games:", error.message); return []; }
  return data as Game[];
}

export async function getUpcomingGames(limit = 10): Promise<Game[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase.from("games").select("*").gte("date", today).eq("status", "Scheduled").order("date", { ascending: true }).limit(limit);
  if (error) { console.error("Error fetching upcoming games:", error.message); return []; }
  return data as Game[];
}

export async function getGamesBySeason(season: string): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").eq("season", season).order("date", { ascending: true });
  if (error) { console.error(`Error fetching games for season ${season}:`, error.message); return []; }
  return data as Game[];
}

// ─── FIXTURES (aliases) ───────────────────────────────────────────────────────

export async function getUpcomingFixtures(limit = 10): Promise<Game[]> {
  return getUpcomingGames(limit);
}

export async function getCompletedFixtures(limit = 10): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").eq("status", "Final").order("date", { ascending: false }).limit(limit);
  if (error) { console.error("Error fetching completed fixtures:", error.message); return []; }
  return data as Game[];
}

export async function getFixturesWithPredictions(limit = 50): Promise<Game[]> {
  return getUpcomingGames(limit);
}

// ─── STANDINGS ────────────────────────────────────────────────────────────────

export async function getStandings(): Promise<Standing[]> {
  const { data, error } = await supabase.from("teams").select("id, name, city, abbreviation, logo, wins, losses");
  if (error) { console.error("Error fetching standings:", error.message); return []; }

  const { data: games } = await supabase.from("games").select("*").eq("status", "Final");
  const allGames = games || [];

  return (data as Team[])
    .map((team) => {
      const wins = parseInt(team.wins) || 0;
      const losses = parseInt(team.losses) || 0;
      const total = wins + losses;

      const teamGames = allGames.filter(
        (g) => g.home_team_id === team.id || g.away_team_id === team.id
      );

      let points_for = 0;
      let points_against = 0;
      const formArr: string[] = [];

      teamGames.forEach((g) => {
        const isHome = g.home_team_id === team.id;
        const scored = isHome ? g.home_score : g.away_score;
        const conceded = isHome ? g.away_score : g.home_score;
        points_for += scored || 0;
        points_against += conceded || 0;
        formArr.push(scored > conceded ? "W" : scored < conceded ? "L" : "D");
      });

      return {
        id: team.id,
        name: team.name,
        city: team.city,
        abbreviation: team.abbreviation,
        logo: team.logo,
        wins,
        losses,
        winPct: total > 0 ? wins / total : 0,
        matches_played: total,
        points_for,
        points_against,
        point_differential: points_for - points_against,
        current_form: formArr.slice(-5).join(""),
      };
    })
    .sort((a, b) => b.winPct - a.winPct);
}

// ─── RANKINGS ─────────────────────────────────────────────────────────────────

export async function getRankings(): Promise<Ranking[]> {
  const { data, error } = await supabase.from("teams").select("*");
  if (error) { console.error("Error fetching rankings:", error.message); return []; }

  const { data: games } = await supabase.from("games").select("*").eq("status", "Final");
  const allGames = games || [];

  return (data as Team[])
    .map((team) => {
      const wins = parseInt(team.wins) || 0;
      const losses = parseInt(team.losses) || 0;
      const total = wins + losses;

      const teamGames = allGames.filter(
        (g) => g.home_team_id === team.id || g.away_team_id === team.id
      );

      let points_for = 0;
      let points_against = 0;
      let win_streak = 0;
      const formArr: string[] = [];

      teamGames.forEach((g) => {
        const isHome = g.home_team_id === team.id;
        const scored = isHome ? g.home_score : g.away_score;
        const conceded = isHome ? g.away_score : g.home_score;
        points_for += scored || 0;
        points_against += conceded || 0;
        formArr.push(scored > conceded ? "W" : scored < conceded ? "L" : "D");
      });

      for (let i = formArr.length - 1; i >= 0; i--) {
        if (formArr[i] === "W") win_streak++;
        else break;
      }

      const winPct = total > 0 ? wins / total : 0;
      const attack_rating = total > 0 ? Math.min((points_for / total) / 1.2 * 100, 100) : 0;
      const defense_rating = total > 0 ? Math.max(100 - (points_against / total) / 1.2 * 100, 0) : 0;
      const form_rating = formArr.slice(-5).filter((r) => r === "W").length * 20;
      const power_ranking = (winPct * 40) + (attack_rating * 0.3) + (defense_rating * 0.3);

      return {
        team: { ...team, power_ranking, attack_rating, defense_rating, form_rating },
        stats: {
          matches_played: total,
          wins,
          losses,
          points_for,
          points_against,
          point_differential: points_for - points_against,
          current_form: formArr.slice(-5).join(""),
          win_streak,
        },
      };
    })
    .sort((a, b) => b.team.power_ranking - a.team.power_ranking);
}

// ─── PREDICTION STATS ─────────────────────────────────────────────────────────

export async function predictionStats(): Promise<PredictionStats> {
  const [games, teams, players] = await Promise.all([
    supabase.from("games").select("id, status"),
    supabase.from("teams").select("id"),
    supabase.from("players").select("id"),
  ]);
  const allGames = games.data || [];
  return {
    totalGames: allGames.length,
    completedGames: allGames.filter((g) => g.status === "Final").length,
    upcomingGames: allGames.filter((g) => g.status === "Scheduled").length,
    totalTeams: (teams.data || []).length,
    totalPlayers: (players.data || []).length,
  };
}

// ─── GAME STATS ───────────────────────────────────────────────────────────────

export async function getGameStats(gameId: number): Promise<GameStat[]> {
  const { data, error } = await supabase.from("gameStats").select("*").eq("game_id", gameId);
  if (error) { console.error(`Error fetching stats for game ${gameId}:`, error.message); return []; }
  return data as GameStat[];
}

export async function getPlayerStats(playerId: number): Promise<GameStat[]> {
  const { data, error } = await supabase.from("gameStats").select("*").eq("player_id", playerId);
  if (error) { console.error(`Error fetching stats for player ${playerId}:`, error.message); return []; }
  return data as GameStat[];
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────

export async function getNews(): Promise<NewsArticle[]> {
  const { data, error } = await supabase.from("news").select("*").order("date", { ascending: false });
  if (error) { console.error("Error fetching news:", error.message); return []; }
  return data as NewsArticle[];
}

export async function getNewsById(id: number): Promise<NewsArticle | null> {
  const { data, error } = await supabase.from("news").select("*").eq("id", id).single();
  if (error) { console.error(`Error fetching news article ${id}:`, error.message); return null; }
  return data as NewsArticle;
}

export async function getNewsByCategory(category: string): Promise<NewsArticle[]> {
  const { data, error } = await supabase.from("news").select("*").eq("category", category).order("date", { ascending: false });
  if (error) { console.error(`Error fetching news for category ${category}:`, error.message); return []; }
  return data as NewsArticle[];
}

export async function getRecentNews(limit = 5): Promise<NewsArticle[]> {
  const { data, error } = await supabase.from("news").select("*").order("date", { ascending: false }).limit(limit);
  if (error) { console.error("Error fetching recent news:", error.message); return []; }
  return data as NewsArticle[];
}