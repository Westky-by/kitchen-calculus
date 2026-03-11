import { useState, useCallback } from 'react';
import AppNavbar from '@/components/AppNavbar';
import type { TabType } from '@/components/AppNavbar';
import CalculatorView from '@/components/CalculatorView';
import IngredientsView from '@/components/IngredientsView';
import RecipesView from '@/components/RecipesView';
import CategoriesView from '@/components/CategoriesView';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Ingredient, Recipe, RecipeCategory } from '@/types/recipe';
import { DEFAULT_CATEGORIES } from '@/types/recipe';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('prc-ingredients', []);
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('prc-recipes', []);
  const [categories, setCategories] = useLocalStorage<RecipeCategory[]>('prc-categories', DEFAULT_CATEGORIES);
  const [loadedRecipe, setLoadedRecipe] = useState<Recipe | null>(null);

  const handleSaveIngredient = useCallback((ingredient: Ingredient) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === ingredient.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = ingredient;
        return updated;
      }
      return [...prev, ingredient];
    });
    toast.success('บันทึกวัตถุดิบเรียบร้อย!');
  }, [setIngredients]);

  const handleDeleteIngredient = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    toast.success('ลบวัตถุดิบเรียบร้อย');
  }, [setIngredients]);

  const handleBulkImportIngredients = useCallback((imported: Ingredient[]) => {
    setIngredients((prev) => [...prev, ...imported]);
  }, [setIngredients]);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = recipe;
        return updated;
      }
      return [...prev, recipe];
    });
  }, [setRecipes]);

  const handleDeleteRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    toast.success('ลบสูตรเรียบร้อย');
  }, [setRecipes]);

  const handleLoadRecipe = useCallback((recipe: Recipe) => {
    setLoadedRecipe(recipe);
    setActiveTab('calculator');
    toast.info(`โหลดสูตร "${recipe.name}" เรียบร้อย`);
  }, []);

  // Category handlers
  const handleSaveCategory = useCallback((category: RecipeCategory) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = category;
        return updated;
      }
      return [...prev, category];
    });
  }, [setCategories]);

  const handleDeleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, [setCategories]);

  const handleReorderCategories = useCallback((newCategories: RecipeCategory[]) => {
    setCategories(newCategories);
  }, [setCategories]);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'calculator' && (
          <CalculatorView
            ingredients={ingredients}
            onSaveRecipe={handleSaveRecipe}
            loadedRecipe={loadedRecipe}
            onClearLoaded={() => setLoadedRecipe(null)}
            categories={categories}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsView
            ingredients={ingredients}
            onSave={handleSaveIngredient}
            onDelete={handleDeleteIngredient}
            onBulkImport={handleBulkImportIngredients}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesView
            recipes={recipes}
            onLoad={handleLoadRecipe}
            onDelete={handleDeleteRecipe}
            categories={categories}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            recipes={recipes}
            onSave={handleSaveCategory}
            onDelete={handleDeleteCategory}
            onReorder={handleReorderCategories}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
