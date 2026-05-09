import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ingredient, IngredientBase } from '@/types/recipe';
import { INGREDIENT_CATEGORIES, UNITS } from '@/types/recipe';
import { Save } from 'lucide-react';

interface IngredientModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (ingredient: Ingredient) => void;
  editingIngredient?: Ingredient | null;
  bases?: IngredientBase[];
  defaultBaseValue?: string;
}

const IngredientModal = ({ open, onClose, onSave, editingIngredient, bases = [], defaultBaseValue = 'general' }: IngredientModalProps) => {
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'เครื่องปรุง',
    baseValue: defaultBaseValue,
    purchasePrice: 0,
    purchaseQty: 1,
    purchaseUnit: 'Kg',
    yieldPercent: 100,
    usageUnit: 'G',
  });

  useEffect(() => {
    if (editingIngredient) {
      setForm({
        code: editingIngredient.code,
        name: editingIngredient.name,
        category: editingIngredient.category,
        baseValue: editingIngredient.baseValue || 'general',
        purchasePrice: editingIngredient.purchasePrice,
        purchaseQty: editingIngredient.purchaseQty,
        purchaseUnit: editingIngredient.purchaseUnit,
        yieldPercent: editingIngredient.yieldPercent,
        usageUnit: editingIngredient.usageUnit,
      });
    } else {
      setForm({
        code: '',
        name: '',
        category: 'เครื่องปรุง',
        baseValue: defaultBaseValue,
        purchasePrice: 0,
        purchaseQty: 1,
        purchaseUnit: 'Kg',
        yieldPercent: 100,
        usageUnit: 'G',
      });
    }
  }, [editingIngredient, open, defaultBaseValue]);

  const calculateCostPerUnit = () => {
    if (form.purchaseQty === 0 || form.yieldPercent === 0) return 0;
    const yieldQty = form.purchaseQty * (form.yieldPercent / 100);
    return form.purchasePrice / yieldQty;
  };

  const calculateYieldQty = () => {
    return form.purchaseQty * (form.yieldPercent / 100);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    
    const ingredient: Ingredient = {
      id: editingIngredient?.id || crypto.randomUUID(),
      code: form.code || `ING-${Date.now().toString(36).toUpperCase()}`,
      name: form.name,
      category: form.category,
      baseValue: form.baseValue || 'general',
      purchasePrice: form.purchasePrice,
      purchaseQty: form.purchaseQty,
      purchaseUnit: form.purchaseUnit,
      yieldPercent: form.yieldPercent,
      yieldQty: calculateYieldQty(),
      usageUnit: form.usageUnit,
      costPerUnit: calculateCostPerUnit(),
    };
    onSave(ingredient);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingIngredient ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>รหัสสินค้า</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <Label>ชื่อวัตถุดิบ *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น เนื้ออกไก่ ลอกหนัง"
              />
            </div>
            <div>
              <Label>หมวดหมู่</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="section-card">
            <h3 className="font-semibold mb-3">ข้อมูลการซื้อ (Purchasing)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>ราคาซื้อ (฿)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>ปริมาณ (Qty)</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.purchaseQty}
                  onChange={(e) => setForm({ ...form, purchaseQty: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>หน่วยซื้อ</Label>
                <Select value={form.purchaseUnit} onValueChange={(v) => setForm({ ...form, purchaseUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Costing */}
          <div className="section-card">
            <h3 className="font-semibold mb-3">การคำนวณต้นทุน (Costing)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>% Yield (เนื้อสุทธิ)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.yieldPercent}
                    onChange={(e) => setForm({ ...form, yieldPercent: parseFloat(e.target.value) || 100 })}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <Label>Yield QTY</Label>
                <Input
                  type="number"
                  value={calculateYieldQty().toFixed(2)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>หน่วยที่ใช้</Label>
                <Select value={form.usageUnit} onValueChange={(v) => setForm({ ...form, usageUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 cost-highlight">
              <span className="text-sm font-medium">ต้นทุนต่อหน่วย: </span>
              <span className="text-lg font-bold text-accent-foreground">
                ฿{calculateCostPerUnit().toFixed(2)} / {form.usageUnit}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button onClick={handleSave} className="bg-success hover:bg-success/90 text-success-foreground">
              <Save className="w-4 h-4 mr-2" />
              บันทึก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IngredientModal;
