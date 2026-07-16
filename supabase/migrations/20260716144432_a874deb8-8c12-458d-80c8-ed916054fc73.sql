
CREATE TYPE public.demande_acces_statut AS ENUM ('en_attente','acceptee','refusee','terminee','annulee');
CREATE TYPE public.demande_acces_urgence AS ENUM ('normale','prioritaire','urgente');

CREATE TABLE public.demandes_acces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  logement_id UUID NOT NULL REFERENCES public.logements(id) ON DELETE CASCADE,
  demandeur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compagnon_id UUID REFERENCES public.compagnons(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  motif TEXT NOT NULL,
  date_prevue DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  urgence public.demande_acces_urgence NOT NULL DEFAULT 'normale',
  statut public.demande_acces_statut NOT NULL DEFAULT 'en_attente',
  raison_refus TEXT,
  valide_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_demandes_acces_chantier ON public.demandes_acces(chantier_id);
CREATE INDEX idx_demandes_acces_logement ON public.demandes_acces(logement_id);
CREATE INDEX idx_demandes_acces_statut ON public.demandes_acces(statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandes_acces TO authenticated;
GRANT ALL ON public.demandes_acces TO service_role;
ALTER TABLE public.demandes_acces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lire demandes acces" ON public.demandes_acces FOR SELECT TO authenticated USING (
  demandeur_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'operateur')
  OR public.has_role(auth.uid(),'conducteur')
);
CREATE POLICY "Creer demandes acces" ON public.demandes_acces FOR INSERT TO authenticated WITH CHECK (
  demandeur_id = auth.uid()
);
CREATE POLICY "Annuler propre demande" ON public.demandes_acces FOR UPDATE TO authenticated USING (
  demandeur_id = auth.uid()
) WITH CHECK (demandeur_id = auth.uid());
CREATE POLICY "Valider demandes acces" ON public.demandes_acces FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'conducteur')
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'conducteur')
);
CREATE TRIGGER trg_demandes_acces_updated BEFORE UPDATE ON public.demandes_acces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.intervention_statut AS ENUM ('en_cours','terminee','bloquee');

CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID REFERENCES public.demandes_acces(id) ON DELETE SET NULL,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  logement_id UUID NOT NULL REFERENCES public.logements(id) ON DELETE CASCADE,
  compagnon_id UUID REFERENCES public.compagnons(id) ON DELETE SET NULL,
  coureur_id UUID NOT NULL REFERENCES auth.users(id),
  trousseau_id UUID REFERENCES public.trousseaux(id) ON DELETE SET NULL,
  heure_ouverture TIMESTAMPTZ NOT NULL DEFAULT now(),
  heure_fermeture TIMESTAMPTZ,
  statut public.intervention_statut NOT NULL DEFAULT 'en_cours',
  photos_avant TEXT[] NOT NULL DEFAULT '{}',
  photos_apres TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interventions_chantier ON public.interventions(chantier_id);
CREATE INDEX idx_interventions_statut ON public.interventions(statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lire interventions" ON public.interventions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'operateur')
  OR public.has_role(auth.uid(),'conducteur')
  OR public.has_role(auth.uid(),'prestataire')
);
CREATE POLICY "Modifier interventions" ON public.interventions FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'operateur')
  OR public.has_role(auth.uid(),'conducteur')
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'operateur')
  OR public.has_role(auth.uid(),'conducteur')
);
CREATE TRIGGER trg_interventions_updated BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for opr-photos
CREATE POLICY "OPR photos read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'opr-photos');
CREATE POLICY "OPR photos upload authenticated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'opr-photos');
CREATE POLICY "OPR photos update owner" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'opr-photos' AND owner = auth.uid());
CREATE POLICY "OPR photos delete owner" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'opr-photos' AND owner = auth.uid());
