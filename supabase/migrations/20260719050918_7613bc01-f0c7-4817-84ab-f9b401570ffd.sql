
-- Restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view ingredient bases" ON public.ingredient_bases;
CREATE POLICY "Authenticated can view ingredient bases"
ON public.ingredient_bases FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.ingredient_bases FROM anon;

DROP POLICY IF EXISTS "Anyone can view version updates" ON public.version_updates;
CREATE POLICY "Authenticated can view version updates"
ON public.version_updates FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.version_updates FROM anon;

-- Revoke public execute on SECURITY DEFINER function exposed via API
REVOKE ALL ON FUNCTION public.next_tax_invoice_seq(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_tax_invoice_seq(date) TO authenticated;
