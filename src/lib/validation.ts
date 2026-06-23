import DOMPurify from 'dompurify';
import { z } from 'zod';

// WHY: untrusted form values must be normalized before they reach Supabase writes.
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

export const PlayerSchema = z.object({
  full_name: z.string().min(2).max(100),
  date_of_birth: z.string(),
  jersey_number: z.number().int().min(1).max(99),
  gender: z.enum(['male', 'female']),
  national_id: z.string().max(20).optional(),
});

export const MatchResultSchema = z.object({
  home_score: z.number().int().min(0).max(999),
  away_score: z.number().int().min(0).max(999),
  result_type: z.enum(['played', 'walkover', 'forfeit', 'bye', 'postponed', 'abandoned']),
});

export const TenantSignupSchema = z.object({
  organization_name: z.string().min(2).max(120),
  contact_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  county: z.string().max(80).optional(),
  subcounty: z.string().max(80).optional(),
  password: z.string().min(8),
  confirm_password: z.string().min(8),
  category: z.enum(['ball_games', 'athletics', 'music', 'other']),
});

export const ChampionshipFormSchema = z.object({
  name: z.string().min(2).max(120),
  level: z.enum(['base', 'zone', 'subcounty', 'county', 'region', 'national']),
  school_level: z.enum(['base', 'primary', 'junior_secondary', 'primary_junior', 'senior_secondary', 'tertiary', 'open']),
  category: z.enum(['ball_games', 'athletics', 'music', 'other', 'indoor']),
  location: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
});
