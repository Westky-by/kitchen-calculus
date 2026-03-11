import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Ingredient, Recipe, RecipeCategory, RecipeIngredient, OverheadCosts } from '@/types/recipe';
import { toast } from 'sonner';

// --- Mappers: DB row <-> App type ---

function dbToIngredient(row: any): Ingredient {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    purchasePrice: Number(row.purchase_price),
    purchaseQty: Number(row.purchase_qty),
    purchaseUnit: row.purchase_unit,
    yieldPercent: Number(row.yield_percent),
    yieldQty: Number(row.yield_qty),
    usageUnit: row.usage_unit,
    costPerUnit: Number(row.cost_per_unit),
  };
}

function ingredientToDb(ing: Ingredient) {
  return {
    id: ing.id,
    code: ing.code,
    name: ing.name,
    category: ing.category,
    purchase_price: ing.purchasePrice,
    purchase_qty: ing.purchaseQty,
    purchase_unit: ing.purchaseUnit,
    yield_percent: ing.yieldPercent,
    yield_qty: ing.yieldQty,
    usage_unit: ing.usageUnit,
    cost_per_unit: ing.costPerUnit,
  };
}

function dbToRecipe(row: any): Recipe {
  const overhead = (typeof row.overhead === 'string' ? JSON.parse(row.overhead) : row.overhead) as OverheadCosts;
  const ingredients = (typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients) as RecipeIngredient[];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    code: row.code,
    portionSize: row.portion_size,
    ingredients,
    overhead,
    rawMaterialCost: Number(row.raw_material_cost),
    qFactor: Number(row.q_factor),
    totalProductCost: Number(row.total_product_cost),
    costPerPortion: Number(row.cost_per_portion),
    targetFCPercent: Number(row.target_fc_percent),
    suggestedPrice: Number(row.suggested_price),
    sellingPrice: Number(row.selling_price),
    serviceCharge: Number(row.service_charge),
    vat: Number(row.vat),
    grandTotal: Number(row.grand_total),
    realFCPercent: Number(row.real_fc_percent),
    profitPercent: Number(row.profit_percent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recipeToDb(r: Recipe) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    code: r.code,
    portion_size: r.portionSize,
    ingredients: r.ingredients as unknown as any,
    overhead: r.overhead as unknown as any,
    raw_material_cost: r.rawMaterialCost,
    q_factor: r.qFactor,
    total_product_cost: r.totalProductCost,
    cost_per_portion: r.costPerPortion,
    target_fc_percent: r.targetFCPercent,
    suggested_price: r.suggestedPrice,
    selling_price: r.sellingPrice,
    service_charge: r.serviceCharge,
    vat: r.vat,
    grand_total: r.grandTotal,
    real_fc_percent: r.realFCPercent,
    profit_percent: r.profitPercent,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function dbToCategory(row: any): RecipeCategory {
  return {
    id: row.id,
    value: row.value,
    label: row.label,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
  };
}

function categoryToDb(c: RecipeCategory, sortOrder: number) {
  return {
    id: c.id,
    value: c.value,
    label: c.label,
    icon: c.icon,
    color: c.color,
    is_default: c.isDefault ?? false,
    sort_order: sortOrder,
  };
}

// --- Hook ---

export function useSupabaseData() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [ingRes, recRes, catRes] = await Promise.all([
        supabase.from('ingredients').select('*').order('created_at'),
        supabase.from('recipes').select('*').order('created_at'),
        supabase.from('recipe_categories').select('*').order('sort_order'),
      ]);
      if (ingRes.data) setIngredients(ingRes.data.map(dbToIngredient));
      if (recRes.data) setRecipes(recRes.data.map(dbToRecipe));
      if (catRes.data) setCategories(catRes.data.map(dbToCategory));
      setLoading(false);
    };
    fetchAll();
  }, []);

  // --- Ingredients ---
  const saveIngredient = useCallback(async (ingredient: Ingredient) => {
    const dbData = ingredientToDb(ingredient);
    const { error } = await supabase.from('ingredients').upsert(dbData);
    if (error) { toast.error('บันทึกวัตถุดิบไม่สำเร็จ: ' + error.message); return; }
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === ingredient.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = ingredient; return u; }
      return [...prev, ingredient];
    });
    toast.success('บันทึกวัตถุดิบเรียบร้อย!');
  }, []);

  const deleteIngredient = useCallback(async (id: string) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) { toast.error('ลบวัตถุดิบไม่สำเร็จ'); return; }
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    toast.success('ลบวัตถุดิบเรียบร้อย');
  }, []);

  const bulkImportIngredients = useCallback(async (imported: Ingredient[]) => {
    const dbData = imported.map(ingredientToDb);
    const { error } = await supabase.from('ingredients').upsert(dbData);
    if (error) { toast.error('นำเข้าข้อมูลไม่สำเร็จ: ' + error.message); return; }
    setIngredients((prev) => [...prev, ...imported]);
    toast.success(`นำเข้า ${imported.length} รายการเรียบร้อย!`);
  }, []);

  // --- Recipes ---
  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const dbData = recipeToDb(recipe);
    const { error } = await supabase.from('recipes').upsert(dbData);
    if (error) { toast.error('บันทึกสูตรไม่สำเร็จ: ' + error.message); return; }
    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = recipe; return u; }
      return [...prev, recipe];
    });
    toast.success('บันทึกสูตรเรียบร้อย!');
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) { toast.error('ลบสูตรไม่สำเร็จ'); return; }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    toast.success('ลบสูตรเรียบร้อย');
  }, []);

  // --- Categories ---
  const saveCategory = useCallback(async (category: RecipeCategory) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === category.id);
      let newList: RecipeCategory[];
      if (idx >= 0) { newList = [...prev]; newList[idx] = category; }
      else { newList = [...prev, category]; }
      // Persist with sort_order
      const dbData = categoryToDb(category, idx >= 0 ? idx : newList.length - 1);
      supabase.from('recipe_categories').upsert(dbData).then(({ error }) => {
        if (error) toast.error('บันทึกหมวดหมู่ไม่สำเร็จ');
      });
      return newList;
    });
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('recipe_categories').delete().eq('id', id);
    if (error) { toast.error('ลบหมวดหมู่ไม่สำเร็จ'); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorderCategories = useCallback(async (newCategories: RecipeCategory[]) => {
    setCategories(newCategories);
    // Update sort_order for all
    const updates = newCategories.map((c, i) => categoryToDb(c, i));
    for (const u of updates) {
      await supabase.from('recipe_categories').upsert(u);
    }
  }, []);

  return {
    ingredients, recipes, categories, loading,
    saveIngredient, deleteIngredient, bulkImportIngredients,
    saveRecipe, deleteRecipe,
    saveCategory, deleteCategory, reorderCategories,
  };
}
