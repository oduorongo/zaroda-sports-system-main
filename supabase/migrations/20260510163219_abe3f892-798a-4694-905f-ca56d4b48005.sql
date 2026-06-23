
-- Extend competition_tier with season bundles
ALTER TYPE public.competition_tier ADD VALUE IF NOT EXISTS 'season_subcounty';
ALTER TYPE public.competition_tier ADD VALUE IF NOT EXISTS 'season_county';
ALTER TYPE public.competition_tier ADD VALUE IF NOT EXISTS 'season_regional';

-- Add package_tier to plans (essential/professional/elite/season_bundle)
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS package_tier text NOT NULL DEFAULT 'essential';

-- Drop unique on tier; tier+package_tier should be unique instead
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_tier_key;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_tier_package_key
  ON public.subscription_plans(tier, package_tier);

-- Add category to championships and subscriptions
ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS category public.game_category;
ALTER TABLE public.championship_subscriptions
  ADD COLUMN IF NOT EXISTS category public.game_category;
