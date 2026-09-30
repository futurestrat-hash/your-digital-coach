ALTER TABLE public.profiles
  ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN reminder_time TEXT NOT NULL DEFAULT '20:00',
  ADD COLUMN voice_play_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.weekly_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reward_claims TO authenticated;
GRANT ALL ON public.weekly_reward_claims TO service_role;
ALTER TABLE public.weekly_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reward claims select" ON public.weekly_reward_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reward claims insert" ON public.weekly_reward_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reward claims update" ON public.weekly_reward_claims FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reward claims delete" ON public.weekly_reward_claims FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX weekly_reward_claims_user_week_idx ON public.weekly_reward_claims (user_id, week_start DESC);

CREATE TABLE public.reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);
GRANT SELECT, INSERT, DELETE ON public.reminder_deliveries TO authenticated;
GRANT ALL ON public.reminder_deliveries TO service_role;
ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reminder deliveries select" ON public.reminder_deliveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reminder deliveries insert" ON public.reminder_deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminder deliveries delete" ON public.reminder_deliveries FOR DELETE TO authenticated USING (auth.uid() = user_id);