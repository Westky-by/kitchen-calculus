
-- Add creator_code (2 digits) to profiles for tax invoice numbering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_code text NOT NULL DEFAULT '00';

-- Tax invoices table
CREATE TABLE IF NOT EXISTS public.tax_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number text NOT NULL UNIQUE,
  creator_code text NOT NULL,
  doc_date date NOT NULL,
  daily_seq integer NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  customer_tax_id text NOT NULL DEFAULT '',
  branch_type text NOT NULL DEFAULT 'head',
  branch_no text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  amount_after_discount numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  amount_text text NOT NULL DEFAULT '',
  payment_method jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  is_backdated boolean NOT NULL DEFAULT false,
  backdate_note text NOT NULL DEFAULT '',
  source_image_url text NOT NULL DEFAULT '',
  created_by uuid,
  created_by_username text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_invoices TO authenticated;
GRANT ALL ON public.tax_invoices TO service_role;

ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view tax invoices"
ON public.tax_invoices FOR SELECT TO authenticated
USING (current_user_is_active());

CREATE POLICY "Active users can insert tax invoices"
ON public.tax_invoices FOR INSERT TO authenticated
WITH CHECK (current_user_is_active());

CREATE POLICY "Admins can update tax invoices"
ON public.tax_invoices FOR UPDATE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Admins can delete tax invoices"
ON public.tax_invoices FOR DELETE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE TRIGGER trg_tax_invoices_updated
BEFORE UPDATE ON public.tax_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tax_invoices_date ON public.tax_invoices(doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_created_at ON public.tax_invoices(created_at DESC);

-- Function: generate next daily sequence for a given date
CREATE OR REPLACE FUNCTION public.next_tax_invoice_seq(_doc_date date)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(daily_seq), 0) + 1
  FROM public.tax_invoices
  WHERE doc_date = _doc_date;
$$;

GRANT EXECUTE ON FUNCTION public.next_tax_invoice_seq(date) TO authenticated;
