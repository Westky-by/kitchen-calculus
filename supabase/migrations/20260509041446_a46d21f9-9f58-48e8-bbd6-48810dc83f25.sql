-- 1) user_roles INSERT: admin can only insert role='user'; super_admin can insert any
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user role only"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role = 'user'::app_role);

-- 2) profiles SELECT: own row, or admins/super_admins see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile; admins view all"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3) storage: tighten asset-images writes/updates/deletes to admins only
DROP POLICY IF EXISTS "Authenticated users can upload asset images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update asset images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete asset images" ON storage.objects;

CREATE POLICY "Admins can upload asset images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'asset-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins can update asset images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'asset-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins can delete asset images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'asset-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);