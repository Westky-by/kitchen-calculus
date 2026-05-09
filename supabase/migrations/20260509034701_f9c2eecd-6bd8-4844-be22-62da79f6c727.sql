
CREATE TABLE public.ingredient_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '🍽️',
  color text NOT NULL DEFAULT '#94a3b8',
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredient_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ingredient bases" ON public.ingredient_bases
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert ingredient bases" ON public.ingredient_bases
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update ingredient bases" ON public.ingredient_bases
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete ingredient bases" ON public.ingredient_bases
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

ALTER TABLE public.ingredients ADD COLUMN base_value text NOT NULL DEFAULT 'general';

INSERT INTO public.ingredient_bases (value, label, icon, color, sort_order, is_default) VALUES
  ('general', 'ทั่วไป (General)', '🍽️', '#94a3b8', 0, true),
  ('thai', 'ไทย (Thai)', '🇹🇭', '#ef4444', 1, true),
  ('japanese', 'ญี่ปุ่น (Japanese)', '🇯🇵', '#f472b6', 2, true),
  ('chinese', 'จีน (Chinese)', '🇨🇳', '#facc15', 3, true),
  ('western', 'ตะวันตก (Western)', '🍔', '#a78bfa', 4, true);
