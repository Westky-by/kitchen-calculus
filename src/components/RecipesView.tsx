import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Search } from 'lucide-react';
import type { Recipe, RecipeCategory } from '@/types/recipe';
import { useState } from 'react';

interface RecipesViewProps {
  recipes: Recipe[];
  onLoad: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  categories: RecipeCategory[];
}

const RecipesView = ({ recipes, onLoad, onDelete, categories }: RecipesViewProps) => {
  const [search, setSearch] = useState('');

  const filtered = recipes.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) ||
           r.code.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryLabel = (val: string) => {
    const cat = categories.find((c) => c.value === val);
    return cat ? `${cat.icon} ${cat.label}` : val;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">สูตรที่บันทึกไว้ (My Recipes)</h2>
          <p className="text-muted-foreground text-sm">ประวัติสูตรอาหารทั้งหมดของคุณ</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสูตร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="section-card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg text-muted-foreground">
            {search ? 'ไม่พบสูตรที่ค้นหา' : 'ยังไม่มีสูตรที่บันทึกไว้'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="section-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{recipe.name}</h3>
                  <p className="text-xs text-muted-foreground">{recipe.code}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                  {getCategoryLabel(recipe.category)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground">ต้นทุน:</span>
                  <span className="ml-1 font-semibold">฿{recipe.costPerPortion.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ราคาขาย:</span>
                  <span className="ml-1 font-semibold">฿{recipe.sellingPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">FC%:</span>
                  <span className={`ml-1 font-semibold ${recipe.realFCPercent > recipe.targetFCPercent ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {recipe.realFCPercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Profit:</span>
                  <span className="ml-1 font-semibold text-[hsl(var(--success))]">
                    {recipe.profitPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                อัปเดต: {new Date(recipe.updatedAt).toLocaleDateString('th-TH')}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onLoad(recipe)} className="flex-1">
                  <Upload className="w-3.5 h-3.5 mr-1" />Load
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(recipe.id)} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipesView;
