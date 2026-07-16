
-- ============================================================
-- Fluxop — Phase sécurisation : split policies, no DELETE, trigger
-- ============================================================

-- ---------- 1. DEMANDES ----------
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Demandes: prestataire or conducteur update" ON public.demandes;
DROP POLICY IF EXISTS "Demandes: prestataire delete own" ON public.demandes;

-- Conducteur/admin can update any demande on their chantier
CREATE POLICY "Demandes: conducteur update"
ON public.demandes
FOR UPDATE
TO authenticated
USING (public.is_conducteur_of(auth.uid(), chantier_id))
WITH CHECK (public.is_conducteur_of(auth.uid(), chantier_id));

-- Prestataire can update ONLY his own demandes (column restrictions via trigger)
CREATE POLICY "Demandes: prestataire update own"
ON public.demandes
FOR UPDATE
TO authenticated
USING (prestataire_id = auth.uid())
WITH CHECK (prestataire_id = auth.uid());

-- Only admin can delete demandes (traceability via statut='annulee' for others)
CREATE POLICY "Demandes: admin delete"
ON public.demandes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger : bloquer les modifications sensibles côté prestataire
CREATE OR REPLACE FUNCTION public.protect_demande_prestataire()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si l'utilisateur est conducteur du chantier ou admin, tout est permis
  IF public.is_conducteur_of(auth.uid(), OLD.chantier_id) THEN
    RETURN NEW;
  END IF;

  -- Sinon : prestataire ne peut pas modifier ces champs
  IF NEW.chantier_id IS DISTINCT FROM OLD.chantier_id THEN
    RAISE EXCEPTION 'Modification du chantier interdite';
  END IF;
  IF NEW.prestataire_id IS DISTINCT FROM OLD.prestataire_id THEN
    RAISE EXCEPTION 'Modification du prestataire interdite';
  END IF;
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    -- Le prestataire ne peut passer sa demande qu'en 'annulee' (depuis en_cours ou modifiee),
    -- ou accepter/refuser une contre-proposition ('modifiee' -> 'acceptee'/'refusee')
    IF NOT (
      (NEW.statut = 'annulee' AND OLD.statut IN ('en_cours','modifiee'))
      OR (OLD.statut = 'modifiee' AND NEW.statut IN ('acceptee','refusee'))
    ) THEN
      RAISE EXCEPTION 'Changement de statut non autorisé pour un prestataire';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_demande_prestataire ON public.demandes;
CREATE TRIGGER trg_protect_demande_prestataire
BEFORE UPDATE ON public.demandes
FOR EACH ROW EXECUTE FUNCTION public.protect_demande_prestataire();

-- ---------- 2. VENUES (pointage terrain) ----------
DROP POLICY IF EXISTS "Venues: operateur or conducteur insert" ON public.venues;
DROP POLICY IF EXISTS "Venues: operateur or conducteur update" ON public.venues;

CREATE POLICY "Venues: terrain insert"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.demandes d
    WHERE d.id = venues.demande_id
      AND public.can_access_chantier(auth.uid(), d.chantier_id)
  )
  AND (
    public.has_role(auth.uid(), 'operateur')
    OR public.has_role(auth.uid(), 'conducteur')
    OR public.has_role(auth.uid(), 'gestionnaire_cles')
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Venues: terrain update"
ON public.venues
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.demandes d
    WHERE d.id = venues.demande_id
      AND public.can_access_chantier(auth.uid(), d.chantier_id)
  )
  AND (
    public.has_role(auth.uid(), 'operateur')
    OR public.has_role(auth.uid(), 'conducteur')
    OR public.has_role(auth.uid(), 'gestionnaire_cles')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- ---------- 3. NON-CONFORMITES (pas de suppression, sauf admin) ----------
DROP POLICY IF EXISTS "nc_delete" ON public.non_conformites;

CREATE POLICY "nc_delete_admin_only"
ON public.non_conformites
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------- 4. INTERVENTIONS (split ALL en INSERT/UPDATE, DELETE admin) ----------
DROP POLICY IF EXISTS "Modifier interventions" ON public.interventions;

CREATE POLICY "Interventions insert"
ON public.interventions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestionnaire_cles')
  OR public.has_role(auth.uid(), 'operateur')
  OR public.has_role(auth.uid(), 'conducteur')
);

CREATE POLICY "Interventions update"
ON public.interventions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestionnaire_cles')
  OR public.has_role(auth.uid(), 'operateur')
  OR public.has_role(auth.uid(), 'conducteur')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestionnaire_cles')
  OR public.has_role(auth.uid(), 'operateur')
  OR public.has_role(auth.uid(), 'conducteur')
);

CREATE POLICY "Interventions delete admin only"
ON public.interventions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
