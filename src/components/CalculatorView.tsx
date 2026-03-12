import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Save, RotateCcw, Trash2, Search, CheckCircle2 } from 'lucide-react';
import PrintActions from './PrintActions';
import type { Ingredient, Recipe, RecipeIngredient, OverheadCosts, RecipeCategory } from '@/types/recipe';
import { PORTION_SIZES, Q_FACTOR_PERCENT, SERVICE_CHARGE_PERCENT, VAT_PERCENT } from '@/types/recipe';
import { toast } from 'sonner';

interface CalculatorViewProps {
  ingredients: Ingredient[];
  onSaveRecipe: (recipe: Recipe) => void;
  loadedRecipe?: Recipe | null;
  onClearLoaded: () => void;
  categories: RecipeCategory[];
}

const CalculatorView = ({ ingredients, onSaveRecipe, loadedRecipe, onClearLoaded, categories }: CalculatorViewProps) => {
  const [menuName, setMenuName] = useState('');
  const [category, setCategory] = useState('general');
  const [menuCode, setMenuCode] = useState('');
  const [portionSize, setPortionSize] = useState('1');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [overhead, setOverhead] = useState<OverheadCosts>({ packaging: 0, labor: 0, utilities: 0, misc: 0 });
  const [targetFC, setTargetFC] = useState(30);
  const [sellingPrice, setSellingPrice] = useState(90);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRecipeName, setSavedRecipeName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recipe if provided
  useEffect(() => {
    if (loadedRecipe) {
      setMenuName(loadedRecipe.name);
      setCategory(loadedRecipe.category);
      setMenuCode(loadedRecipe.code);
      setPortionSize(loadedRecipe.portionSize);
      setRecipeIngredients(loadedRecipe.ingredients);
      setOverhead(loadedRecipe.overhead);
      setTargetFC(loadedRecipe.targetFCPercent);
      setSellingPrice(loadedRecipe.sellingPrice);
    }
  }, [loadedRecipe]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredIngredients = ingredients.filter(
    (i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addIngredient = useCallback((ing: Ingredient) => {
    const newItem: RecipeIngredient = {
      id: crypto.randomUUID(),
      ingredientId: ing.id,
      ingredientName: ing.name,
      qty: 0,
      unit: ing.usageUnit,
      yieldPercent: ing.yieldPercent,
      yieldQty: 0,
      costPerUnit: ing.costPerUnit,
      totalCost: 0,
    };
    setRecipeIngredients((prev) => [...prev, newItem]);
    setSearchTerm('');
    setShowDropdown(false);
  }, []);

  const updateIngredientQty = (id: string, qty: number) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const yieldQty = qty * (item.yieldPercent / 100);
        return { ...item, qty, yieldQty, totalCost: qty * item.costPerUnit };
      })
    );
  };

  const removeIngredient = (id: string) => {
    setRecipeIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const updateIngredientNote = (id: string, note: string) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  // Calculations
  const rawMaterialCost = useMemo(
    () => recipeIngredients.reduce((sum, i) => sum + i.totalCost, 0),
    [recipeIngredients]
  );

  const qFactorAmount = rawMaterialCost * (Q_FACTOR_PERCENT / 100);
  const totalOverhead = overhead.packaging + overhead.labor + overhead.utilities + overhead.misc;
  const totalProductCost = rawMaterialCost + qFactorAmount + totalOverhead;
  const portions = parseInt(portionSize) || 1;
  const costPerPortion = totalProductCost / portions;
  const suggestedPrice = targetFC > 0 ? costPerPortion / (targetFC / 100) : 0;
  const serviceChargeAmt = sellingPrice * (SERVICE_CHARGE_PERCENT / 100);
  const baseWithSvc = sellingPrice + serviceChargeAmt;
  const vatAmt = baseWithSvc * (VAT_PERCENT / 100);
  const grandTotal = baseWithSvc + vatAmt;
  const realFC = sellingPrice > 0 ? (costPerPortion / sellingPrice) * 100 : 0;
  const profitPercent = sellingPrice > 0 ? ((sellingPrice - costPerPortion) / sellingPrice) * 100 : 0;

  const handleReset = () => {
    setMenuName('');
    setCategory('general');
    setMenuCode('');
    setPortionSize('1');
    setRecipeIngredients([]);
    setOverhead({ packaging: 0, labor: 0, utilities: 0, misc: 0 });
    setTargetFC(30);
    setSellingPrice(0);
    onClearLoaded();
  };

  const handleSave = () => {
    if (!menuName.trim()) {
      toast.error('กรุณาใส่ชื่อเมนู');
      return;
    }
    if (recipeIngredients.length === 0) {
      toast.error('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    const recipe: Recipe = {
      id: loadedRecipe?.id || crypto.randomUUID(),
      name: menuName,
      category,
      code: menuCode || `R-${Date.now().toString(36).toUpperCase()}`,
      portionSize,
      ingredients: recipeIngredients,
      overhead,
      rawMaterialCost,
      qFactor: qFactorAmount,
      totalProductCost,
      costPerPortion,
      targetFCPercent: targetFC,
      suggestedPrice,
      sellingPrice,
      serviceCharge: serviceChargeAmt,
      vat: vatAmt,
      grandTotal,
      realFCPercent: realFC,
      profitPercent,
      createdAt: loadedRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRecipe(recipe);
    setSavedRecipeName(menuName);
    setShowSuccessDialog(true);
    // Reset form
    handleReset();
  };

  return (
    <div className="animate-fade-in" id="calculator-print-area">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Standard Recipe Card</h2>
          <p className="text-sm text-muted-foreground">เอกสารควบคุมต้นทุนมาตรฐาน</p>
        </div>
        <div className="flex gap-2">
          <PrintActions printAreaId="calculator-print-area" title={`Recipe - ${menuName || 'Standard Recipe Card'}`} />
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />เริ่มใหม่
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />บันทึกสูตรนี้
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recipe Info + Ingredients */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipe Info */}
          <div className="section-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>ชื่อเมนู (Menu Name)</Label>
                <Input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="เช่น ข้าวผัดกุ้ง" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>หมวดหมู่</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>รหัสเมนู</Label>
                  <Input value={menuCode} onChange={(e) => setMenuCode(e.target.value)} placeholder="Auto" />
                </div>
              </div>
            </div>
            <div>
              <Label>Portion Size</Label>
              <Select value={portionSize} onValueChange={setPortionSize}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PORTION_SIZES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="section-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">วัตถุดิบ</th>
                    <th className="text-right p-2 w-24">ปริมาณ</th>
                    <th className="text-left p-2 w-16">หน่วย</th>
                    <th className="text-right p-2 w-16">Yield%</th>
                    <th className="text-right p-2 w-24">Yield QTY</th>
                    <th className="text-right p-2 w-24">รวม (฿)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recipeIngredients.map((item, idx) => (
                    <tr key={item.id} className="border-b border-border/30">
                      <td className="p-2 text-muted-foreground align-top pt-3">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-medium">{item.ingredientName}</div>
                        <Input
                          placeholder="Note..."
                          value={item.note || ''}
                          onChange={(e) => updateIngredientNote(item.id, e.target.value)}
                          className="h-7 text-xs mt-1 text-muted-foreground"
                        />
                      </td>
                      <td className="p-2 align-top pt-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.qty}
                          onChange={(e) => updateIngredientQty(item.id, parseFloat(e.target.value) || 0)}
                          className="text-right h-8"
                        />
                      </td>
                      <td className="p-2 text-muted-foreground align-top pt-3">{item.unit}</td>
                      <td className="p-2 text-right align-top pt-3">{item.yieldPercent}%</td>
                      <td className="p-2 text-right align-top pt-3">{item.yieldQty.toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold align-top pt-3">{item.totalCost.toFixed(2)}</td>
                      <td className="p-2 align-top pt-2">
                        <Button variant="ghost" size="sm" onClick={() => removeIngredient(item.id)} className="text-destructive h-7 w-7 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {recipeIngredients.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        เพิ่มวัตถุดิบด้วยช่องค้นหาด้านล่าง
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Ingredient Search */}
            <div className="mt-4 relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาวัตถุดิบเพื่อเพิ่ม..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-10"
                />
              </div>
              {showDropdown && searchTerm && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredIngredients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">ไม่พบวัตถุดิบ</div>
                  ) : (
                    filteredIngredients.map((ing) => (
                      <button
                        key={ing.id}
                        onClick={() => addIngredient(ing)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex justify-between"
                      >
                        <span>{ing.name}</span>
                        <span className="text-muted-foreground">฿{ing.costPerUnit.toFixed(2)}/{ing.usageUnit}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cost Summary & Pricing */}
        <div className="space-y-6">
          {/* Cost Summary */}
          <div className="section-card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-accent rounded-full" />
              ต้นทุน (Cost)
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>วัตถุดิบรวม (Raw Material):</span>
                <span className="font-semibold">{rawMaterialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Q-Factor ({Q_FACTOR_PERCENT}%):</span>
                <span className="font-semibold">{qFactorAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total Product Cost:</span>
                <span>{(rawMaterialCost + qFactorAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Overhead */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">ต้นทุนแฝงอื่นๆ (Overhead)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['packaging', 'labor', 'utilities', 'misc'] as const).map((key) => (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={overhead[key] || ''}
                      onChange={(e) => setOverhead({ ...overhead, [key]: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Per Portion */}
            <div className="mt-4 cost-highlight text-center">
              <div className="text-sm text-muted-foreground">Cost per Portion</div>
              <div className="text-3xl font-bold mt-1">
                <span className="text-sm font-normal text-muted-foreground">฿</span>
                {costPerPortion.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="section-card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-success rounded-full" />
              ราคาขาย (Pricing)
            </h3>

            <div className="space-y-4">
              <div>
                <Label>Target Food Cost %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={targetFC}
                    onChange={(e) => setTargetFC(parseFloat(e.target.value) || 30)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span>ราคาแนะนำ:</span>
                <span className="font-bold text-lg">{suggestedPrice.toFixed(2)}</span>
              </div>

              <div>
                <Label>ราคาขายจริง (รวม VAT/SVC)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">฿</span>
                  <Input
                    type="number"
                    min={0}
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span>Service Charge ({SERVICE_CHARGE_PERCENT}%):</span>
                  <span>{serviceChargeAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT Include ({VAT_PERCENT}%):</span>
                  <span>{vatAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Grand Total (ลูกค้าจ่าย):</span>
                  <span>{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* FC% and Profit indicators */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className={`text-center p-3 rounded-lg ${realFC > targetFC ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <div className="text-xs text-muted-foreground">REAL FC%</div>
                  <div className={`text-xl font-bold ${realFC > targetFC ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {realFC.toFixed(2)}%
                  </div>
                </div>
                <div className={`text-center p-3 rounded-lg ${profitPercent < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <div className="text-xs text-muted-foreground">PROFIT</div>
                  <div className={`text-xl font-bold ${profitPercent < 0 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {profitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-xl">บันทึกสูตรสำเร็จ!</DialogTitle>
            <DialogDescription className="text-base">
              สูตร "{savedRecipeName}" ถูกบันทึกเรียบร้อยแล้ว
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccessDialog(false)} className="mt-2">
            ตกลง
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalculatorView;
