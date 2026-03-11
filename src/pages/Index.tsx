import { useState, useCallback } from 'react';
import AppNavbar from '@/components/AppNavbar';
import type { TabType } from '@/components/AppNavbar';
import CalculatorView from '@/components/CalculatorView';
import IngredientsView from '@/components/IngredientsView';
import RecipesView from '@/components/RecipesView';
import CategoriesView from '@/components/CategoriesView';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import type { Recipe } from '@/types/recipe';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [loadedRecipe, setLoadedRecipe] = useState<Recipe | null>(null);

  const {
    ingredients, recipes, categories, loading,
    saveIngredient, deleteIngredient, bulkImportIngredients,
    saveRecipe, deleteRecipe,
    saveCategory, deleteCategory, reorderCategories,
  } = useSupabaseData();

  const handleLoadRecipe = useCallback((recipe: Recipe) => {
    setLoadedRecipe(recipe);
    setActiveTab('calculator');
    toast.info(`โหลดสูตร "${recipe.name}" เรียบร้อย`);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'calculator' && (
          <CalculatorView
            ingredients={ingredients}
            onSaveRecipe={saveRecipe}
            loadedRecipe={loadedRecipe}
            onClearLoaded={() => setLoadedRecipe(null)}
            categories={categories}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsView
            ingredients={ingredients}
            onSave={saveIngredient}
            onDelete={deleteIngredient}
            onBulkImport={bulkImportIngredients}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesView
            recipes={recipes}
            onLoad={handleLoadRecipe}
            onDelete={deleteRecipe}
            categories={categories}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            recipes={recipes}
            onSave={saveCategory}
            onDelete={deleteCategory}
            onReorder={reorderCategories}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
