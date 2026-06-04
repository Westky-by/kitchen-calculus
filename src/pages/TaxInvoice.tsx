import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Upload, Trash2, FileText, Eye, Sparkles, Save, FileDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import TaxInvoiceDoc, { type InvoiceData, type InvoiceItem } from '@/components/TaxInvoiceDoc';
import PrintActions from '@/components/PrintActions';
import { bahtText } from '@/lib/bahtText';
import { logActivity } from '@/hooks/useActivityLog';
import '@/styles/tax-invoice.css';

interface InvoiceRow {
  id: string;
  doc_number: string;
  doc_date: string;
  customer_name: string;
  grand_total: number;
  is_backdated: boolean;
  backdate_note: string;
  created_by_username: string;
  created_at: string;
}

const SAMPLE: Partial<InvoiceData> = {
  customer_name: '',
  customer_address: '',
  customer_tax_id: '',
  branch_type: 'head',
  branch_no: '',
  // ตาม PDF: 1 บรรทัด รหัส OY-67003 รายละเอียด "ค่าอาหารและเครื่องดื่ม"
  // ราคารวมจากใบเสร็จ OYARD BKK = 7,348.00 (Subtotal 6,680 + Service Charge 10% 668)
  items: [
    { code: 'OY-67003', description: 'ค่าอาหารและเครื่องดื่ม', qty: 1, unit: 'รายการ', price: 7348 },
  ],
  payment_cash: false,
  payment_transfer: true,
  notes: '',
};

