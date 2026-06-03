DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.activity_logs;
CREATE POLICY "Active users can insert own logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.current_user_is_active());

DROP POLICY IF EXISTS "Anyone can view ingredient bases" ON public.ingredient_bases;
CREATE POLICY "Active users can view ingredient bases"
  ON public.ingredient_bases FOR SELECT TO authenticated
  USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Anyone can view version updates" ON public.version_updates;
CREATE POLICY "Active users can view version updates"
  ON public.version_updates FOR SELECT TO authenticated
  USING (public.current_user_is_active());

DROP POLICY IF EXISTS "Admins can update bill images" ON storage.objects;
CREATE POLICY "Admins can update bill images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bill-images' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)))
  WITH CHECK (bucket_id = 'bill-images' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_is_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_tax_invoice_seq(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_tax_invoice_seq(date) TO authenticated;