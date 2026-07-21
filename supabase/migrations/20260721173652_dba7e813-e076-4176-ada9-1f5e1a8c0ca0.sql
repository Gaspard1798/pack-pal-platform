
CREATE POLICY "pub_att_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'publication-attachments'
  AND public.can_access_chantier(auth.uid(), (storage.foldername(name))[1]::uuid)
);
CREATE POLICY "pub_att_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'publication-attachments'
  AND public.is_conducteur_of(auth.uid(), (storage.foldername(name))[1]::uuid)
);
CREATE POLICY "pub_att_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'publication-attachments'
  AND public.is_conducteur_of(auth.uid(), (storage.foldername(name))[1]::uuid)
);
CREATE POLICY "pub_att_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'publication-attachments'
  AND public.is_conducteur_of(auth.uid(), (storage.foldername(name))[1]::uuid)
);
