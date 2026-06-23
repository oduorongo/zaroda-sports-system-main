-- Add category support for championships so UI can filter championships by school level.
alter table public.championships
  add column if not exists school_level public.school_level not null default 'primary';

create index if not exists championships_school_level_idx
  on public.championships (school_level);
