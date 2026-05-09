import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Search, Pencil, Trash2, Download, Upload, FileDown,
  FileUp, DatabaseBackup, ChevronDown, Database, Settings
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Ingredient, IngredientBase } from '@/types/recipe';
import IngredientModal from './IngredientModal';
import PrintActions from './PrintActions';
import { toast } from 'sonner';

interface IngredientsViewProps {
  ingredients: Ingredient[];
  onSave: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  onBulkImport: (ingredients: Ingredient[]) => void;
  bases?: IngredientBase[];
  isAdmin?: boolean;
  onSaveBase?: (b: IngredientBase) => void;
  onDeleteBase?: (id: string) => void;
}

const CSV_HEADERS = ['code', 'name', 'category', 'baseValue', 'purchasePrice', 'purchaseQty', 'purchaseUnit', 'yieldPercent', 'usageUnit'];

function escapeCSV(val: string | number) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function downloadFile(content: string, filename: string, type: string) {
  const bom = type.includes('csv') ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const IngredientsView = ({ ingredients, onSave, onDelete, onBulkImport, bases = [], isAdmin = false, onSaveBase, onDeleteBase }: IngredientsViewProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState('');
  const [filterBase, setFilterBase] = useState<string>('all');
  const [manageBasesOpen, setManageBasesOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const filtered = ingredients.filter((i) => {
    if (filterBase !== 'all' && (i.baseValue || 'general') !== filterBase) return false;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  const handleEdit = (ing: Ingredient) => { setEditing(ing); setModalOpen(true); };
  const handleAdd = () => { setEditing(null); setModalOpen(true); };

  const handleExportCSV = () => {
    if (ingredients.length === 0) { toast.error('ไม่มีข้อมูลให้ส่งออก'); return; }
    const header = CSV_HEADERS.join(',');
    const rows = ingredients.map((ing) =>
      CSV_HEADERS.map((h) => escapeCSV((ing as any)[h] ?? '')).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `ingredients_${date}.csv`, 'text/csv');
    toast.success(`ส่งออก ${ingredients.length} รายการเรียบร้อย`);
  };

  const handleDownloadTemplate = () => {
    const header = CSV_HEADERS.join(',');
    const example = ['ING-001', 'เนื้ออกไก่', 'เนื้อสัตว์', 'thai', '120', '1', 'Kg', '85', 'G'].join(',');
    const csv = [header, example].join('\n');
    downloadFile(csv, 'ingredient_template.csv', 'text/csv');
    toast.success('ดาวน์โหลด Template เรียบร้อย');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { toast.error('ไฟล์ CSV ว่างเปล่า'); return; }

        const headerLine = parseCSVLine(lines[0]);
        const headerMap: Record<string, number> = {};
        headerLine.forEach((h, idx) => { headerMap[h.trim().toLowerCase()] = idx; });

        const imported: Ingredient[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 3) continue;

          const get = (key: string) => cols[headerMap[key.toLowerCase()]] || '';
          const getNum = (key: string) => parseFloat(get(key)) || 0;

          const purchasePrice = getNum('purchaseprice');
          const purchaseQty = getNum('purchaseqty') || 1;
          const yieldPercent = getNum('yieldpercent') || 100;
          const yieldQty = purchaseQty * (yieldPercent / 100);
          const costPerUnit = yieldQty > 0 ? purchasePrice / yieldQty : 0;

          imported.push({
            id: crypto.randomUUID(),
            code: get('code') || `ING-${Date.now().toString(36).toUpperCase()}-${i}`,
            name: get('name'),
            category: get('category') || 'อื่นๆ',
            baseValue: get('basevalue') || (filterBase !== 'all' ? filterBase : 'general'),
            purchasePrice,
            purchaseQty,
            purchaseUnit: get('purchaseunit') || 'Kg',
            yieldPercent,
            yieldQty,
            usageUnit: get('usageunit') || 'G',
            costPerUnit,
          });
        }

        if (imported.length === 0) { toast.error('ไม่พบข้อมูลที่ถูกต้องในไฟล์'); return; }
        onBulkImport(imported);
      } catch {
        toast.error('ไม่สามารถอ่านไฟล์ CSV ได้');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBackupJSON = () => {
    if (ingredients.length === 0) { toast.error('ไม่มีข้อมูลให้สำรอง'); return; }
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ingredients }, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(data, `ingredients_backup_${date}.json`, 'application/json');
    toast.success('สำรองข้อมูลเรียบร้อย');
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const list: Ingredient[] = data.ingredients || data;
        if (!Array.isArray(list) || list.length === 0) { toast.error('ไม่พบข้อมูลในไฟล์'); return; }
        const restored = list.map((ing: Ingredient) => ({
          ...ing,
          id: crypto.randomUUID(),
          baseValue: ing.baseValue || 'general',
        }));
        onBulkImport(restored);
      } catch {
        toast.error('ไม่สามารถอ่านไฟล์ Backup ได้');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const baseLabel = (val: string) => bases.find(b => b.value === val)?.label || val;
  const baseIcon = (val: string) => bases.find(b => b.value === val)?.icon || '🍽️';

  return (
    <div className="animate-fade-in">
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreJSON} />

      <div className="flex flex-col gap-4 mb-6" id="ingredients-print-area">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">ฐานข้อมูลวัตถุดิบ</h2>
            <p className="text-muted-foreground text-sm">จัดการรายการและราคาวัตถุดิบ (Master Data)</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintActions printAreaId="ingredients-print-area" title="รายการวัตถุดิบ" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาวัตถุดิบ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Base filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium mr-1">ฐานข้อมูล:</Label>
          <Select value={filterBase} onValueChange={setFilterBase}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด ({ingredients.length})</SelectItem>
              {bases.map((b) => {
                const count = ingredients.filter(i => (i.baseValue || 'general') === b.value).length;
                return (
                  <SelectItem key={b.id} value={b.value}>{b.icon} {b.label} ({count})</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setManageBasesOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />จัดการฐานข้อมูล
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />นำเข้าข้อมูล
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />โหลด Template CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => csvInputRef.current?.click()}>
                <FileUp className="w-4 h-4 mr-2" />นำเข้าไฟล์ CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => jsonInputRef.current?.click()}>
                <DatabaseBackup className="w-4 h-4 mr-2" />กู้คืน (Restore JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />ส่งออก
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="w-4 h-4 mr-2" />Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBackupJSON}>
                <DatabaseBackup className="w-4 h-4 mr-2" />Backup JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <Button onClick={handleAdd} className="bg-success hover:bg-success/90 text-success-foreground">
            <Plus className="w-4 h-4 mr-2" />เพิ่มวัตถุดิบใหม่
          </Button>
        </div>

        {ingredients.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>ทั้งหมด <strong className="text-foreground">{ingredients.length}</strong> รายการ</span>
            {(search || filterBase !== 'all') && <span>แสดง <strong className="text-foreground">{filtered.length}</strong> รายการ</span>}
          </div>
        )}
      </div>

      <div className="section-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-3 font-semibold">รหัส</th>
              <th className="text-left p-3 font-semibold">ชื่อวัตถุดิบ</th>
              <th className="text-left p-3 font-semibold">ฐาน</th>
              <th className="text-left p-3 font-semibold">หมวดหมู่</th>
              <th className="text-left p-3 font-semibold">หน่วย</th>
              <th className="text-right p-3 font-semibold">Yield%</th>
              <th className="text-right p-3 font-semibold">ราคาซื้อ</th>
              <th className="text-right p-3 font-semibold">ต้นทุน/หน่วย</th>
              <th className="text-center p-3 font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  {search || filterBase !== 'all' ? 'ไม่พบวัตถุดิบ' : 'ยังไม่มีวัตถุดิบ กดปุ่ม "+ เพิ่มวัตถุดิบใหม่" เพื่อเริ่มต้น'}
                </td>
              </tr>
            ) : (
              filtered.map((ing) => (
                <tr key={ing.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-mono text-xs">{ing.code}</td>
                  <td className="p-3 font-medium">{ing.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-accent/30 text-xs">
                      {baseIcon(ing.baseValue || 'general')} {baseLabel(ing.baseValue || 'general')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {ing.category}
                    </span>
                  </td>
                  <td className="p-3">{ing.usageUnit}</td>
                  <td className="p-3 text-right">{ing.yieldPercent}%</td>
                  <td className="p-3 text-right">฿{ing.purchasePrice.toFixed(2)}</td>
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
        bases={bases}
        defaultBaseValue={filterBase !== 'all' ? filterBase : 'general'}
      />

      {isAdmin && onSaveBase && onDeleteBase && (
        <ManageBasesDialog
          open={manageBasesOpen}
          onClose={() => setManageBasesOpen(false)}
          bases={bases}
          onSave={onSaveBase}
          onDelete={onDeleteBase}
          ingredients={ingredients}
        />
      )}
    </div>
  );
};

// ===== Manage Bases Dialog =====
interface ManageBasesDialogProps {
  open: boolean;
  onClose: () => void;
  bases: IngredientBase[];
  onSave: (b: IngredientBase) => void;
  onDelete: (id: string) => void;
  ingredients: Ingredient[];
}

const ManageBasesDialog = ({ open, onClose, bases, onSave, onDelete, ingredients }: ManageBasesDialogProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ value: '', label: '', icon: '🍽️', color: '#94a3b8' });

  const startNew = () => {
    setEditingId('new');
    setForm({ value: '', label: '', icon: '🍽️', color: '#94a3b8' });
  };

  const startEdit = (b: IngredientBase) => {
    setEditingId(b.id);
    setForm({ value: b.value, label: b.label, icon: b.icon, color: b.color });
  };

  const handleSave = () => {
    if (!form.label.trim() || !form.value.trim()) { toast.error('กรุณาระบุชื่อและรหัสฐาน'); return; }
    const slug = form.value.toLowerCase().replace(/\s+/g, '-');
    const isNew = editingId === 'new';
    if (isNew && bases.some(b => b.value === slug)) { toast.error('รหัสฐานนี้มีอยู่แล้ว'); return; }
    const existing = bases.find(b => b.id === editingId);
    onSave({
      id: isNew ? crypto.randomUUID() : editingId!,
      value: isNew ? slug : (existing?.value ?? slug),
      label: form.label,
      icon: form.icon,
      color: form.color,
      isDefault: existing?.isDefault ?? false,
    });
    setEditingId(null);
  };

  const handleDelete = (b: IngredientBase) => {
    const used = ingredients.filter(i => (i.baseValue || 'general') === b.value).length;
    if (used > 0) { toast.error(`มีวัตถุดิบ ${used} รายการอยู่ในฐานนี้ ไม่สามารถลบได้`); return; }
    if (!confirm(`ลบฐาน "${b.label}"?`)) return;
    onDelete(b.id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>จัดการฐานข้อมูลวัตถุดิบ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={startNew} disabled={editingId === 'new'}>
              <Plus className="w-4 h-4 mr-1" />เพิ่มฐานใหม่
            </Button>
          </div>

          {editingId && (
            <div className="section-card space-y-3">
              <h4 className="font-semibold">{editingId === 'new' ? 'ฐานใหม่' : 'แก้ไขฐาน'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ชื่อแสดงผล *</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="เช่น ไทย (Thai)" />
                </div>
                <div>
                  <Label>รหัส (value) *</Label>
                  <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="thai" disabled={editingId !== 'new'} />
                </div>
                <div>
                  <Label>ไอคอน (Emoji)</Label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🇹🇭" />
                </div>
                <div>
                  <Label>สี</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>ยกเลิก</Button>
                <Button size="sm" onClick={handleSave}>บันทึก</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {bases.map((b) => {
              const count = ingredients.filter(i => (i.baseValue || 'general') === b.value).length;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{b.icon}</span>
                    <div>
                      <div className="font-medium">{b.label}</div>
                      <div className="text-xs text-muted-foreground">{b.value} • {count} วัตถุดิบ</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(b)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {b.value !== 'general' && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(b)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IngredientsView;