function emptyInvoice(today: string): InvoiceData {
  return {
    doc_number: '',
    doc_date: today,
    customer_name: '',
    customer_address: '',
    customer_tax_id: '',
    branch_type: 'head',
    branch_no: '',
    items: [{ code: 'OY-67003', description: 'ค่าอาหารและเครื่องดื่ม', qty: 1, unit: 'รายการ', price: 7348 }],
    total_amount: 0,
    discount: 0,
    amount_after_discount: 0,
    vat: 0,
    grand_total: 0,
    amount_text: '',
    payment_cash: false,
    payment_transfer: true,
    cheque_no: '',
    cheque_bank: '',
    cheque_date: '',
    cheque_amount: 0,
    notes: '',
    signer_name: 'สัจจพร สมาธิมงคล',
    signer_license: '',
    signer_date: today,
    receiver_name: '',
    receiver_date: '',
  };
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function buildDocNumber(creatorCode: string, dateStr: string, seq: number) {
  const d = new Date(dateStr);
  const buddhistYY = ((d.getFullYear() + 543) % 100).toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const ss = seq.toString().padStart(3, '0');
  // Example: 02 + 69 + 03 + 06 -> 02690306-001
  return `${creatorCode}${buddhistYY}${mm}${dd}-${ss}`;
}

const TaxInvoicePage = () => {
  const { user, profile, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorCode, setCreatorCode] = useState('00');
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [search, setSearch] = useState('');

  // Form
  const [data, setData] = useState<InvoiceData>(emptyInvoice(todayISO()));
  const [isBackdated, setIsBackdated] = useState(false);
  const [backdateNote, setBackdateNote] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null); // when viewing/printing an existing doc, this holds its id
  const [savedAt, setSavedAt] = useState<string>('');

  // OCR
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string>('');

  // Bill reference (อ้างอิงตามใบเสร็จจริง — ไม่แสดงใน PDF)
  const [useBillTotals, setUseBillTotals] = useState(false);
  const [billRef, setBillRef] = useState({
    subtotal: 0,
    service_charge: 0,
    rounding: 0,
    before_service_charge: 0,
    before_vat: 0,
    vat_amount: 0,
    total: 0,
  });

  // View / Print
  const [printOpen, setPrintOpen] = useState(false);
  const [printData, setPrintData] = useState<InvoiceData | null>(null);
  const [printSourceImage, setPrintSourceImage] = useState<string>('');
  const [companySignature, setCompanySignature] = useState<string>(() => {
    try { return localStorage.getItem('ti_company_signature') || ''; } catch { return ''; }
  });
  const companySigFileRef = useRef<HTMLInputElement>(null);
  const handleCompanySignatureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setCompanySignature(url);
      try { localStorage.setItem('ti_company_signature', url); } catch {}
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };
  const printRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === 'admin' || role === 'super_admin';

  // ---- Load profile creator_code + list ----
  const fetchList = useCallback(async () => {
    const { data: rows } = await supabase
      .from('tax_invoices' as any)
      .select('id,doc_number,doc_date,customer_name,grand_total,is_backdated,backdate_note,created_by_username,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    setList((rows as any[]) || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('creator_code' as any)
        .eq('id', user.id)
        .single();
      setCreatorCode(((prof as any)?.creator_code as string) || '00');
      await fetchList();
      setLoading(false);
    })();
  }, [user, fetchList]);

  // ---- Recalculate totals (VAT-exclusive add 7%) OR override from bill reference ----
  useEffect(() => {
    if (useBillTotals) {
      const pre = billRef.before_vat || 0;
      const vat = billRef.vat_amount || 0;
      const grand = billRef.total || (pre + vat);
      setData(prev => ({
        ...prev,
        total_amount: pre,
        amount_after_discount: pre,
        vat,
        grand_total: grand,
        amount_text: bahtText(grand),
      }));
      return;
    }
    const total = data.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0);
    const afterDiscount = Math.max(0, total - (data.discount || 0));
    const vat = afterDiscount * 0.07;
    const grand = afterDiscount + vat;
    setData(prev => ({
      ...prev,
      total_amount: total,
      amount_after_discount: afterDiscount,
      vat,
      grand_total: grand,
      amount_text: bahtText(grand),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data.items), data.discount, useBillTotals, JSON.stringify(billRef)]);

  // ---- New invoice ----
  const startNew = () => {
    const t = todayISO();
    setData(emptyInvoice(t));
    setIsBackdated(false);
    setBackdateNote('');
    setSavingId(null);
    setSavedAt('');
    setSourceImageUrl('');
    setUseBillTotals(false);
    setBillRef({ subtotal: 0, service_charge: 0, rounding: 0, before_service_charge: 0, before_vat: 0, vat_amount: 0, total: 0 });
    setTab('new');
  };

  const handleApplySample = () => {
    setData(prev => ({ ...prev, ...SAMPLE } as InvoiceData));
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, ...patch } : it),
    }));
  };
  const addRow = () => setData(prev => ({ ...prev, items: [...prev.items, { code: '', description: '', qty: 1, unit: 'รายการ', price: 0 }] }));
  const removeRow = (idx: number) => setData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  // ---- OCR ----
  const onPickFile = () => fileRef.current?.click();
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกิน 8MB'); return; }
    setOcrBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(f);
      });

      // Upload bill image to storage so it stays attached to the invoice
      try {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('bill-images').upload(path, f, {
          contentType: f.type || 'image/jpeg',
          upsert: false,
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('bill-images').getPublicUrl(path);
          setSourceImageUrl(pub.publicUrl);
        }
      } catch { /* non-fatal */ }

      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sess.session?.access_token}`,
        },
        body: JSON.stringify({ image: dataUrl }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'OCR ไม่สำเร็จ');
        return;
      }
      const r = result.data || {};
      const grandTotal = Number(r.grand_total) || 0;
      const beforeVat = Number(r.pre_vat_amount ?? r.before_vat) || 0;
      const beforeSvc = Number(r.before_service_charge) || 0;
      // ราคาที่จะใช้เติมรายการเดียวเมื่อบิลไม่มีรายละเอียด — เลือกยอดก่อน Service Charge > ก่อน VAT > ยอดสุทธิ
      const fallbackAmount = beforeSvc || beforeVat || grandTotal;
      const mappedItems: InvoiceItem[] = Array.isArray(r.items) && r.items.length > 0
        ? r.items.map((x: any) => {
            const qty = Number(x.qty) || 1;
            // OCR returns line_total per row (จำนวนเงินจากบิล) — แยกเป็นราคาต่อหน่วยโดย / qty
            const lineTotal = Number(x.line_total ?? x.price) || 0;
            const unitPrice = qty > 0 ? lineTotal / qty : lineTotal;
            return {
              code: String(x.code || ''),
              description: String(x.description || ''),
              qty,
              unit: String(x.unit || 'รายการ'),
              price: unitPrice,
            };
          })
        : fallbackAmount > 0
          ? [{
              code: 'OY-67003',
              description: 'ค่าอาหารและเครื่องดื่ม',
              qty: 1,
              unit: 'รายการ',
              price: fallbackAmount,
            }]
          : [];
      setData(prev => {
        const items = mappedItems.length > 0 ? mappedItems : prev.items;
        return {
          ...prev,
          doc_date: r.doc_date || prev.doc_date,
          customer_name: r.customer_name || prev.customer_name,
          customer_address: r.customer_address || prev.customer_address,
          customer_tax_id: r.customer_tax_id || prev.customer_tax_id,
          items,
        };
      });

      // Fill bill reference values (สำหรับอ้างอิงตามใบเสร็จ — ไม่แสดงใน PDF)
      setBillRef({
        subtotal: Number(r.subtotal) || 0,
        service_charge: Number(r.service_charge) || 0,
        rounding: Number(r.rounding) || 0,
        before_service_charge: Number(r.before_service_charge) || 0,
        before_vat: Number(r.pre_vat_amount) || 0,
        vat_amount: Number(r.vat_amount) || 0,
        total: Number(r.grand_total) || 0,
      });
      if (Number(r.grand_total) > 0) setUseBillTotals(true);
      toast.success('ดึงข้อมูลจากบิลเรียบร้อย กรุณาตรวจสอบก่อนบันทึก');
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err?.message || ''));
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ---- Save invoice ----
  const handleSave = async () => {
    if (!data.customer_name && !data.items.some(i => i.description)) {
      toast.error('กรุณากรอกข้อมูลลูกค้าหรือรายการสินค้า');
      return;
    }
    if (isBackdated && !backdateNote.trim()) {
      toast.error('กรณีย้อนหลังต้องระบุ Note');
      return;
    }
    if (!/^\d{2}$/.test(creatorCode)) {
      toast.error('รหัสผู้สร้างของคุณยังไม่ได้ตั้งค่า (กรุณาให้ Admin ตั้ง 2 หลัก)');
      return;
    }

    try {
      const isUpdate = !!savingId;
      let docNumber = (data.doc_number || '').trim();
      let seq = 0;

      if (isUpdate) {
        if (!docNumber) { toast.error('เลขที่เอกสารห้ามว่าง'); return; }
      } else {
        // New: ask DB for next seq, but allow user-supplied doc_number
        const { data: seqData, error: seqErr } = await supabase.rpc('next_tax_invoice_seq' as any, { _doc_date: data.doc_date });
        if (seqErr) { toast.error('ขอเลขลำดับไม่สำเร็จ: ' + seqErr.message); return; }
        seq = Number(seqData) || 1;
        if (!docNumber) docNumber = buildDocNumber(creatorCode, data.doc_date, seq);
      }

      const payload: any = {
        doc_number: docNumber,
        creator_code: creatorCode,
        doc_date: data.doc_date,
        customer_name: data.customer_name,
        customer_address: data.customer_address,
        customer_tax_id: data.customer_tax_id,
        branch_type: data.branch_type,
        branch_no: data.branch_no,
        items: data.items as any,
        total_amount: data.total_amount,
        discount: data.discount,
        amount_after_discount: data.amount_after_discount,
        vat: data.vat,
        grand_total: data.grand_total,
        amount_text: data.amount_text,
        payment_method: {
          cash: data.payment_cash,
          transfer: data.payment_transfer,
          cheque_no: data.cheque_no,
          cheque_bank: data.cheque_bank,
          cheque_date: data.cheque_date,
          cheque_amount: data.cheque_amount,
          signer_name: data.signer_name,
          signer_license: data.signer_license,
          receiver_name: data.receiver_name,
          receiver_date: data.receiver_date,
        } as any,
        notes: data.notes,
        is_backdated: isBackdated,
        backdate_note: backdateNote,
        source_image_url: sourceImageUrl,
      };

      if (isUpdate) {
        const { error } = await supabase
          .from('tax_invoices' as any)
          .update(payload)
          .eq('id', savingId);
        if (error) { toast.error('อัปเดตไม่สำเร็จ: ' + error.message); return; }
        setData(prev => ({ ...prev, doc_number: docNumber }));
        setSavedAt(new Date().toLocaleString('th-TH'));
        toast.success(`อัปเดต ${docNumber} สำเร็จ`);
        await logActivity('แก้ไขใบกำกับภาษี', 'tax_invoices', savingId, {
          doc_number: docNumber,
          grand_total: data.grand_total,
        });
      } else {
        payload.daily_seq = seq;
        payload.created_by = user?.id;
        payload.created_by_username = profile?.username || '';
        const { data: ins, error } = await supabase
          .from('tax_invoices' as any)
          .insert(payload)
          .select('id,doc_number')
          .single();
        if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return; }
        setSavingId((ins as any).id);
        setData(prev => ({ ...prev, doc_number: docNumber }));
        setSavedAt(new Date().toLocaleString('th-TH'));
        toast.success(`บันทึก ${docNumber} สำเร็จ`);
        await logActivity('สร้างใบกำกับภาษี', 'tax_invoices', (ins as any).id, {
          doc_number: docNumber,
          grand_total: data.grand_total,
          is_backdated: isBackdated,
        });
      }
      fetchList();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err?.message || ''));
    }
  };

  // ---- Edit existing (load into form) ----
  const handleEdit = async (row: InvoiceRow) => {
    const { data: full, error } = await supabase
      .from('tax_invoices' as any)
      .select('*')
      .eq('id', row.id)
      .single();
    if (error || !full) { toast.error('โหลดเอกสารไม่สำเร็จ'); return; }
    const f: any = full;
    const inv: InvoiceData = {
      doc_number: f.doc_number,
      doc_date: f.doc_date,
      customer_name: f.customer_name,
      customer_address: f.customer_address,
      customer_tax_id: f.customer_tax_id,
      branch_type: f.branch_type,
      branch_no: f.branch_no,
      items: f.items || [],
      total_amount: Number(f.total_amount),
      discount: Number(f.discount),
      amount_after_discount: Number(f.amount_after_discount),
      vat: Number(f.vat),
      grand_total: Number(f.grand_total),
      amount_text: f.amount_text,
      payment_cash: !!f.payment_method?.cash,
      payment_transfer: !!f.payment_method?.transfer,
      cheque_no: f.payment_method?.cheque_no || '',
      cheque_bank: f.payment_method?.cheque_bank || '',
      cheque_date: f.payment_method?.cheque_date || '',
      cheque_amount: Number(f.payment_method?.cheque_amount) || 0,
      notes: f.notes,
      signer_name: f.payment_method?.signer_name || 'สัจจพร สมาธิมงคล',
      signer_license: f.payment_method?.signer_license || '',
      signer_date: f.doc_date,
      receiver_name: f.payment_method?.receiver_name || '',
      receiver_date: f.payment_method?.receiver_date || '',
    };
    setData(inv);
    setIsBackdated(!!f.is_backdated);
    setBackdateNote(f.backdate_note || '');
    setSourceImageUrl(f.source_image_url || '');
    setSavingId(row.id);
    setSavedAt('');
    setUseBillTotals(false);
    setTab('new');
  };

  // ---- View existing ----
  const handleView = async (row: InvoiceRow) => {
    const { data: full, error } = await supabase
      .from('tax_invoices' as any)
      .select('*')
      .eq('id', row.id)
      .single();
    if (error || !full) { toast.error('โหลดเอกสารไม่สำเร็จ'); return; }
    const f: any = full;
    const inv: InvoiceData = {
      doc_number: f.doc_number,
      doc_date: f.doc_date,
      customer_name: f.customer_name,
      customer_address: f.customer_address,
      customer_tax_id: f.customer_tax_id,
      branch_type: f.branch_type,
      branch_no: f.branch_no,
      items: f.items || [],
      total_amount: Number(f.total_amount),
      discount: Number(f.discount),
      amount_after_discount: Number(f.amount_after_discount),
      vat: Number(f.vat),
      grand_total: Number(f.grand_total),
      amount_text: f.amount_text,
      payment_cash: !!f.payment_method?.cash,
      payment_transfer: !!f.payment_method?.transfer,
      cheque_no: f.payment_method?.cheque_no || '',
      cheque_bank: f.payment_method?.cheque_bank || '',
      cheque_date: f.payment_method?.cheque_date || '',
      cheque_amount: Number(f.payment_method?.cheque_amount) || 0,
      notes: f.notes,
      signer_name: f.payment_method?.signer_name || 'สัจจพร สมาธิมงคล',
      signer_license: f.payment_method?.signer_license || '',
      signer_date: f.doc_date,
      receiver_name: f.payment_method?.receiver_name || '',
      receiver_date: f.payment_method?.receiver_date || '',
    };
    setPrintData(inv);
    setPrintSourceImage((f as any).source_image_url || '');
    setPrintOpen(true);
  };

  const handleDelete = async (row: InvoiceRow) => {
    if (!isAdmin) { toast.error('เฉพาะ Admin เท่านั้น'); return; }
    if (!confirm(`ลบเอกสาร ${row.doc_number}?`)) return;
    const { error } = await supabase.from('tax_invoices' as any).delete().eq('id', row.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบเรียบร้อย');
    await logActivity('ลบใบกำกับภาษี', 'tax_invoices', row.id, { doc_number: row.doc_number });
    fetchList();
  };

  const previewNumber = useMemo(() => {
    if (data.doc_number) return data.doc_number;
    return buildDocNumber(creatorCode, data.doc_date, 1);
  }, [creatorCode, data.doc_date, data.doc_number]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r => {
      const dateStr = new Date(r.doc_date).toLocaleDateString('th-TH');
      const status = r.is_backdated ? 'ย้อนหลัง backdated' : 'ปกติ normal';
      const amount = Number(r.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      return [
        r.doc_number,
        r.doc_date,
        dateStr,
        r.customer_name,
        amount,
        String(r.grand_total ?? ''),
        r.created_by_username,
        status,
      ].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [list, search]);

  if (authLoading) return <div className="p-8">กำลังโหลด...</div>;
  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-background">
      <div className="nav-bar shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <FileText className="w-6 h-6 text-accent" />
            <h1 className="text-lg font-bold text-primary-foreground">ใบกำกับภาษี / ใบเสร็จรับเงิน</h1>
          </div>
          <div className="text-xs text-primary-foreground/80">
            รหัสผู้สร้าง: <span className="font-bold">{creatorCode}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 print:hidden">
        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="list"><FileText className="w-4 h-4 mr-1" /> เอกสารทั้งหมด ({filteredList.length}{search ? `/${list.length}` : ''})</TabsTrigger>
              <TabsTrigger value="new"><Plus className="w-4 h-4 mr-1" /> สร้างใหม่</TabsTrigger>
            </TabsList>
            {tab === 'list' && <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" />สร้างใหม่</Button>}
          </div>

          <TabsContent value="list">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="ค้นหา: เลขที่ / วันที่ / ลูกค้า / ยอดสุทธิ / ผู้สร้าง / สถานะ"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-md"
                />
                {search && (
                  <Button variant="ghost" size="sm" onClick={() => setSearch('')}>ล้าง</Button>
                )}
              </div>
              {loading ? <p className="text-muted-foreground">กำลังโหลด...</p> : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขที่</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead className="text-right">ยอดสุทธิ</TableHead>
                        <TableHead>ผู้สร้าง</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{search ? 'ไม่พบเอกสารตามที่ค้นหา' : 'ยังไม่มีเอกสาร'}</TableCell></TableRow>
                      )}
                      {filteredList.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono font-medium">{r.doc_number}</TableCell>
                          <TableCell>{new Date(r.doc_date).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell>{r.customer_name || '-'}</TableCell>
                          <TableCell className="text-right font-medium">{r.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-xs">{r.created_by_username}</TableCell>
                          <TableCell>
                            {r.is_backdated && <Badge variant="outline" className="text-amber-700 border-amber-500">ย้อนหลัง</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => handleView(r)} title="ดู / พิมพ์">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(r)} title="แก้ไข">
                                <Pencil className="w-4 h-4 text-primary" />
                              </Button>
                              {isAdmin && (
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(r)} title="ลบ">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="new">
            <div className="grid lg:grid-cols-[420px_1fr] gap-4">
              {/* Left: Form */}
              <div className="space-y-3">
                <Card className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">ข้อมูลเอกสาร</h3>
                    <Button size="sm" variant="outline" onClick={handleApplySample}><Sparkles className="w-3 h-3 mr-1" />ใช้ค่าตัวอย่าง</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">วันที่เอกสาร</Label>
                      <Input type="date" value={data.doc_date} onChange={e => setData(p => ({ ...p, doc_date: e.target.value, signer_date: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">รหัสผู้สร้าง (2 หลัก)</Label>
                      <Input
                        maxLength={2}
                        value={creatorCode}
                        onChange={e => setCreatorCode(e.target.value.replace(/\D/g, '').slice(0, 2).padStart(0, '0'))}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">เลขที่เอกสาร (แก้ไขได้)</Label>
                      <Input
                        value={data.doc_number || previewNumber}
                        onChange={e => setData(p => ({ ...p, doc_number: e.target.value }))}
                        placeholder={previewNumber}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                    <Checkbox id="backdate" checked={isBackdated} onCheckedChange={(v) => setIsBackdated(!!v)} />
                    <Label htmlFor="backdate" className="text-xs cursor-pointer">ออกย้อนหลัง (ต้องระบุเหตุผล)</Label>
                  </div>
                  {isBackdated && (
                    <Textarea
                      placeholder="เหตุผลการขอย้อนหลัง..."
                      value={backdateNote}
                      onChange={e => setBackdateNote(e.target.value)}
                      rows={2}
                    />
                  )}
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">อัปโหลดบิล (OCR)</h3>
                    <Button size="sm" variant="outline" onClick={onPickFile} disabled={ocrBusy}>
                      <Upload className="w-3 h-3 mr-1" />{ocrBusy ? 'กำลังอ่าน...' : 'เลือกรูป'}
                    </Button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  <p className="text-xs text-muted-foreground">รองรับ JPG/PNG ระบบจะดึง วันที่/ลูกค้า/รายการอัตโนมัติ และจะแนบเก็บรูปบิลไว้กับเอกสาร</p>
                  {sourceImageUrl && (
                    <a href={sourceImageUrl} target="_blank" rel="noreferrer" className="block">
                      <img src={sourceImageUrl} alt="บิลต้นฉบับ" className="max-h-40 rounded border" />
                    </a>
                  )}
                </Card>

                <Card className="p-3 space-y-2">
                  <h3 className="text-sm font-bold">ข้อมูลลูกค้า</h3>
                  <div>
                    <Label className="text-xs">นามลูกค้า</Label>
                    <Input value={data.customer_name} onChange={e => setData(p => ({ ...p, customer_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">ที่อยู่</Label>
                    <Textarea rows={2} value={data.customer_address} onChange={e => setData(p => ({ ...p, customer_address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">เลขผู้เสียภาษี</Label>
                      <Input value={data.customer_tax_id} onChange={e => setData(p => ({ ...p, customer_tax_id: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">สาขา</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="text-xs flex items-center gap-1">
                          <input type="radio" checked={data.branch_type === 'head'} onChange={() => setData(p => ({ ...p, branch_type: 'head' }))} /> สำนักงานใหญ่
                        </label>
                        <label className="text-xs flex items-center gap-1">
                          <input type="radio" checked={data.branch_type === 'branch'} onChange={() => setData(p => ({ ...p, branch_type: 'branch' }))} /> สาขา
                        </label>
                        {data.branch_type === 'branch' && (
                          <Input className="h-7 w-16" value={data.branch_no} onChange={e => setData(p => ({ ...p, branch_no: e.target.value }))} />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold">รายการสินค้า</h3>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setData(p => ({
                          ...p,
                          items: [{ code: 'OY-67003', description: 'ค่าอาหารและเครื่องดื่ม', qty: 1, unit: 'รายการ', price: p.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0) || (billRef.before_vat || billRef.total || 0) }],
                        }))}
                        title="ใช้รายการ Standard: OY-67003 ค่าอาหารและเครื่องดื่ม รวมยอดเป็นราคา/หน่วย"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />Standard
                      </Button>
                      <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3 h-3 mr-1" />เพิ่มแถว</Button>
                    </div>
                  </div>
                  {data.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1.1fr_minmax(0,4fr)_0.7fr_0.9fr_1.3fr_auto] gap-1 items-center">
                      <Input className="h-8 text-xs" placeholder="รหัส" value={it.code} onChange={e => updateItem(i, { code: e.target.value })} />
                      <Input className="h-8 text-xs w-full" placeholder="รายละเอียด" value={it.description} onChange={e => updateItem(i, { description: e.target.value })} />
                      <Input className="h-8 text-xs" type="number" placeholder="จำนวน" value={it.qty || ''} onChange={e => updateItem(i, { qty: Number(e.target.value) || 0 })} />
                      <Input className="h-8 text-xs" placeholder="หน่วย" value={it.unit} onChange={e => updateItem(i, { unit: e.target.value })} />
                      <Input className="h-8 text-xs" type="number" placeholder="ราคา/หน่วย" value={it.price || ''} onChange={e => updateItem(i, { price: Number(e.target.value) || 0 })} />
                      <Button size="icon" variant="ghost" onClick={() => removeRow(i)} className="h-7 w-7"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  ))}
                </Card>

                <Card className="p-3 space-y-2 border-blue-300 bg-blue-50/30 dark:bg-blue-950/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">ค่าตามใบเสร็จ (อ้างอิง — ไม่แสดงใน PDF)</h3>
                    <label className="text-xs flex items-center gap-1">
                      <Checkbox checked={useBillTotals} onCheckedChange={(v) => setUseBillTotals(!!v)} />
                      ใช้ยอดนี้แทนการคำนวณ
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['subtotal', 'Subtotal'],
                      ['service_charge', 'Service Charge (10%)'],
                      ['rounding', 'Rounding'],
                      ['total', 'Total (รวมทั้งสิ้น)'],
                      ['before_vat', 'Before VAT'],
                      ['vat_amount', 'VAT 7%'],
                      ['before_service_charge', 'Before Service Charge'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={(billRef as any)[key] || ''}
                          onChange={e => setBillRef(p => ({ ...p, [key]: Number(e.target.value) || 0 }))}
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-3 space-y-2">
                  <h3 className="text-sm font-bold">การชำระเงิน / สรุปยอด</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs flex items-center gap-1">
                      <Checkbox checked={data.payment_cash} onCheckedChange={(v) => setData(p => ({ ...p, payment_cash: !!v }))} /> เงินสด
                    </label>
                    <label className="text-xs flex items-center gap-1">
                      <Checkbox checked={data.payment_transfer} onCheckedChange={(v) => setData(p => ({ ...p, payment_transfer: !!v }))} /> เงินโอน
                    </label>
                  </div>
                  <div>
                    <Label className="text-xs">ส่วนลด / เงินมัดจำ</Label>
                    <Input type="number" value={data.discount || ''} onChange={e => setData(p => ({ ...p, discount: Number(e.target.value) || 0 }))} />
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                    <div className="flex justify-between"><span>รวมเงิน</span><span>{data.total_amount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>หลังหักส่วนลด</span><span>{data.amount_after_discount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>VAT 7% (รวมในยอด)</span><span>{data.vat.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-sm"><span>ยอดสุทธิ</span><span>{data.grand_total.toFixed(2)}</span></div>
                  </div>
                  <div>
                    <Label className="text-xs">หมายเหตุ (เว้นว่าง = ใช้ข้อความมาตรฐาน)</Label>
                    <Textarea rows={2} value={data.notes} onChange={e => setData(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </Card>

                <Card className="p-3 space-y-2">
                  <h3 className="text-sm font-bold">ผู้ส่ง / ผู้รับสินค้า</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">ชื่อผู้ส่งสินค้า</Label>
                      <Input value={data.signer_name} onChange={e => setData(p => ({ ...p, signer_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">เลขที่ใบอนุญาต (License)</Label>
                      <Input value={data.signer_license} onChange={e => setData(p => ({ ...p, signer_license: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">ชื่อผู้รับสินค้า</Label>
                      <Input value={data.receiver_name} onChange={e => setData(p => ({ ...p, receiver_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">วันที่ผู้รับ</Label>
                      <Input type="date" value={data.receiver_date} onChange={e => setData(p => ({ ...p, receiver_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-1 space-y-1">
                    <Label className="text-xs font-semibold">ลายเซ็น/ตราประทับ "ในนาม บริษัท" (PNG)</Label>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => companySigFileRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-1" />เลือกรูป PNG
                      </Button>
                      {companySignature && (
                        <>
                          <img src={companySignature} alt="ลายเซ็นบริษัท" className="h-8 border rounded bg-white" />
                          <Button size="sm" variant="ghost" onClick={() => { setCompanySignature(''); try { localStorage.removeItem('ti_company_signature'); } catch {} }}>
                            ลบ
                          </Button>
                        </>
                      )}
                      <input ref={companySigFileRef} type="file" accept="image/png,image/*" className="hidden" onChange={handleCompanySignatureFile} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">แนะนำ PNG พื้นหลังโปร่งใส จะแสดงในช่อง "ในนาม บริษัท" ของเอกสาร (ฉบับต้นฉบับ)</p>
                  </div>
                </Card>


                <div className="flex gap-2 sticky bottom-2">
                  <Button className="flex-1" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />{savingId ? 'อัปเดตเอกสาร' : 'บันทึกเอกสาร'}
                  </Button>
                  <Button variant="outline" onClick={() => { setPrintData({ ...data, doc_number: data.doc_number || previewNumber }); setPrintSourceImage(sourceImageUrl); setPrintOpen(true); }}>
                    <Eye className="w-4 h-4 mr-1" />ดูตัวอย่าง
                  </Button>
                </div>
                {savedAt && <p className="text-xs text-green-700">บันทึก: {savedAt} — กด "ดูตัวอย่าง" เพื่อพิมพ์</p>}
              </div>

              {/* Right: Live preview (single doc, scaled) */}
              <div className="space-y-2">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-2">ตัวอย่างใบกำกับ (ต้นฉบับ)</p>
                  <div className="overflow-auto bg-gray-200 p-2 rounded" style={{ maxHeight: '80vh' }}>
                    <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '210mm' }}>
                      <TaxInvoiceDoc data={{ ...data, doc_number: previewNumber }} copy="original" companySignature={companySignature} />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Print Dialog: shows 3 copies */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-[230mm] max-h-[95vh] overflow-auto p-2 print:hidden">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>ตัวอย่างเอกสาร 3 ชุด (A4 ต่อหน้า)</span>
              <PrintActions printAreaId="tax-invoice-print-area" title={`Tax-Invoice - ${printData?.doc_number || 'preview'}`} />
            </DialogTitle>
          </DialogHeader>
          {printSourceImage && (
            <div className="print:hidden mb-2 p-2 border rounded bg-muted/30">
              <p className="text-xs font-bold mb-1">บิลต้นฉบับที่แนบ:</p>
              <a href={printSourceImage} target="_blank" rel="noreferrer">
                <img src={printSourceImage} alt="บิลต้นฉบับ" className="max-h-60 rounded border" />
              </a>
            </div>
          )}
          {printData && (
            <div id="tax-invoice-print-area" className="ti-print-area" ref={printRef}>
              <div className="ti-print-root">
                <TaxInvoiceDoc data={printData} copy="original" companySignature={companySignature} />
                <TaxInvoiceDoc data={printData} copy="company" companySignature={companySignature} />
                <TaxInvoiceDoc data={printData} copy="accounting" companySignature={companySignature} />
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden gap-2">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>ปิด</Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const el = document.getElementById('tax-invoice-print-area');
                if (!el) { toast.error('ไม่พบเนื้อหา'); return; }
                const title = `Tax-Invoice - ${printData?.doc_number || 'preview'}`;
                const prev = document.title;
                document.title = title;
                const headHtml = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
                  .map(n => n.outerHTML).join('\n');
                const iframe = document.createElement('iframe');
                Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', opacity: '0' });
                document.body.appendChild(iframe);
                const doc = iframe.contentDocument!;
                doc.open();
                doc.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title.replace(/[<>]/g,'')}</title>${headHtml}<style>html,body{margin:0;padding:0;background:#fff}@page{margin:8mm}[data-print-hide="true"],.print\\:hidden{display:none!important}</style></head><body><div id="host"></div></body></html>`);
                doc.close();
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('[data-print-hide="true"], .print\\:hidden').forEach(n => n.remove());
                doc.getElementById('host')!.appendChild(clone);
                const trigger = () => {
                  try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
                  finally {
                    setTimeout(() => { iframe.remove(); document.title = prev; }, 1000);
                  }
                };
                const imgs = Array.from(clone.querySelectorAll('img'));
                if (imgs.length === 0) { setTimeout(trigger, 150); return; }
                let remaining = imgs.length;
                const done = () => { if (--remaining <= 0) setTimeout(trigger, 150); };
                imgs.forEach(img => { if ((img as HTMLImageElement).complete) done(); else { img.addEventListener('load', done); img.addEventListener('error', done); } });
                setTimeout(() => { if (remaining > 0) { remaining = 0; trigger(); } }, 5000);
              }}
            >
              <FileDown className="w-4 h-4 mr-2" />
              บันทึกเป็น PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Always-rendered print area for window.print() */}
      {printOpen && printData && (
        <div className="ti-print-area hidden print:block">
          <div className="ti-print-root">
            <TaxInvoiceDoc data={printData} copy="original" companySignature={companySignature} />
            <TaxInvoiceDoc data={printData} copy="company" companySignature={companySignature} />
            <TaxInvoiceDoc data={printData} copy="accounting" companySignature={companySignature} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxInvoicePage;
