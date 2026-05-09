-- Helper: check current user is active
CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_is_active() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_user_is_active() TO authenticated;

-- ==== ingredients ====
DROP POLICY IF EXISTS "Allow full access to ingredients" ON public.ingredients;
CREATE POLICY "Active authenticated users can access ingredients"
ON public.ingredients FOR ALL TO authenticated
USING (public.current_user_is_active())
WITH CHECK (public.current_user_is_active());

-- ==== recipes ====
DROP POLICY IF EXISTS "Allow full access to recipes" ON public.recipes;
CREATE POLICY "Active authenticated users can access recipes"
ON public.recipes FOR ALL TO authenticated
USING (public.current_user_is_active())
WITH CHECK (public.current_user_is_active());

-- ==== recipe_categories ====
DROP POLICY IF EXISTS "Allow full access to recipe_categories" ON public.recipe_categories;
CREATE POLICY "Active users can read recipe categories"
ON public.recipe_categories FOR SELECT TO authenticated
USING (public.current_user_is_active());
CREATE POLICY "Admins can modify recipe categories"
ON public.recipe_categories FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY "Admins can update recipe categories"
ON public.recipe_categories FOR UPDATE TO authenticated
USING (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY "Admins can delete recipe categories"
ON public.recipe_categories FOR DELETE TO authenticated
USING (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

-- ==== assets ====
DROP POLICY IF EXISTS "Allow full access to assets" ON public.assets;
CREATE POLICY "Active authenticated users can access assets"
ON public.assets FOR ALL TO authenticated
USING (public.current_user_is_active())
WITH CHECK (public.current_user_is_active());

-- ==== asset_categories ====
DROP POLICY IF EXISTS "Allow full access to asset_categories" ON public.asset_categories;
CREATE POLICY "Active users can read asset categories"
ON public.asset_categories FOR SELECT TO authenticated
USING (public.current_user_is_active());
CREATE POLICY "Admins can insert asset categories"
ON public.asset_categories FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY "Admins can update asset categories"
ON public.asset_categories FOR UPDATE TO authenticated
USING (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY "Admins can delete asset categories"
ON public.asset_categories FOR DELETE TO authenticated
USING (public.current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

-- ==== user_roles: restrict SELECT to own row or admins ====
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Users can view own role; admins view all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));