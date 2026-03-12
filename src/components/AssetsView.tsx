import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, Search,
  Tags, LayoutGrid, List, ImagePlus, QrCode, X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { logActivity } from '@/hooks/useActivityLog';

interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface Asset {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  quantity: number;
  unit: string;
  min_stock: number;
  cost_per_unit: number;
  total_value: number;
  location: string;
  condition: string;
  notes: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

const CONDITION_OPTIONS = ['ดี', 'ปานกลาง', 'ต้องซ่อม', 'ชำรุด'];
const UNIT_OPTIONS = ['ชิ้น', 'ตัว', 'เครื่อง', 'ใบ', 'ชุด', 'กล่อง', 'ม้วน', 'แพ็ค'];

const AssetsView = () => {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Asset form
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    code: '', name: '', category_id: '', quantity: 0, unit: 'ชิ้น',
    min_stock: 0, cost_per_unit: 0, location: '', condition: 'ดี', notes: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<AssetCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', icon: '📦', color: '#94a3b8' });

  // QR Dialog
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [catRes, assetRes] = await Promise.all([
      supabase.from('asset_categories').select('*').order('sort_order'),
      supabase.from('assets').select('*').order('name'),
    ]);
    if (catRes.data) setCategories(catRes.data as AssetCategory[]);
    if (assetRes.data) setAssets(assetRes.data as Asset[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Image Upload ----
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกิน 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (assetId: string): Promise<string> => {
    if (!imageFile) return editingAsset?.image_url || '';
    const ext = imageFile.name.split('.').pop();
    const path = `${assetId}.${ext}`;

    const { error } = await supabase.storage.from('asset-images').upload(path, imageFile, { upsert: true });
    if (error) { toast.error('อัปโหลดรูปไม่สำเร็จ'); return ''; }

    const { data } = supabase.storage.from('asset-images').getPublicUrl(path);
    return data.publicUrl + '?t=' + Date.now();
  };

  // ---- Asset CRUD ----
  const openAddAsset = () => {
    setEditingAsset(null);
    setForm({ code: '', name: '', category_id: '', quantity: 0, unit: 'ชิ้น', min_stock: 0, cost_per_unit: 0, location: '', condition: 'ดี', notes: '' });
    setImageFile(null);
    setImagePreview('');
    setAssetDialogOpen(true);
  };

  const openEditAsset = (a: Asset) => {
    setEditingAsset(a);
    setForm({
      code: a.code, name: a.name, category_id: a.category_id || '',
      quantity: a.quantity, unit: a.unit, min_stock: a.min_stock,
      cost_per_unit: a.cost_per_unit, location: a.location,
      condition: a.condition, notes: a.notes,
    });
    setImageFile(null);
    setImagePreview(a.image_url || '');
    setAssetDialogOpen(true);
  };

  const handleSaveAsset = async () => {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อทรัพย์สิน'); return; }
    setUploading(true);

    const totalValue = form.quantity * form.cost_per_unit;
    const payload: any = {
      ...form,
      name: form.name.trim(),
      category_id: form.category_id || null,
      total_value: totalValue,
    };

    try {
      if (editingAsset) {
        const image_url = await uploadImage(editingAsset.id);
        payload.image_url = image_url;
        const { error } = await supabase.from('assets').update(payload).eq('id', editingAsset.id);
        if (error) { toast.error('แก้ไขไม่สำเร็จ'); return; }
        toast.success('แก้ไขทรัพย์สินสำเร็จ');
        await logActivity('แก้ไขทรัพย์สิน', 'assets', editingAsset.id, { name: form.name });
      } else {
        // Insert first to get ID, then upload image
        const { data: inserted, error } = await supabase.from('assets').insert(payload).select('id').single();
        if (error || !inserted) { toast.error('เพิ่มไม่สำเร็จ'); return; }
        if (imageFile) {
          const image_url = await uploadImage(inserted.id);
          await supabase.from('assets').update({ image_url }).eq('id', inserted.id);
        }
        toast.success('เพิ่มทรัพย์สินสำเร็จ');
        await logActivity('เพิ่มทรัพย์สิน', 'assets', inserted.id, { name: form.name });
      }
      setAssetDialogOpen(false);
      fetchData();
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (a: Asset) => {
    if (!confirm(`ลบ "${a.name}" ?`)) return;
    const { error } = await supabase.from('assets').delete().eq('id', a.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบทรัพย์สินสำเร็จ');
    await logActivity('ลบทรัพย์สิน', 'assets', a.id, { name: a.name });
    fetchData();
  };

  // ---- Category CRUD ----
  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', icon: '📦', color: '#94a3b8' });
    setCatDialogOpen(true);
  };

  const openEditCat = (c: AssetCategory) => {
    setEditingCat(c);
    setCatForm({ name: c.name, icon: c.icon, color: c.color });
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) { toast.error('กรุณากรอกชื่อหมวดหมู่'); return; }
    if (editingCat) {
      const { error } = await supabase.from('asset_categories').update(catForm).eq('id', editingCat.id);
      if (error) { toast.error('แก้ไขไม่สำเร็จ'); return; }
      toast.success('แก้ไขหมวดหมู่สำเร็จ');
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
      const { error } = await supabase.from('asset_categories').insert({ ...catForm, sort_order: maxOrder });
      if (error) { toast.error('เพิ่มไม่สำเร็จ'); return; }
      toast.success('เพิ่มหมวดหมู่สำเร็จ');
    }
    setCatDialogOpen(false);
    fetchData();
  };

  const handleDeleteCat = async (c: AssetCategory) => {
    if (!confirm(`ลบหมวดหมู่ "${c.name}" ?`)) return;
    const { error } = await supabase.from('asset_categories').delete().eq('id', c.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบหมวดหมู่สำเร็จ');
    fetchData();
  };

  // ---- Helpers ----
  const getCategoryName = (catId: string | null) => categories.find(c => c.id === catId)?.name || 'ไม่ระบุ';
  const getCategoryIcon = (catId: string | null) => categories.find(c => c.id === catId)?.icon || '📋';

  const getAssetUrl = (assetId: string) => {
    const base = window.location.origin;
    return `${base}/asset/${assetId}`;
  };

  const handlePrintQR = () => {
    const svgEl = document.getElementById('qr-code-svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>QR - ${qrAsset?.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
      h2{margin-bottom:8px;} p{color:#666;margin:4px 0;}</style></head>
      <body>
        <h2>${qrAsset?.name || ''}</h2>
        <p>${qrAsset?.code ? `รหัส: ${qrAsset.code}` : ''}</p>
        ${svgData}
        <p style="margin-top:12px;font-size:12px;">Scan QR เพื่อดูรายละเอียด</p>
        <script>setTimeout(()=>{ window.print(); },500);</script>
      </body></html>
    `);
    win.document.close();
  };

  const filteredAssets = assets.filter(a => {
    const matchSearch = !searchTerm ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'all' || a.category_id === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStockAssets = assets.filter(a => a.min_stock > 0 && a.quantity <= a.min_stock);
  const totalValue = assets.reduce((sum, a) => sum + a.total_value, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">คลังทรัพย์สิน</h2>
            <p className="text-xs text-muted-foreground">จัดการอุปกรณ์และสินทรัพย์</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
          <p className="text-2xl font-bold text-foreground">{assets.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">หมวดหมู่</p>
          <p className="text-2xl font-bold text-foreground">{categories.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">มูลค่ารวม</p>
          <p className="text-2xl font-bold text-accent">฿{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">สต๊อคต่ำ</p>
          <p className={`text-2xl font-bold ${lowStockAssets.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {lowStockAssets.length > 0 && <AlertTriangle className="inline w-5 h-5 mr-1" />}
            {lowStockAssets.length}
          </p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets" className="gap-1"><Package className="w-4 h-4" /> รายการทรัพย์สิน</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1"><Tags className="w-4 h-4" /> หมวดหมู่</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-3 mt-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อหรือรหัส..." className="pl-8 h-9 text-sm" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="หมวดหมู่" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex border rounded-md overflow-hidden">
                <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}><LayoutGrid className="w-4 h-4" /></button>
              </div>
            </div>
            <Button size="sm" onClick={openAddAsset} className="gap-1"><Plus className="w-4 h-4" /> เพิ่มทรัพย์สิน</Button>
          </div>

          {filteredAssets.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">ไม่พบรายการทรัพย์สิน</p>
            </Card>
          ) : viewMode === 'table' ? (
            <Card>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">รูป</TableHead>
                      <TableHead className="w-16">รหัส</TableHead>
                      <TableHead>ชื่อทรัพย์สิน</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead className="text-right">มูลค่ารวม</TableHead>
                      <TableHead>สภาพ</TableHead>
                      <TableHead className="w-28">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map(a => (
                      <TableRow key={a.id} className={a.min_stock > 0 && a.quantity <= a.min_stock ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {a.image_url ? (
                            <img src={a.image_url} alt={a.name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-lg">
                              {getCategoryIcon(a.category_id)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{a.code || '-'}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {a.name}
                          {a.min_stock > 0 && a.quantity <= a.min_stock && <AlertTriangle className="inline w-3.5 h-3.5 text-destructive ml-1" />}
                        </TableCell>
                        <TableCell className="text-sm">{getCategoryName(a.category_id)}</TableCell>
                        <TableCell className="text-center font-semibold">{a.quantity} {a.unit}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">฿{a.total_value.toLocaleString('th-TH')}</TableCell>
                        <TableCell>
                          <Badge variant={a.condition === 'ดี' ? 'default' : a.condition === 'ชำรุด' ? 'destructive' : 'secondary'} className="text-xs">{a.condition}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrAsset(a)} title="QR Code">
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAsset(a)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAsset(a)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAssets.map(a => (
                <Card key={a.id} className={`overflow-hidden ${a.min_stock > 0 && a.quantity <= a.min_stock ? 'border-destructive/50' : ''}`}>
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center text-4xl">
                      {getCategoryIcon(a.category_id)}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.code || 'ไม่มีรหัส'} • {getCategoryName(a.category_id)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrAsset(a)}><QrCode className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAsset(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAsset(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">จำนวน</p>
                        <p className="font-semibold">{a.quantity} {a.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">มูลค่า</p>
                        <p className="font-semibold text-accent">฿{a.total_value.toLocaleString('th-TH')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">หมวดหมู่ทรัพย์สิน ({categories.length})</h3>
            <Button size="sm" onClick={openAddCat} className="gap-1"><Plus className="w-4 h-4" /> เพิ่มหมวดหมู่</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(c => {
              const count = assets.filter(a => a.category_id === c.id).length;
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: c.color + '20' }}>{c.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{count} รายการ</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCat(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Dialog */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'แก้ไขทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Image Upload */}
            <div className="space-y-1">
              <Label className="text-xs">รูปภาพ</Label>
              <div className="flex gap-3 items-start">
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(''); }}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <ImagePlus className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">เพิ่มรูป</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {imagePreview && (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                    เปลี่ยนรูป
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">รหัส</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="เช่น A001" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ชื่อทรัพย์สิน *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น กระทะเหล็ก" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หมวดหมู่</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">จำนวน</Label>
                <Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">หน่วย</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">สต๊อคขั้นต่ำ</Label>
                <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">ราคา/หน่วย (฿)</Label>
                <Input type="number" min={0} value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">สถานที่เก็บ</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="เช่น ชั้น A" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">สภาพ</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หมายเหตุ</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="บันทึกเพิ่มเติม" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
            <Button onClick={handleSaveAsset} disabled={uploading}>
              {uploading ? 'กำลังบันทึก...' : editingAsset ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">ชื่อหมวดหมู่ *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น อุปกรณ์ครัว" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">ไอคอน (Emoji)</Label>
                <Input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} className="h-9 text-sm text-center text-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">สี</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" />
                  <Input value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="h-9 text-sm flex-1" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
            <Button onClick={handleSaveCat}>{editingCat ? 'บันทึก' : 'เพิ่ม'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrAsset} onOpenChange={(open) => { if (!open) setQrAsset(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> QR Code
            </DialogTitle>
          </DialogHeader>
          {qrAsset && (
            <div className="flex flex-col items-center py-4 space-y-3">
              <QRCodeSVG
                id="qr-code-svg"
                value={getAssetUrl(qrAsset.id)}
                size={200}
                level="M"
                includeMargin
              />
              <p className="font-semibold text-sm">{qrAsset.name}</p>
              <p className="text-xs text-muted-foreground">{qrAsset.code || 'ไม่มีรหัส'}</p>
              <p className="text-[10px] text-muted-foreground break-all text-center">{getAssetUrl(qrAsset.id)}</p>
              <Button size="sm" onClick={handlePrintQR} className="gap-1 mt-2">
                พิมพ์ QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetsView;
