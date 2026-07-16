
CREATE TABLE public.non_conformites (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers(id) on delete cascade,
  logement_id uuid references public.logements(id) on delete set null,
  intervention_id uuid references public.interventions(id) on delete set null,
  trousseau_id uuid references public.trousseaux(id) on delete set null,
  categorie text not null check (categorie in ('securite','cle','logement','proprete','autre')),
  gravite text not null default 'mineure' check (gravite in ('mineure','majeure','critique','bloquante')),
  statut text not null default 'ouverte' check (statut in ('ouverte','en_cours','resolue','cloturee')),
  titre text not null,
  description text,
  photos text[] not null default '{}',
  cree_par uuid references auth.users(id) on delete set null,
  resolue_par uuid references auth.users(id) on delete set null,
  resolution text,
  resolue_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.non_conformites TO authenticated;
GRANT ALL ON public.non_conformites TO service_role;

ALTER TABLE public.non_conformites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nc_select" ON public.non_conformites FOR SELECT TO authenticated
USING (public.can_access_chantier(auth.uid(), chantier_id));

CREATE POLICY "nc_insert" ON public.non_conformites FOR INSERT TO authenticated
WITH CHECK (public.can_access_chantier(auth.uid(), chantier_id));

CREATE POLICY "nc_update" ON public.non_conformites FOR UPDATE TO authenticated
USING (public.can_access_chantier(auth.uid(), chantier_id))
WITH CHECK (public.can_access_chantier(auth.uid(), chantier_id));

CREATE POLICY "nc_delete" ON public.non_conformites FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_conducteur_of(auth.uid(), chantier_id));

CREATE TRIGGER trg_nc_updated_at BEFORE UPDATE ON public.non_conformites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_nc_chantier ON public.non_conformites(chantier_id);
CREATE INDEX idx_nc_statut ON public.non_conformites(statut);
CREATE INDEX idx_nc_logement ON public.non_conformites(logement_id);
