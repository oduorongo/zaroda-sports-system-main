export type CompetitionLevel = 'base' | 'ward' | 'zone' | 'subcounty' | 'county' | 'region' | 'national';
export type GameCategory = 'ball_games' | 'athletics' | 'indoor' | 'music' | 'other';
export type Gender = 'boys' | 'girls' | 'mixed' | 'male' | 'female';
export type ParticipantStatus = 'registered' | 'called' | 'present' | 'absent' | 'advanced';
export type SchoolLevel = 'base' | 'primary' | 'junior_secondary' | 'primary_junior' | 'senior_secondary' | 'tertiary' | 'open';
export type RaceType = 'short_race' | 'long_race';

export interface School {
  id: string;
  name: string;
  zone: string;
  subcounty: string;
  county: string;
  region: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  category: GameCategory;
  level: CompetitionLevel;
  gender: Gender;
  school_level: SchoolLevel;
  description?: string;
  is_timed: boolean;
  max_qualifiers: number;
  race_type?: string;
  championship_id?: string;
  scheduled_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  school_name?: string;
  game_id: string;
  gender: Gender;
  contact?: string;
  time_taken?: number;
  position?: number;
  score?: number;
  bib_number?: string | null;
  personal_best?: number | null;
  lane_number?: number | null;
  date_of_birth?: string | null;
  status?: ParticipantStatus;
  is_qualified: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  school?: School;
  game?: Game;
}

export interface Admin {
  id: string;
  username: string;
  email?: string;
  created_at: string;
}

export interface Championship {
  id: string;
  name: string;
  school_level: SchoolLevel;
  level: CompetitionLevel;
  category?: GameCategory;
  county?: string | null;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_published?: boolean;
  created_by?: string | null;
  tenant_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Circular {
  id: string;
  title: string;
  content: string;
  sender_name: string;
  sender_role: string;
  target_level: CompetitionLevel;
  is_published: boolean;
  document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Heat {
  id: string;
  game_id: string;
  heat_number: number;
  heat_type: string; // 'heat' | 'final'
  created_at: string;
}

export interface HeatParticipant {
  id: string;
  heat_id: string;
  participant_id: string;
  time_taken?: number;
  position?: number;
  lane_number?: number | null;
  score?: number;
  is_qualified_for_final: boolean;
  created_at: string;
  participant?: Partial<Participant>;
  heat?: Heat;
}

export interface MatchPool {
  id: string;
  game_id: string;
  round_name: string;
  team_a_school_id?: string;
  team_b_school_id?: string;
  team_a_score?: number;
  team_b_score?: number;
  winner_school_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  team_a_school?: School;
  team_b_school?: School;
  winner_school?: School;
}

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  ball_games: 'Ball Games',
  athletics: 'Athletics',
  indoor: 'Indoor Games',
  music: 'Music',
  other: 'Other Games',
};

export const LEVEL_LABELS: Record<CompetitionLevel, string> = {
  base: 'Base',
  ward: 'Ward',
  zone: 'Zone',
  subcounty: 'Sub-County',
  county: 'County',
  region: 'Region',
  national: 'National',
};

export const GENDER_LABELS: Record<Gender, string> = {
  boys: 'Boys',
  girls: 'Girls',
  mixed: 'Mixed',
  male: 'Male',
  female: 'Female',
};

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  registered: 'Registered',
  called: 'Called',
  present: 'Present',
  absent: 'Absent (No-show)',
  advanced: 'Advanced',
};

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  base: 'Base',
  primary: 'Primary',
  junior_secondary: 'Junior Secondary',
  primary_junior: 'Primary/Junior School',
  senior_secondary: 'Senior Secondary',
  tertiary: 'Tertiary',
  open: 'Open Tournament',
};

export const CATEGORY_ICONS: Record<GameCategory, string> = {
  ball_games: '⚽',
  athletics: '🏃',
  indoor: '🏓',
  music: '🎵',
  other: '🎯',
};

export const TEAM_NAME_BY_LEVEL: Record<CompetitionLevel, string> = {
  base: 'School',
  ward: 'School',
  zone: 'Team',
  subcounty: 'Zone',
  county: 'Sub-County',
  region: 'County',
  national: 'Region',
};

export const RACE_TYPE_LABELS: Record<string, string> = {
  short_race: 'Short Race',
  long_race: 'Long Race',
  field_event: 'Field Event',
};
