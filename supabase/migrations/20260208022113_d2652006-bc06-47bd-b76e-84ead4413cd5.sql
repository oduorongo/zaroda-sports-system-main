
-- Championships table for naming events
CREATE TABLE public.championships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level competition_level NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view championships" ON public.championships FOR SELECT USING (true);
CREATE POLICY "Admins can manage championships" ON public.championships FOR ALL USING (true) WITH CHECK (true);

-- Circulars/announcements table
CREATE TABLE public.circulars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'National Admin',
  target_level competition_level NOT NULL DEFAULT 'national',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published circulars" ON public.circulars FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage circulars" ON public.circulars FOR ALL USING (true) WITH CHECK (true);

-- Heats table for athletics races
CREATE TABLE public.heats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  heat_number INTEGER NOT NULL,
  heat_type TEXT NOT NULL DEFAULT 'heat', -- 'heat' or 'final'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.heats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view heats" ON public.heats FOR SELECT USING (true);
CREATE POLICY "Admins can manage heats" ON public.heats FOR ALL USING (true) WITH CHECK (true);

-- Heat participants (links participants to heats)
CREATE TABLE public.heat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  heat_id UUID NOT NULL REFERENCES public.heats(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  time_taken NUMERIC,
  position INTEGER,
  is_qualified_for_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.heat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view heat_participants" ON public.heat_participants FOR SELECT USING (true);
CREATE POLICY "Admins can manage heat_participants" ON public.heat_participants FOR ALL USING (true) WITH CHECK (true);

-- Pooling/matchups for ball games
CREATE TABLE public.match_pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL DEFAULT 'Round 1',
  team_a_school_id UUID REFERENCES public.schools(id),
  team_b_school_id UUID REFERENCES public.schools(id),
  team_a_score INTEGER,
  team_b_score INTEGER,
  winner_school_id UUID REFERENCES public.schools(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.match_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view match_pools" ON public.match_pools FOR SELECT USING (true);
CREATE POLICY "Admins can manage match_pools" ON public.match_pools FOR ALL USING (true) WITH CHECK (true);

-- Add race_type to games for athletics (short_race, long_race)
ALTER TABLE public.games ADD COLUMN race_type TEXT;

-- Add championship_id to games (optional link)
ALTER TABLE public.games ADD COLUMN championship_id UUID REFERENCES public.championships(id);

-- Enable realtime for live results
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heat_participants;
