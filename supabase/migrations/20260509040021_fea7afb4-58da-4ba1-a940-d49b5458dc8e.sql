CREATE TABLE public.version_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_by_username text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.version_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view version updates"
ON public.version_updates FOR SELECT
USING (true);

CREATE POLICY "Admins can insert version updates"
ON public.version_updates FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update version updates"
ON public.version_updates FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete version updates"
ON public.version_updates FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));