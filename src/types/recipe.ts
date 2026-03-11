export interface Ingredient {
  id: string;
  code: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseQty: number;
  purchaseUnit: string;
  yieldPercent: number;
  yieldQty: number;
  usageUnit: string;
  costPerUnit: number;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  qty: number;
  unit: string;
  yieldPercent: number;
  yieldQty: number;
  costPerUnit: number;
  totalCost: number;
}

export interface OverheadCosts {
  packaging: number;
  labor: number;
  utilities: number;
  misc: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  code: string;
  portionSize: string;
  ingredients: RecipeIngredient[];
  overhead: OverheadCosts;
  rawMaterialCost: number;
  qFactor: number;
  totalProductCost: number;
  costPerPortion: number;
  targetFCPercent: number;
  suggestedPrice: number;
  sellingPrice: number;
  serviceCharge: number;
  vat: number;
  grandTotal: number;
  realFCPercent: number;
  profitPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCategory {
  id: string;
  value: string;
  label: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export const DEFAULT_CATEGORIES: RecipeCategory[] = [
  { id: 'cat-general', value: 'general', label: 'ทั่วไป (General)', icon: '📋', color: '#94a3b8', isDefault: true },
  { id: 'cat-boil', value: 'boil', label: 'ต้ม (Boil/Soup)', icon: '🥣', color: '#38bdf8', isDefault: true },
  { id: 'cat-stirfry', value: 'stirfry', label: 'ผัด (Stir-fry)', icon: '🍳', color: '#fbbf24', isDefault: true },
  { id: 'cat-curry', value: 'curry', label: 'แกง (Curry)', icon: '🥘', color: '#f97316', isDefault: true },
  { id: 'cat-deepfry', value: 'deepfry', label: 'ทอด (Deep Fry)', icon: '🍗', color: '#a78bfa', isDefault: true },
  { id: 'cat-grill', value: 'grill', label: 'ย่าง/อบ (Grill/Bake)', icon: '🔥', color: '#ef4444', isDefault: true },
  { id: 'cat-salad', value: 'salad', label: 'ยำ/สลัด (Salad)', icon: '🥗', color: '#4ade80', isDefault: true },
  { id: 'cat-appetizer', value: 'appetizer', label: 'ของทานเล่น (Appetizer)', icon: '🍟', color: '#facc15', isDefault: true },
  { id: 'cat-dessert', value: 'dessert', label: 'ขนมหวาน (Dessert)', icon: '🍰', color: '#f472b6', isDefault: true },
  { id: 'cat-beverage', value: 'beverage', label: 'เครื่องดื่ม (Beverage)', icon: '🥤', color: '#22d3ee', isDefault: true },
  { id: 'cat-vegetarian', value: 'vegetarian', label: 'มังสวิรัติ (Vegetarian)', icon: '🥦', color: '#22c55e', isDefault: true },
  { id: 'cat-jay', value: 'jay', label: 'เจ (Jay)', icon: '🟡', color: '#eab308', isDefault: true },
];

// Keep backward compatibility
export const CATEGORIES = DEFAULT_CATEGORIES;

export const INGREDIENT_CATEGORIES = [
  'เนื้อสัตว์', 'อาหารทะเล', 'ผัก/ผลไม้', 'เครื่องปรุง', 'แป้ง/ธัญพืช',
  'นม/ไข่', 'น้ำมัน/ไขมัน', 'เครื่องเทศ', 'ซอส', 'อื่นๆ'
];

export const UNITS = ['Kg', 'G', 'Ml', 'Lt', 'Pcs.', 'Both', 'อื่นๆ'];

export const PORTION_SIZES = [
  { value: '1', label: '1 Standard' },
  { value: '2', label: '2 Middle' },
  { value: '3', label: '3 Big' },
];

export const Q_FACTOR_PERCENT = 15;
export const SERVICE_CHARGE_PERCENT = 10;
export const VAT_PERCENT = 7;
