import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppNavbar from '@/components/AppNavbar';
import type { TabType } from '@/components/AppNavbar';
import CalculatorView from '@/components/CalculatorView';
import IngredientsView from '@/components/IngredientsView';
import RecipesView from '@/components/RecipesView';
import CategoriesView from '@/components/CategoriesView';
import PurchaseOrderView from '@/components/PurchaseOrderView';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import AiChatBubble from '@/components/AiChatBubble';
import type { Recipe } from '@/types/recipe';
import { toast } from 'sonner';

const Index = () => {
  const { user, profile, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [loadedRecipe, setLoadedRecipe] = useState<Recipe | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

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

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  // Check if user is disabled
  if (!authLoading && profile && !profile.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-destructive">บัญชีของคุณถูกปิดการใช้งาน</p>
          <p className="text-muted-foreground">กรุณาติดต่อผู้ดูแลระบบ</p>
          <button onClick={signOut} className="text-sm text-muted-foreground underline">ออกจากระบบ</button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
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
      <AppNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        role={role}
        onSignOut={signOut}
        onAdmin={() => navigate('/admin')}
      />
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
            initialCategory={filterCategory}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            recipes={recipes}
            onSave={saveCategory}
            onDelete={deleteCategory}
            onReorder={reorderCategories}
            isAdmin={role === 'admin'}
            onNavigateToRecipes={(catValue) => {
              setFilterCategory(catValue);
              setActiveTab('recipes');
            }}
          />
        )}
        {activeTab === 'orders' && (
          <PurchaseOrderView ingredients={ingredients} />
        )}
        {activeTab === 'assets' && (
          <AssetsView />
        )}
      </main>
      <AiChatBubble />
    </div>
  );
};

export default Index;
