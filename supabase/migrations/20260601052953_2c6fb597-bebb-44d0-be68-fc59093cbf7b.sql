
CREATE TABLE public.tax_invoice_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_invoice_email_recipients TO authenticated;
GRANT ALL ON public.tax_invoice_email_recipients TO service_role;

ALTER TABLE public.tax_invoice_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can read email recipients"
ON public.tax_invoice_email_recipients FOR SELECT TO authenticated
USING (current_user_is_active());

CREATE POLICY "Admins can insert email recipients"
ON public.tax_invoice_email_recipients FOR INSERT TO authenticated
WITH CHECK (current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Admins can update email recipients"
ON public.tax_invoice_email_recipients FOR UPDATE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Admins can delete email recipients"
ON public.tax_invoice_email_recipients FOR DELETE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));
