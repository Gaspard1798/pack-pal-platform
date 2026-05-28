
-- Admins can view all profiles
CREATE POLICY "Profiles: admin view all"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all user_roles
CREATE POLICY "Roles: admin view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert roles
CREATE POLICY "Roles: admin insert"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete roles
CREATE POLICY "Roles: admin delete"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
