
CREATE TABLE public.entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  siret TEXT,
  adresse TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entreprises TO authenticated;
GRANT ALL ON public.entreprises TO service_role;

ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entreprises lisibles par utilisateurs connectés"
  ON public.entreprises FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins et conducteurs créent entreprises"
  ON public.entreprises FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'conducteur'));

CREATE POLICY "Admins et conducteurs modifient entreprises"
  ON public.entreprises FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'conducteur'));

CREATE POLICY "Admins suppriment entreprises"
  ON public.entreprises FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER entreprises_set_updated_at
  BEFORE UPDATE ON public.entreprises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_entreprise_id ON public.profiles(entreprise_id);
