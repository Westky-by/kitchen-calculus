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

export const CATEGORIES = [
  { value: 'general', label: 'ทั่วไป (General)', icon: '' },
  { value: 'boil', label: '🥣 ต้ม (Boil/Soup)', icon: '🥣' },
  { value: 'stirfry', label: '🍳 ผัด (Stir-fry)', icon: '🍳' },
  { value: 'curry', label: '🥘 แกง (Curry)', icon: '🥘' },
  { value: 'deepfry', label: '🍗 ทอด (Deep Fry)', icon: '🍗' },
  { value: 'grill', label: '🔥 ย่าง/อบ (Grill/Bake)', icon: '🔥' },
  { value: 'salad', label: '🥗 ยำ/สลัด (Salad)', icon: '🥗' },
  { value: 'appetizer', label: '🍟 ของทานเล่น (Appetizer)', icon: '🍟' },
  { value: 'dessert', label: '🍰 ขนมหวาน (Dessert)', icon: '🍰' },
  { value: 'beverage', label: '🥤 เครื่องดื่ม (Beverage)', icon: '🥤' },
  { value: 'vegetarian', label: '🥦 มังสวิรัติ (Vegetarian)', icon: '🥦' },
  { value: 'jay', label: '🟡 เจ (Jay)', icon: '🟡' },
];

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
