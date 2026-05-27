-- Stripe billing linkage for subscriptions and customer portal.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
