
UPDATE public.championships SET school_level = 'primary_junior' WHERE school_level IN ('primary', 'junior_secondary');
UPDATE public.games SET school_level = 'primary_junior' WHERE school_level IN ('primary', 'junior_secondary');
