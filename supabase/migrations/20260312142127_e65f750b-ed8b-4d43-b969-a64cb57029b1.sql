
-- Asset categories table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#94a3b8',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to asset_categories" ON public.asset_categories
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default categories
INSERT INTO public.asset_categories (name, icon, color, sort_order) VALUES
  ('อุปกรณ์ครัว', '🍳', '#f59e0b', 1),
  ('เครื่องใช้ไฟฟ้า', '⚡', '#3b82f6', 2),
  ('ภาชนะ/จาน', '🍽️', '#10b981', 3),
  ('เฟอร์นิเจอร์', '🪑', '#8b5cf6', 4),
  ('ของใช้สิ้นเปลือง', '📦', '#ef4444', 5),
  ('อื่นๆ', '📋', '#94a3b8', 6);

-- Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'ดี',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to assets" ON public.assets
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
