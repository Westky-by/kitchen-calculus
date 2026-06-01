CREATE TABLE public.user_manuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'ทั่วไป',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_by_username TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_manuals TO authenticated;
GRANT ALL ON public.user_manuals TO service_role;

ALTER TABLE public.user_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can read manuals"
ON public.user_manuals FOR SELECT TO authenticated
USING (current_user_is_active());

CREATE POLICY "Admins can insert manuals"
ON public.user_manuals FOR INSERT TO authenticated
WITH CHECK (current_user_is_active() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Admins can update manuals"
ON public.user_manuals FOR UPDATE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Admins can delete manuals"
ON public.user_manuals FOR DELETE TO authenticated
USING (current_user_is_active() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TRIGGER update_user_manuals_updated_at
BEFORE UPDATE ON public.user_manuals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();