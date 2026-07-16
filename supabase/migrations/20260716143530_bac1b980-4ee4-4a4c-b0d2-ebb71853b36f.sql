
-- BÂTIMENTS
CREATE TABLE public.batiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batiments TO authenticated;
GRANT ALL ON public.batiments TO service_role;
ALTER TABLE public.batiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les bâtiments" ON public.batiments FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id) OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur'));
CREATE POLICY "Gérer les bâtiments" ON public.batiments FOR ALL TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_batiments_updated BEFORE UPDATE ON public.batiments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BLOCS
CREATE TABLE public.blocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batiment_id UUID NOT NULL REFERENCES public.batiments(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocs TO authenticated;
GRANT ALL ON public.blocs TO service_role;
ALTER TABLE public.blocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les blocs" ON public.blocs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.batiments b WHERE b.id = batiment_id AND (public.can_access_chantier(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur')))
);
CREATE POLICY "Gérer les blocs" ON public.blocs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.batiments b WHERE b.id = batiment_id AND (public.is_conducteur_of(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.batiments b WHERE b.id = batiment_id AND (public.is_conducteur_of(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'admin')))
);
CREATE TRIGGER trg_blocs_updated BEFORE UPDATE ON public.blocs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NIVEAUX
CREATE TABLE public.niveaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloc_id UUID NOT NULL REFERENCES public.blocs(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niveaux TO authenticated;
GRANT ALL ON public.niveaux TO service_role;
ALTER TABLE public.niveaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les niveaux" ON public.niveaux FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.blocs bl JOIN public.batiments b ON b.id=bl.batiment_id WHERE bl.id = bloc_id AND (public.can_access_chantier(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur')))
);
CREATE POLICY "Gérer les niveaux" ON public.niveaux FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.blocs bl JOIN public.batiments b ON b.id=bl.batiment_id WHERE bl.id = bloc_id AND (public.is_conducteur_of(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.blocs bl JOIN public.batiments b ON b.id=bl.batiment_id WHERE bl.id = bloc_id AND (public.is_conducteur_of(auth.uid(), b.chantier_id) OR public.has_role(auth.uid(),'admin')))
);
CREATE TRIGGER trg_niveaux_updated BEFORE UPDATE ON public.niveaux FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LOGEMENTS
CREATE TYPE public.logement_phase AS ENUM ('opr','levee_reserves','pre_livraison','livraison','livre');
CREATE TYPE public.logement_statut AS ENUM (
  'ferme_disponible','demande_en_attente','ouverture_en_cours','intervention_en_cours',
  'sortie_a_controler','remise_en_etat','non_conforme','bloque','impossible_securiser',
  'livre','acces_interdit'
);
CREATE TYPE public.logement_sensibilite AS ENUM ('normale','sensible','tres_sensible');

