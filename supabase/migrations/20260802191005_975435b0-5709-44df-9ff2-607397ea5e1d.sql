CREATE TABLE public.aircraft (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tail_number TEXT NOT NULL,
  name TEXT,
  base_type TEXT NOT NULL DEFAULT 'R',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aircraft TO authenticated;
GRANT ALL ON public.aircraft TO service_role;
ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own aircraft" ON public.aircraft FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  title TEXT,
  flight_date DATE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flights TO authenticated;
GRANT ALL ON public.flights TO service_role;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flights" ON public.flights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.airports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  icao TEXT NOT NULL,
  name TEXT,
  elevation_ft NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, icao)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.airports TO authenticated;
GRANT ALL ON public.airports TO service_role;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own airports" ON public.airports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER aircraft_updated_at BEFORE UPDATE ON public.aircraft FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER flights_updated_at BEFORE UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();