
-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'อื่นๆ',
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  purchase_qty NUMERIC NOT NULL DEFAULT 1,
  purchase_unit TEXT NOT NULL DEFAULT 'Kg',
  yield_percent NUMERIC NOT NULL DEFAULT 100,
  yield_qty NUMERIC NOT NULL DEFAULT 0,
  usage_unit TEXT NOT NULL DEFAULT 'G',
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_categories table
CREATE TABLE public.recipe_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT '#94a3b8',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  code TEXT NOT NULL DEFAULT '',
  portion_size TEXT NOT NULL DEFAULT '1',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  overhead JSONB NOT NULL DEFAULT '{"packaging":0,"labor":0,"utilities":0,"misc":0}'::jsonb,
  raw_material_cost NUMERIC NOT NULL DEFAULT 0,
  q_factor NUMERIC NOT NULL DEFAULT 0,
  total_product_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_portion NUMERIC NOT NULL DEFAULT 0,
  target_fc_percent NUMERIC NOT NULL DEFAULT 30,
  suggested_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  service_charge NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  real_fc_percent NUMERIC NOT NULL DEFAULT 0,
  profit_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- For now, allow full public access (no auth yet)
-- These should be replaced with user-scoped policies when auth is added
CREATE POLICY "Allow full access to ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to recipe_categories" ON public.recipe_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.recipe_categories (id, value, label, icon, color, is_default, sort_order) VALUES
  (gen_random_uuid(), 'general', 'ทั่วไป (General)', '📋', '#94a3b8', true, 0),
  (gen_random_uuid(), 'boil', 'ต้ม (Boil/Soup)', '🥣', '#38bdf8', true, 1),
  (gen_random_uuid(), 'stirfry', 'ผัด (Stir-fry)', '🍳', '#fbbf24', true, 2),
  (gen_random_uuid(), 'curry', 'แกง (Curry)', '🥘', '#f97316', true, 3),
  (gen_random_uuid(), 'deepfry', 'ทอด (Deep Fry)', '🍗', '#a78bfa', true, 4),
  (gen_random_uuid(), 'grill', 'ย่าง/อบ (Grill/Bake)', '🔥', '#ef4444', true, 5),
  (gen_random_uuid(), 'salad', 'ยำ/สลัด (Salad)', '🥗', '#4ade80', true, 6),
  (gen_random_uuid(), 'appetizer', 'ของทานเล่น (Appetizer)', '🍟', '#facc15', true, 7),
  (gen_random_uuid(), 'dessert', 'ขนมหวาน (Dessert)', '🍰', '#f472b6', true, 8),
  (gen_random_uuid(), 'beverage', 'เครื่องดื่ม (Beverage)', '🥤', '#22d3ee', true, 9),
  (gen_random_uuid(), 'vegetarian', 'มังสวิรัติ (Vegetarian)', '🥦', '#22c55e', true, 10),
  (gen_random_uuid(), 'jay', 'เจ (Jay)', '🟡', '#eab308', true, 11);
