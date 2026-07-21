
-- Enums
CREATE TYPE public.publication_priorite AS ENUM ('information','important','urgent');
CREATE TYPE public.publication_zone_type AS ENUM ('chantier','batiment','bloc','niveau','zone_libre');
CREATE TYPE public.publication_dest_type AS ENUM ('toutes','entreprises','corps_etat','fournisseurs','transporteurs','equipes_internes');

-- Categories
CREATE TABLE public.publication_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'Info',
  ordre INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_categories TO authenticated;
GRANT ALL ON public.publication_categories TO service_role;
ALTER TABLE public.publication_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select_auth" ON public.publication_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_ins_conduc" ON public.publication_categories FOR INSERT TO authenticated
  WITH CHECK (chantier_id IS NULL AND public.has_role(auth.uid(),'admin')
    OR (chantier_id IS NOT NULL AND public.is_conducteur_of(auth.uid(), chantier_id)));
CREATE POLICY "cat_upd_conduc" ON public.publication_categories FOR UPDATE TO authenticated
  USING (chantier_id IS NULL AND public.has_role(auth.uid(),'admin')
    OR (chantier_id IS NOT NULL AND public.is_conducteur_of(auth.uid(), chantier_id)));
CREATE POLICY "cat_del_conduc" ON public.publication_categories FOR DELETE TO authenticated
  USING (chantier_id IS NULL AND public.has_role(auth.uid(),'admin')
    OR (chantier_id IS NOT NULL AND public.is_conducteur_of(auth.uid(), chantier_id)));

-- Seed default categories (global, chantier_id NULL)
INSERT INTO public.publication_categories (nom, icone, ordre, is_default) VALUES
  ('Information générale','Info',10,true),
  ('Logistique','Truck',20,true),
  ('Sécurité','ShieldAlert',30,true),
  ('Planning','Calendar',40,true),
  ('Circulation','TrafficCone',50,true),
  ('Accès chantier','DoorOpen',60,true),
  ('Livraison','PackageOpen',70,true),
  ('Levage','ArrowUpFromLine',80,true),
  ('Coupure électrique','Zap',90,true),
  ('Coupure d''eau','Droplet',100,true),
  ('Intempéries','CloudRain',110,true),
  ('Qualité','BadgeCheck',120,true),
  ('OPR','ClipboardCheck',130,true),
  ('Livraison logements','Home',140,true),
  ('Réunion','Users',150,true),
  ('Autre','MoreHorizontal',160,true);

-- Publications
CREATE TABLE public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES auth.users(id),
  titre TEXT NOT NULL,
  description TEXT,
  resume TEXT,
  category_id UUID REFERENCES public.publication_categories(id) ON DELETE SET NULL,
  priorite publication_priorite NOT NULL DEFAULT 'information',
  zone_type publication_zone_type NOT NULL DEFAULT 'chantier',
  zone_ref_id UUID,
  zone_libre TEXT,
  destinataires_type publication_dest_type NOT NULL DEFAULT 'toutes',
  corps_etat TEXT,
  date_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin TIMESTAMPTZ,
  epingle BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'publication',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_select_members" ON public.publications FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id));
CREATE POLICY "pub_ins_conduc" ON public.publications FOR INSERT TO authenticated
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id) AND auteur_id = auth.uid());
CREATE POLICY "pub_upd_conduc" ON public.publications FOR UPDATE TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id));
CREATE POLICY "pub_del_conduc" ON public.publications FOR DELETE TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id));

CREATE TRIGGER trg_pub_updated BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_pub_chantier_date ON public.publications(chantier_id, date_debut DESC);
CREATE INDEX idx_pub_epingle ON public.publications(chantier_id, epingle) WHERE epingle;

-- Publication - entreprises (ciblage)
CREATE TABLE public.publication_entreprises (
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, entreprise_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_entreprises TO authenticated;
GRANT ALL ON public.publication_entreprises TO service_role;
ALTER TABLE public.publication_entreprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pe_select" ON public.publication_entreprises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.can_access_chantier(auth.uid(), p.chantier_id)));
CREATE POLICY "pe_write_conduc" ON public.publication_entreprises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.is_conducteur_of(auth.uid(), p.chantier_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.is_conducteur_of(auth.uid(), p.chantier_id)));

-- Pièces jointes
CREATE TABLE public.publication_pieces_jointes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  taille BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_pieces_jointes TO authenticated;
GRANT ALL ON public.publication_pieces_jointes TO service_role;
ALTER TABLE public.publication_pieces_jointes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppj_select" ON public.publication_pieces_jointes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.can_access_chantier(auth.uid(), p.chantier_id)));
CREATE POLICY "ppj_write_conduc" ON public.publication_pieces_jointes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.is_conducteur_of(auth.uid(), p.chantier_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.publications p WHERE p.id = publication_id
    AND public.is_conducteur_of(auth.uid(), p.chantier_id)));

-- Settings par chantier
CREATE TABLE public.publication_settings (
  chantier_id UUID PRIMARY KEY REFERENCES public.chantiers(id) ON DELETE CASCADE,
  duree_validite_defaut_jours INT NOT NULL DEFAULT 30,
  couleurs_priorite JSONB NOT NULL DEFAULT '{"information":"#64748b","important":"#f59e0b","urgent":"#ef4444"}'::jsonb,
  modeles JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_settings TO authenticated;
GRANT ALL ON public.publication_settings TO service_role;
ALTER TABLE public.publication_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select" ON public.publication_settings FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id));
CREATE POLICY "ps_write_conduc" ON public.publication_settings FOR ALL TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));

CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.publication_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications trigger : à la création, notifier les membres du chantier
CREATE OR REPLACE FUNCTION public.notify_publication_creee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nom TEXT; _prio TEXT;
BEGIN
  SELECT nom INTO _nom FROM public.chantiers WHERE id = NEW.chantier_id;
  _prio := CASE NEW.priorite WHEN 'urgent' THEN '[URGENT] ' WHEN 'important' THEN '[Important] ' ELSE '' END;

  INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id)
  SELECT DISTINCT cm.user_id, 'publication_creee', _prio || NEW.titre,
    'Nouvelle publication sur ' || COALESCE(_nom,'un chantier'),
    '/informations/' || NEW.id::text, NEW.chantier_id
  FROM public.chantier_members cm
  WHERE cm.chantier_id = NEW.chantier_id AND cm.user_id <> NEW.auteur_id
    AND (
      NEW.destinataires_type = 'toutes'
      OR (NEW.destinataires_type = 'entreprises' AND EXISTS (
        SELECT 1 FROM public.publication_entreprises pe
        JOIN public.profiles pr ON pr.id = cm.user_id
        WHERE pe.publication_id = NEW.id AND pe.entreprise_id = pr.entreprise_id
      ))
    );

  -- also notify the conducteur
  INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id)
  SELECT c.conducteur_id, 'publication_creee', _prio || NEW.titre,
    'Nouvelle publication sur ' || COALESCE(_nom,'un chantier'),
    '/informations/' || NEW.id::text, NEW.chantier_id
  FROM public.chantiers c
  WHERE c.id = NEW.chantier_id AND c.conducteur_id IS NOT NULL AND c.conducteur_id <> NEW.auteur_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_pub_creee AFTER INSERT ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.notify_publication_creee();
