import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { Ingredient } from '@/types/recipe';
import IngredientModal from './IngredientModal';

interface IngredientsViewProps {
  ingredients: Ingredient[];
  onSave: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
}

const IngredientsView = ({ ingredients, onSave, onDelete }: IngredientsViewProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState('');

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (ing: Ingredient) => {
    setEditing(ing);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">ฐานข้อมูลวัตถุดิบ</h2>
          <p className="text-muted-foreground text-sm">จัดการรายการและราคาวัตถุดิบ (Master Data)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาวัตถุดิบ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={handleAdd} className="bg-success hover:bg-success/90 text-success-foreground">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มวัตถุดิบใหม่
          </Button>
        </div>
      </div>

      <div className="section-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-3 font-semibold">รหัส</th>
              <th className="text-left p-3 font-semibold">ชื่อวัตถุดิบ</th>
              <th className="text-left p-3 font-semibold">หมวดหมู่</th>
              <th className="text-left p-3 font-semibold">หน่วย</th>
              <th className="text-right p-3 font-semibold">Yield%</th>
              <th className="text-right p-3 font-semibold">ต้นทุน/หน่วย</th>
              <th className="text-center p-3 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search ? 'ไม่พบวัตถุดิบที่ค้นหา' : 'ยังไม่มีวัตถุดิบ กดปุ่ม "+ เพิ่มวัตถุดิบใหม่" เพื่อเริ่มต้น'}
                </td>
              </tr>
            ) : (
              filtered.map((ing) => (
                <tr key={ing.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-mono text-xs">{ing.code}</td>
                  <td className="p-3 font-medium">{ing.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {ing.category}
                    </span>
                  </td>
                  <td className="p-3">{ing.usageUnit}</td>
                  <td className="p-3 text-right">{ing.yieldPercent}%</td>
                  <td className="p-3 text-right font-semibold">฿{ing.costPerUnit.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(ing)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(ing.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <IngredientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={onSave}
        editingIngredient={editing}
      />
    </div>
  );
};

export default IngredientsView;
