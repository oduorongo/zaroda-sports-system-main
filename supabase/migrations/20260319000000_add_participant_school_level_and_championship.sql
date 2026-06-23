-- Add missing participant columns used by Record Result form.
alter table public.participants
  add column if not exists school_level public.school_level,
  add column if not exists championship_id uuid references public.championships(id) on delete set null;

-- Backfill school_level from linked games where possible.
update public.participants p
set school_level = g.school_level
from public.games g
where p.game_id = g.id
  and p.school_level is null;

create index if not exists participants_championship_id_idx
  on public.participants(championship_id);
