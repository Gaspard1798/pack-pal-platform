
-- Types
CREATE TYPE public.contenant_type AS ENUM ('benne', 'bac', 'bigbag');
CREATE TYPE public.dechet_type AS ENUM ('dib', 'gravats', 'tri', 'did');
CREATE TYPE public.rotation_operation AS ENUM ('pose', 'rotation', 'enlevement');
CREATE TYPE public.rotation_statut AS ENUM ('en_cours', 'acceptee', 'refusee', 'terminee', 'annulee');

-- Contenants installés sur un chantier
CREATE TABLE public.contenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  type contenant_type NOT NULL,
  volume_m3 NUMERIC,
  type_dechet dechet_type NOT NULL,
  reference TEXT NOT NULL,
  emplacement TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contenants TO authenticated;
GRANT ALL ON public.contenants TO service_role;
ALTER TABLE public.contenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contenants_select" ON public.contenants FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id) OR public.has_role(auth.uid(), 'prestataire') OR public.has_role(auth.uid(), 'operateur'));
CREATE POLICY "contenants_write_conducteur" ON public.contenants FOR ALL TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));

CREATE TRIGGER contenants_updated_at BEFORE UPDATE ON public.contenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Rotations
CREATE TABLE public.rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  contenant_id UUID REFERENCES public.contenants(id) ON DELETE SET NULL,
  prestataire_id UUID NOT NULL,
  type_operation rotation_operation NOT NULL DEFAULT 'rotation',
  type_dechet dechet_type NOT NULL,
  contenant_type contenant_type NOT NULL,
  volume_m3 NUMERIC,
  debut TIMESTAMPTZ NOT NULL,
  duree_min INT NOT NULL DEFAULT 20,
  aire_id UUID REFERENCES public.aires(id) ON DELETE SET NULL,
  statut rotation_statut NOT NULL DEFAULT 'en_cours',
  commentaire TEXT,
  raison_refus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotations TO authenticated;
GRANT ALL ON public.rotations TO service_role;
ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;

-- Prestataire voit ses propres rotations ; conducteur/admin/operateur voient celles du chantier accessible
CREATE POLICY "rotations_select" ON public.rotations FOR SELECT TO authenticated
  USING (
    prestataire_id = auth.uid()
    OR public.can_access_chantier(auth.uid(), chantier_id)
    OR public.has_role(auth.uid(), 'operateur')
  );
CREATE POLICY "rotations_insert" ON public.rotations FOR INSERT TO authenticated
  WITH CHECK (
    prestataire_id = auth.uid() AND (
      public.has_role(auth.uid(), 'prestataire')
      OR public.is_conducteur_of(auth.uid(), chantier_id)
    )
  );
CREATE POLICY "rotations_update_owner" ON public.rotations FOR UPDATE TO authenticated
  USING (prestataire_id = auth.uid() AND statut = 'en_cours')
  WITH CHECK (prestataire_id = auth.uid());
CREATE POLICY "rotations_update_conducteur" ON public.rotations FOR UPDATE TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));
CREATE POLICY "rotations_delete_owner" ON public.rotations FOR DELETE TO authenticated
  USING (prestataire_id = auth.uid() AND statut = 'en_cours');

CREATE TRIGGER rotations_updated_at BEFORE UPDATE ON public.rotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validations terrain
CREATE TABLE public.rotation_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id UUID NOT NULL REFERENCES public.rotations(id) ON DELETE CASCADE,
  effectuee_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  validee_par UUID,
  poids_estime_kg NUMERIC,
  commentaire TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotation_validations TO authenticated;
GRANT ALL ON public.rotation_validations TO service_role;
ALTER TABLE public.rotation_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_val_select" ON public.rotation_validations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.rotations r WHERE r.id = rotation_id AND (
      r.prestataire_id = auth.uid()
      OR public.can_access_chantier(auth.uid(), r.chantier_id)
      OR public.has_role(auth.uid(), 'operateur')
    ))
  );
CREATE POLICY "rotation_val_write" ON public.rotation_validations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'operateur')
    OR public.has_role(auth.uid(), 'conducteur')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Notifications on rotation status change
CREATE OR REPLACE FUNCTION public.notify_rotation_statut()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label TEXT;
BEGIN
  IF NEW.statut = OLD.statut THEN RETURN NEW; END IF;
  _label := CASE NEW.statut
    WHEN 'acceptee' THEN 'acceptée' WHEN 'refusee' THEN 'refusée'
    WHEN 'terminee' THEN 'terminée' WHEN 'annulee' THEN 'annulée'
    ELSE NEW.statut::text END;
  IF NEW.statut IN ('acceptee','refusee','terminee') THEN
    INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id)
    VALUES (NEW.prestataire_id, 'rotation_statut', 'Rotation ' || _label,
      'Votre rotation de ' || NEW.contenant_type::text || ' est ' || _label ||
      CASE WHEN NEW.statut='refusee' AND NEW.raison_refus IS NOT NULL THEN '. Motif : '||NEW.raison_refus ELSE '' END,
      '/dechets', NEW.chantier_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rotations_notify_statut AFTER UPDATE ON public.rotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_rotation_statut();

CREATE OR REPLACE FUNCTION public.notify_rotation_creee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _conducteur UUID; _nom TEXT;
BEGIN
  SELECT conducteur_id, nom INTO _conducteur, _nom FROM public.chantiers WHERE id = NEW.chantier_id;
  IF _conducteur IS NOT NULL AND _conducteur <> NEW.prestataire_id THEN
    INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id)
    VALUES (_conducteur, 'rotation_creee', 'Nouvelle demande de rotation',
      'Rotation ' || NEW.contenant_type::text || ' (' || NEW.type_dechet::text || ') demandée sur ' || COALESCE(_nom,'un chantier'),
      '/dechets', NEW.chantier_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rotations_notify_creee AFTER INSERT ON public.rotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_rotation_creee();

CREATE INDEX idx_rotations_chantier_debut ON public.rotations(chantier_id, debut);
CREATE INDEX idx_contenants_chantier ON public.contenants(chantier_id);