CREATE TABLE public.logements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niveau_id UUID NOT NULL REFERENCES public.niveaux(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  phase public.logement_phase NOT NULL DEFAULT 'opr',
  statut public.logement_statut NOT NULL DEFAULT 'ferme_disponible',
  sensibilite public.logement_sensibilite NOT NULL DEFAULT 'normale',
  consignes TEXT,
  dernier_etat JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logements_niveau ON public.logements(niveau_id);
CREATE INDEX idx_logements_statut ON public.logements(statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logements TO authenticated;
GRANT ALL ON public.logements TO service_role;
ALTER TABLE public.logements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les logements" ON public.logements FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR public.has_role(auth.uid(),'operateur') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'prestataire')
);
CREATE POLICY "Modifier les logements" ON public.logements FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
);
CREATE TRIGGER trg_logements_updated BEFORE UPDATE ON public.logements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LOTS
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les lots" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gérer les lots" ON public.lots FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.is_conducteur_of(auth.uid(), chantier_id)
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.is_conducteur_of(auth.uid(), chantier_id)
);
CREATE TRIGGER trg_lots_updated BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPAGNONS
CREATE TABLE public.compagnons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compagnons TO authenticated;
GRANT ALL ON public.compagnons TO service_role;
ALTER TABLE public.compagnons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les compagnons" ON public.compagnons FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur')
  OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur')
  OR (public.has_role(auth.uid(),'prestataire') AND entreprise_id = (SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Gérer les compagnons" ON public.compagnons FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR (public.has_role(auth.uid(),'prestataire') AND entreprise_id = (SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()))
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
  OR (public.has_role(auth.uid(),'prestataire') AND entreprise_id = (SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE TRIGGER trg_compagnons_updated BEFORE UPDATE ON public.compagnons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TROUSSEAUX
CREATE TYPE public.trousseau_statut AS ENUM (
  'disponible','affecte','en_utilisation','prete','en_transfert',
  'non_restitue','manquant','perdu','casse','double_commande','indisponible','archive'
);

CREATE TABLE public.trousseaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  qr_code TEXT UNIQUE,
  logement_id UUID REFERENCES public.logements(id) ON DELETE SET NULL,
  batiment_id UUID REFERENCES public.batiments(id) ON DELETE SET NULL,
  bloc_id UUID REFERENCES public.blocs(id) ON DELETE SET NULL,
  niveau_id UUID REFERENCES public.niveaux(id) ON DELETE SET NULL,
  type TEXT,
  nb_cles INT NOT NULL DEFAULT 1,
  nb_doubles INT NOT NULL DEFAULT 0,
  emplacement TEXT,
  gestionnaire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  statut public.trousseau_statut NOT NULL DEFAULT 'disponible',
  etat TEXT,
  commentaire TEXT,
  dernier_inventaire TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trousseaux_chantier ON public.trousseaux(chantier_id);
CREATE INDEX idx_trousseaux_gestionnaire ON public.trousseaux(gestionnaire_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trousseaux TO authenticated;
GRANT ALL ON public.trousseaux TO service_role;
ALTER TABLE public.trousseaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les trousseaux" ON public.trousseaux FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur')
  OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur')
);
CREATE POLICY "Gérer les trousseaux" ON public.trousseaux FOR ALL TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles')
);
CREATE TRIGGER trg_trousseaux_updated BEFORE UPDATE ON public.trousseaux FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MOUVEMENTS DE CLÉS
CREATE TYPE public.mouvement_type AS ENUM ('affectation','ouverture','transfert','restitution','declaration_perte','declaration_endommagement','inventaire');

CREATE TABLE public.mouvements_cles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trousseau_id UUID NOT NULL REFERENCES public.trousseaux(id) ON DELETE CASCADE,
  type public.mouvement_type NOT NULL,
  emetteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  destinataire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  destinataire_libre TEXT,
  motif TEXT,
  logement_id UUID REFERENCES public.logements(id) ON DELETE SET NULL,
  restitution_prevue TIMESTAMPTZ,
  restitution_reelle TIMESTAMPTZ,
  ecart TEXT,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_mouvements_trousseau ON public.mouvements_cles(trousseau_id);
CREATE INDEX idx_mouvements_created ON public.mouvements_cles(created_at DESC);
GRANT SELECT, INSERT ON public.mouvements_cles TO authenticated;
GRANT ALL ON public.mouvements_cles TO service_role;
ALTER TABLE public.mouvements_cles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les mouvements" ON public.mouvements_cles FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur')
  OR public.has_role(auth.uid(),'gestionnaire_cles') OR public.has_role(auth.uid(),'operateur')
);
CREATE POLICY "Créer un mouvement" ON public.mouvements_cles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'gestionnaire_cles'));

-- PRISES DE POSTE
CREATE TABLE public.prises_poste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestionnaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  zone TEXT,
  telephone_ok BOOLEAN NOT NULL DEFAULT true,
  connexion_ok BOOLEAN NOT NULL DEFAULT true,
  consignes_jour TEXT,
  coureur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  controleur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inventaire JSONB NOT NULL DEFAULT '[]'::jsonb,
  ecarts JSONB NOT NULL DEFAULT '[]'::jsonb,
  debut_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin_at TIMESTAMPTZ,
  inventaire_fin JSONB,
  cles_non_restituees JSONB,
  logements_ouverts JSONB,
  interventions_ouvertes JSONB,
  nc_en_attente JSONB,
  passation_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  passation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prises_gestionnaire ON public.prises_poste(gestionnaire_id, debut_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prises_poste TO authenticated;
GRANT ALL ON public.prises_poste TO service_role;
ALTER TABLE public.prises_poste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire les prises de poste" ON public.prises_poste FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'operateur')
  OR gestionnaire_id = auth.uid() OR passation_a = auth.uid()
);
CREATE POLICY "Créer sa prise de poste" ON public.prises_poste FOR INSERT TO authenticated
  WITH CHECK (gestionnaire_id = auth.uid() AND public.has_role(auth.uid(),'gestionnaire_cles'));
CREATE POLICY "Modifier sa prise de poste" ON public.prises_poste FOR UPDATE TO authenticated
  USING (gestionnaire_id = auth.uid() OR passation_a = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (gestionnaire_id = auth.uid() OR passation_a = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_prises_poste_updated BEFORE UPDATE ON public.prises_poste FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUDIT LOG (immuable)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  contexte JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire l'audit" ON public.audit_log FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'conducteur') OR public.has_role(auth.uid(),'operateur') OR public.has_role(auth.uid(),'gestionnaire_cles')
);
CREATE POLICY "Insérer un événement d'audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
