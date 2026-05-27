
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'conducteur', 'prestataire', 'operateur');
CREATE TYPE public.demande_statut AS ENUM ('en_cours', 'acceptee', 'refusee', 'modifiee', 'terminee', 'annulee');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: view own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles: view own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- chantiers
CREATE TABLE public.chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT,
  description TEXT,
  date_debut DATE,
  date_fin DATE,
  conducteur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chantiers TO authenticated;
GRANT ALL ON public.chantiers TO service_role;
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;

-- chantier_members (rattachement prestataires/opérateurs)
CREATE TABLE public.chantier_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chantier_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chantier_members TO authenticated;
GRANT ALL ON public.chantier_members TO service_role;
ALTER TABLE public.chantier_members ENABLE ROW LEVEL SECURITY;

-- helper: is user member or conducteur of chantier
CREATE OR REPLACE FUNCTION public.can_access_chantier(_user_id UUID, _chantier_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chantiers WHERE id = _chantier_id AND conducteur_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.chantier_members WHERE chantier_id = _chantier_id AND user_id = _user_id
  ) OR public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_conducteur_of(_user_id UUID, _chantier_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chantiers WHERE id = _chantier_id AND conducteur_id = _user_id)
    OR public.has_role(_user_id, 'admin')
$$;

-- Chantiers policies
CREATE POLICY "Chantiers: view if accessible" ON public.chantiers FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), id));
CREATE POLICY "Chantiers: conducteur can insert" ON public.chantiers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = conducteur_id AND (public.has_role(auth.uid(), 'conducteur') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Chantiers: conducteur can update" ON public.chantiers FOR UPDATE TO authenticated
  USING (auth.uid() = conducteur_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Chantiers: conducteur can delete" ON public.chantiers FOR DELETE TO authenticated
  USING (auth.uid() = conducteur_id OR public.has_role(auth.uid(), 'admin'));

-- chantier_members policies
CREATE POLICY "Members: view if access" ON public.chantier_members FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id) OR user_id = auth.uid());
CREATE POLICY "Members: conducteur manage" ON public.chantier_members FOR INSERT TO authenticated
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));
CREATE POLICY "Members: conducteur delete" ON public.chantier_members FOR DELETE TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id));

-- aires
CREATE TABLE public.aires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  capacite INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aires TO authenticated;
GRANT ALL ON public.aires TO service_role;
ALTER TABLE public.aires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aires: view if access" ON public.aires FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id));
CREATE POLICY "Aires: conducteur manage" ON public.aires FOR ALL TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));

-- materiels
CREATE TABLE public.materiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT,
  quantite INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiels TO authenticated;
GRANT ALL ON public.materiels TO service_role;
ALTER TABLE public.materiels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materiels: view if access" ON public.materiels FOR SELECT TO authenticated
  USING (public.can_access_chantier(auth.uid(), chantier_id));
CREATE POLICY "Materiels: conducteur manage" ON public.materiels FOR ALL TO authenticated
  USING (public.is_conducteur_of(auth.uid(), chantier_id))
  WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));

-- demandes
CREATE TABLE public.demandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  prestataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aire_id UUID REFERENCES public.aires(id) ON DELETE SET NULL,
  debut TIMESTAMPTZ NOT NULL,
  duree_min INTEGER NOT NULL DEFAULT 30,
  nature TEXT NOT NULL,
  quantite NUMERIC,
  unite TEXT,
  statut public.demande_statut NOT NULL DEFAULT 'en_cours',
  commentaire TEXT,
  raison_refus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandes TO authenticated;
GRANT ALL ON public.demandes TO service_role;
ALTER TABLE public.demandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demandes: prestataire view own" ON public.demandes FOR SELECT TO authenticated
  USING (prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), chantier_id));
CREATE POLICY "Demandes: prestataire insert" ON public.demandes FOR INSERT TO authenticated
  WITH CHECK (prestataire_id = auth.uid() AND public.can_access_chantier(auth.uid(), chantier_id));
CREATE POLICY "Demandes: prestataire or conducteur update" ON public.demandes FOR UPDATE TO authenticated
  USING (prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), chantier_id));
CREATE POLICY "Demandes: prestataire delete own" ON public.demandes FOR DELETE TO authenticated
  USING (prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), chantier_id));

-- demande_materiels
CREATE TABLE public.demande_materiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID NOT NULL REFERENCES public.demandes(id) ON DELETE CASCADE,
  materiel_id UUID NOT NULL REFERENCES public.materiels(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 1,
  UNIQUE(demande_id, materiel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demande_materiels TO authenticated;
GRANT ALL ON public.demande_materiels TO service_role;
ALTER TABLE public.demande_materiels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DemandeMat: view via demande" ON public.demande_materiels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND (d.prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), d.chantier_id))));
CREATE POLICY "DemandeMat: manage via demande" ON public.demande_materiels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND (d.prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), d.chantier_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND (d.prestataire_id = auth.uid() OR public.is_conducteur_of(auth.uid(), d.chantier_id))));

-- venues (compte-rendu terrain)
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID NOT NULL REFERENCES public.demandes(id) ON DELETE CASCADE,
  arrivee_reelle TIMESTAMPTZ,
  depart_reel TIMESTAMPTZ,
  non_conformites TEXT[],
  commentaire TEXT,
  enregistre_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues: view via demande" ON public.venues FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND (d.prestataire_id = auth.uid() OR public.can_access_chantier(auth.uid(), d.chantier_id))));
CREATE POLICY "Venues: operateur or conducteur insert" ON public.venues FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND public.can_access_chantier(auth.uid(), d.chantier_id)));
CREATE POLICY "Venues: operateur or conducteur update" ON public.venues FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.demandes d WHERE d.id = demande_id
    AND public.can_access_chantier(auth.uid(), d.chantier_id)));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chantiers_updated BEFORE UPDATE ON public.chantiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_demandes_updated BEFORE UPDATE ON public.demandes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user: create profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'prestataire'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
