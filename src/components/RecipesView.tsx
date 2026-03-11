import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Search, Eye, Filter } from 'lucide-react';
import type { Recipe, RecipeCategory } from '@/types/recipe';
import { Q_FACTOR_PERCENT, SERVICE_CHARGE_PERCENT, VAT_PERCENT } from '@/types/recipe';
import PrintActions from './PrintActions';
import { useState } from 'react';

interface RecipesViewProps {
  recipes: Recipe[];
  onLoad: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  categories: RecipeCategory[];
}

const RecipesView = ({ recipes, onLoad, onDelete, categories }: RecipesViewProps) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const getCategoryLabel = (val: string) => {
    const cat = categories.find((c) => c.value === val);
    return cat ? `${cat.icon} ${cat.label}` : val;
  };

  const getCategoryIcon = (val: string) => {
    const cat = categories.find((c) => c.value === val);
    return cat?.icon || '📋';
  };

  // Count recipes per category
  const categoryCounts = recipes.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in" id="recipes-print-area">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">สูตรที่บันทึกไว้ (My Recipes)</h2>
          <p className="text-muted-foreground text-sm">ประวัติสูตรอาหารทั้งหมดของคุณ</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintActions printAreaId="recipes-print-area" title="รายการสูตรอาหาร" />
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
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
          className="text-xs"
        >
          <Filter className="w-3.5 h-3.5 mr-1" />ทั้งหมด ({recipes.length})
        </Button>
        {categories.map((cat) => {
          const count = categoryCounts[cat.value] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.value)}
              className="text-xs"
            >
              {cat.icon} {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="section-card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg text-muted-foreground">
            {search || selectedCategory !== 'all' ? 'ไม่พบสูตรที่ค้นหา' : 'ยังไม่มีสูตรที่บันทึกไว้'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="section-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
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

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => setSelectedRecipe(recipe)} className="flex-1">
                  <Eye className="w-3.5 h-3.5 mr-1" />ดูรายละเอียด
                </Button>
                <Button size="sm" variant="outline" onClick={() => onLoad(recipe)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(recipe.id)} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" id="recipe-detail-print-area">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(selectedRecipe.category)}</span>
                    <div>
                      <DialogTitle className="text-xl">{selectedRecipe.name}</DialogTitle>
                      <p className="text-sm text-muted-foreground">{selectedRecipe.code} · {getCategoryLabel(selectedRecipe.category)}</p>
                    </div>
                  </div>
                  <PrintActions printAreaId="recipe-detail-print-area" title={`Recipe - ${selectedRecipe.name}`} />
                </div>
              </DialogHeader>

              {/* Ingredients Table */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">วัตถุดิบ ({selectedRecipe.ingredients.length} รายการ)</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 w-8">#</th>
                        <th className="text-left p-2">วัตถุดิบ</th>
                        <th className="text-right p-2">ปริมาณ</th>
                        <th className="text-left p-2">หน่วย</th>
                        <th className="text-right p-2">รวม (฿)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecipe.ingredients.map((item, idx) => (
                        <tr key={item.id} className="border-b border-border/30">
                          <td className="p-2 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2">
                            <div className="font-medium">{item.ingredientName}</div>
                            {item.note && <div className="text-xs text-muted-foreground italic">{item.note}</div>}
                          </td>
                          <td className="p-2 text-right">{item.qty}</td>
                          <td className="p-2 text-muted-foreground">{item.unit}</td>
                          <td className="p-2 text-right font-semibold">{item.totalCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold mb-2">ต้นทุน (Cost)</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">วัตถุดิบรวม:</span>
                    <span className="font-semibold">฿{selectedRecipe.rawMaterialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Q-Factor ({Q_FACTOR_PERCENT}%):</span>
                    <span className="font-semibold">฿{selectedRecipe.qFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overhead:</span>
                    <span className="font-semibold">
                      ฿{(selectedRecipe.overhead.packaging + selectedRecipe.overhead.labor + selectedRecipe.overhead.utilities + selectedRecipe.overhead.misc).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total Product Cost:</span>
                    <span>฿{selectedRecipe.totalProductCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary">
                    <span>Cost/Portion:</span>
                    <span>฿{selectedRecipe.costPerPortion.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold mb-2">ราคาขาย (Pricing)</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ราคาขาย:</span>
                    <span className="font-semibold">฿{selectedRecipe.sellingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">+ SC ({SERVICE_CHARGE_PERCENT}%):</span>
                    <span className="font-semibold">฿{selectedRecipe.serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">+ VAT ({VAT_PERCENT}%):</span>
                    <span className="font-semibold">฿{selectedRecipe.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Grand Total:</span>
                    <span>฿{selectedRecipe.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Target FC%</div>
                  <div className="text-lg font-bold">{selectedRecipe.targetFCPercent}%</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Real FC%</div>
                  <div className={`text-lg font-bold ${selectedRecipe.realFCPercent > selectedRecipe.targetFCPercent ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {selectedRecipe.realFCPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Profit</div>
                  <div className="text-lg font-bold text-[hsl(var(--success))]">
                    {selectedRecipe.profitPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { onLoad(selectedRecipe); setSelectedRecipe(null); }} className="flex-1">
                  <Pencil className="w-4 h-4 mr-2" />แก้ไขสูตรนี้
                </Button>
                <Button variant="destructive" onClick={() => { onDelete(selectedRecipe.id); setSelectedRecipe(null); }}>
                  <Trash2 className="w-4 h-4 mr-2" />ลบ
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center mt-2">
                สร้างเมื่อ: {new Date(selectedRecipe.createdAt).toLocaleDateString('th-TH')} · อัปเดต: {new Date(selectedRecipe.updatedAt).toLocaleDateString('th-TH')}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipesView;
