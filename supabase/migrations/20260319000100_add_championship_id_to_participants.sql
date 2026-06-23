ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS championship_id UUID REFERENCES public.championships(id);

CREATE INDEX IF NOT EXISTS idx_participants_championship_id
ON public.participants (championship_id);

UPDATE public.participants p
SET championship_id = g.championship_id
FROM public.games g
WHERE p.game_id = g.id
  AND p.championship_id IS NULL;
