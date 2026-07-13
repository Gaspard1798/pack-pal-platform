
TRUNCATE TABLE public.venues, public.demande_materiels, public.demandes, public.materiels, public.aires, public.chantier_members, public.chantiers, public.notifications, public.user_roles, public.profiles RESTART IDENTITY CASCADE;
DELETE FROM auth.users;
