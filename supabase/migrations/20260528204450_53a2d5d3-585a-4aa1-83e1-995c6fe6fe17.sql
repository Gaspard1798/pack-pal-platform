CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  titre TEXT NOT NULL,
  message TEXT,
  lien TEXT,
  chantier_id UUID,
  demande_id UUID,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: view own"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Notifications: update own"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user ON public.notifications (user_id, lu, created_at DESC);

-- Notify conducteur on new demande
CREATE OR REPLACE FUNCTION public.notify_demande_creee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conducteur UUID;
  _nom TEXT;
BEGIN
  SELECT conducteur_id, nom INTO _conducteur, _nom
  FROM public.chantiers WHERE id = NEW.chantier_id;

  IF _conducteur IS NOT NULL AND _conducteur <> NEW.prestataire_id THEN
    INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id, demande_id)
    VALUES (
      _conducteur,
      'demande_creee',
      'Nouvelle demande de créneau',
      'Une demande "' || NEW.nature || '" a été déposée sur ' || COALESCE(_nom, 'un chantier') || '.',
      '/demandes',
      NEW.chantier_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_demande_creee
AFTER INSERT ON public.demandes
FOR EACH ROW EXECUTE FUNCTION public.notify_demande_creee();

-- Notify prestataire on statut change
CREATE OR REPLACE FUNCTION public.notify_demande_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _label TEXT;
BEGIN
  IF NEW.statut = OLD.statut THEN
    RETURN NEW;
  END IF;

  _label := CASE NEW.statut
    WHEN 'acceptee' THEN 'acceptée'
    WHEN 'refusee' THEN 'refusée'
    WHEN 'modifiee' THEN 'modifiée (contre-proposition)'
    WHEN 'terminee' THEN 'terminée'
    WHEN 'annulee' THEN 'annulée'
    ELSE NEW.statut::text
  END;

  IF NEW.statut IN ('acceptee', 'refusee', 'modifiee', 'terminee') THEN
    INSERT INTO public.notifications (user_id, type, titre, message, lien, chantier_id, demande_id)
    VALUES (
      NEW.prestataire_id,
      'demande_statut',
      'Demande ' || _label,
      'Votre demande "' || NEW.nature || '" est désormais ' || _label || '.'
        || CASE WHEN NEW.statut = 'refusee' AND NEW.raison_refus IS NOT NULL
                THEN ' Motif : ' || NEW.raison_refus ELSE '' END,
      '/demandes',
      NEW.chantier_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_demande_statut
AFTER UPDATE ON public.demandes
FOR EACH ROW EXECUTE FUNCTION public.notify_demande_statut();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;