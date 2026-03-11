import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, FolderOpen } from 'lucide-react';
import type { RecipeCategory, Recipe } from '@/types/recipe';
import PrintActions from './PrintActions';
import { toast } from 'sonner';

interface CategoriesViewProps {
  categories: RecipeCategory[];
  recipes: Recipe[];
  onSave: (category: RecipeCategory) => void;
  onDelete: (id: string) => void;
  onReorder: (categories: RecipeCategory[]) => void;
  onNavigateToRecipes?: (categoryValue: string) => void;
}

const EMOJI_OPTIONS = [
  '📋', '🥣', '🍳', '🥘', '🍗', '🔥', '🥗', '🍟', '🍰', '🥤', '🥦', '🟡',
  '🍜', '🍝', '🍕', '🍔', '🌮', '🥙', '🍱', '🍣', '🥟', '🧁', '🍩', '🥐',
  '☕', '🍺', '🧃', '🥩', '🐟', '🦐', '🥚', '🧈', '🌶️', '🧄', '🧅', '🥕',
];

const COLOR_OPTIONS = [
  '#94a3b8', '#38bdf8', '#fbbf24', '#f97316', '#a78bfa', '#ef4444',
  '#4ade80', '#facc15', '#f472b6', '#22d3ee', '#22c55e', '#eab308',
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9', '#84cc16',
];

const CategoriesView = ({ categories, recipes, onSave, onDelete, onReorder }: CategoriesViewProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeCategory | null>(null);
  const [form, setForm] = useState({ label: '', icon: '📋', color: '#94a3b8' });

  const getRecipeCount = (catValue: string) =>
    recipes.filter((r) => r.category === catValue).length;

  const handleAdd = () => {
    setEditing(null);
    setForm({ label: '', icon: '📋', color: '#94a3b8' });
    setModalOpen(true);
  };

  const handleEdit = (cat: RecipeCategory) => {
    setEditing(cat);
    setForm({ label: cat.label, icon: cat.icon, color: cat.color });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.label.trim()) {
      toast.error('กรุณาใส่ชื่อหมวดหมู่');
      return;
    }

    const value = editing?.value || form.label.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);

    const category: RecipeCategory = {
      id: editing?.id || crypto.randomUUID(),
      value,
      label: form.label,
      icon: form.icon,
      color: form.color,
      isDefault: editing?.isDefault || false,
    };

    onSave(category);
    setModalOpen(false);
    toast.success(editing ? 'แก้ไขหมวดหมู่เรียบร้อย' : 'เพิ่มหมวดหมู่เรียบร้อย');
  };

  const handleDelete = (cat: RecipeCategory) => {
    const count = getRecipeCount(cat.value);
    if (count > 0) {
      toast.error(`ไม่สามารถลบได้ มีสูตรในหมวดนี้ ${count} สูตร`);
      return;
    }
    onDelete(cat.id);
    toast.success('ลบหมวดหมู่เรียบร้อย');
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newList = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    onReorder(newList);
  };

  return (
    <div className="animate-fade-in" id="categories-print-area">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">หมวดหมู่สูตรอาหาร</h2>
          <p className="text-muted-foreground text-sm">จัดการหมวดหมู่สำหรับจัดกลุ่มสูตรอาหาร</p>
        </div>
        <div className="flex gap-2">
          <PrintActions printAreaId="categories-print-area" title="หมวดหมู่สูตรอาหาร" />
          <Button onClick={handleAdd} className="bg-success hover:bg-success/90 text-success-foreground">
            <Plus className="w-4 h-4 mr-2" />เพิ่มหมวดหมู่ใหม่
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {categories.map((cat) => {
          const count = getRecipeCount(cat.value);
          return (
            <div
              key={cat.id}
              className="section-card flex items-center gap-3 p-4 hover:shadow-md transition-shadow cursor-default"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: cat.color + '20' }}
              >
                {cat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{count} สูตร</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list table */}
      <div className="section-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-3 w-10"></th>
              <th className="text-left p-3 font-semibold">ไอคอน</th>
              <th className="text-left p-3 font-semibold">ชื่อหมวดหมู่</th>
              <th className="text-left p-3 font-semibold">สี</th>
              <th className="text-center p-3 font-semibold">จำนวนสูตร</th>
              <th className="text-center p-3 font-semibold">ประเภท</th>
              <th className="text-center p-3 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCategory(idx, 'up')}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveCategory(idx, 'down')}
                      disabled={idx === categories.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="p-3 text-xl">{cat.icon}</td>
                <td className="p-3 font-medium">{cat.label}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-muted-foreground font-mono">{cat.color}</span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                    {getRecipeCount(cat.value)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {cat.isDefault ? (
                    <span className="text-xs text-muted-foreground">ค่าเริ่มต้น</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">กำหนดเอง</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {!cat.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {editing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>ชื่อหมวดหมู่ *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="เช่น อาหารเกาหลี"
              />
            </div>

            <div>
              <Label className="mb-2 block">เลือกไอคอน</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setForm({ ...form, icon: emoji })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      form.icon === emoji
                        ? 'bg-accent ring-2 ring-accent shadow-sm scale-110'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">เลือกสี</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`w-7 h-7 rounded-full transition-all ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <Label className="text-xs text-muted-foreground mb-2 block">ตัวอย่าง</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: form.color + '20' }}
                >
                  {form.icon}
                </div>
                <div>
                  <p className="font-semibold">{form.label || 'ชื่อหมวดหมู่'}</p>
                  <p className="text-xs text-muted-foreground">0 สูตร</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleSave} className="bg-success hover:bg-success/90 text-success-foreground">
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesView;
