-- Collapse legacy premium users into pro and remove premium plan option.
UPDATE public.profiles
SET plan = 'pro'
WHERE plan = 'premium';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro'));
