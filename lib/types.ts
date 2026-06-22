export interface Organization {
  id: string
  name: string
  slug: string
  sport: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  created_at: string
}

export interface Season {
  id: string
  organization_id: string
  name: string
  start_date: string
  end_date: string | null
  is_active: boolean
}

export interface Team {
  id: string
  organization_id: string
  name: string
  short_name: string | null
  logo_url: string | null
  primary_color: string
  city: string | null
  venue: string | null
  power_ranking: number
  form_rating: number
  attack_rating: number
  defense_rating: number
}

export interface TeamSeasonStats {
  id: string
  team_id: string
  season_id: string
  matches_played: number
  wins: number
  losses: number
  draws: number
  points_for: number
  points_against: number
  point_differential: number
  win_streak: number
  current_form: string
  team?: Team
}

export interface Fixture {
  id: string
  organization_id: string
  season_id: string | null
  home_team_id: string
  away_team_id: string
  match_date: string
  venue: string | null
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  home_score: number | null
  away_score: number | null
  matchweek: number | null
  home_team?: Team
  away_team?: Team
  predictions?: Prediction[]
}

export interface Prediction {
  id: string
  fixture_id: string
  home_win_probability: number
  draw_probability: number
  away_win_probability: number
  predicted_home_score: number | null
  predicted_away_score: number | null
  confidence_score: number
  factors: {
    home_form?: string
    away_form?: string
    head_to_head?: string
    key_factor?: string
  } | null
  model_version: string
}

export interface MatchSummary {
  id: string
  fixture_id: string
  summary: string
  key_moments: unknown[] | null
  mvp_player_id: string | null
  ai_insights: unknown | null
}
