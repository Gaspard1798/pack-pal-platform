DROP POLICY IF EXISTS "Chantiers: conducteur can insert" ON public.chantiers;
CREATE POLICY "Chantiers: admin can insert" ON public.chantiers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));