ALTER TABLE public.venues ADD COLUMN photos TEXT[];

INSERT INTO storage.buckets (id, name, public) VALUES ('venue-photos', 'venue-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "VenuePhotos: view if chantier access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'venue-photos'
  AND EXISTS (
    SELECT 1 FROM public.demandes d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND public.can_access_chantier(auth.uid(), d.chantier_id)
  )
);

CREATE POLICY "VenuePhotos: upload if chantier access"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'venue-photos'
  AND EXISTS (
    SELECT 1 FROM public.demandes d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND public.can_access_chantier(auth.uid(), d.chantier_id)
  )
);

CREATE POLICY "VenuePhotos: delete if chantier access"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'venue-photos'
  AND EXISTS (
    SELECT 1 FROM public.demandes d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND public.can_access_chantier(auth.uid(), d.chantier_id)
  )
);