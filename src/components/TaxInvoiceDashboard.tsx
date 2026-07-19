import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Coins, Receipt, Percent, Download, TrendingUp, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';


interface Row {
  id: string;
  doc_number: string;
  doc_date: string;
  customer_name: string;
  total_amount: number;
  vat: number;
  grand_total: number;
  created_by_username: string;
  is_backdated: boolean;
}

type Preset = 'today' | 'week' | 'month' | 'year' | 'custom';

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getRange(preset: Preset, pickYear?: number, pickMonth?: number): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now); to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  if (preset === 'today') { /* same */ }
  else if (preset === 'week') { const dow = (from.getDay() + 6) % 7; from.setDate(from.getDate() - dow); }
  else if (preset === 'month') {
    const y = pickYear ?? now.getFullYear();
    const m = pickMonth ?? (now.getMonth() + 1);
    const last = new Date(y, m, 0).getDate();
    return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m - 1, last)) };
  }
  else if (preset === 'year') {
    const y = pickYear ?? now.getFullYear();
    return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
  }
  return { from: iso(from), to: iso(to) };
}

const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const TaxInvoiceDashboard = ({ onView }: { onView?: (id: string) => void } = {}) => {
  const now = new Date();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('month');
  const [pickYear, setPickYear] = useState<number>(now.getFullYear());
  const [pickMonth, setPickMonth] = useState<number>(now.getMonth() + 1);
  const [customFrom, setCustomFrom] = useState(iso(new Date()));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [customer, setCustomer] = useState<string>('all');
  const [creator, setCreator] = useState<string>('all');
  const [detailCustomer, setDetailCustomer] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tax_invoices' as any)
        .select('id,doc_number,doc_date,customer_name,total_amount,vat,grand_total,created_by_username,is_backdated')
        .order('doc_date', { ascending: false })
        .limit(5000);
      setRows(((data as any[]) || []).map(r => ({
        ...r,
        total_amount: Number(r.total_amount) || 0,
        vat: Number(r.vat) || 0,
        grand_total: Number(r.grand_total) || 0,
      })));
      setLoading(false);
    })();
  }, []);

  const range = useMemo(() => {
    if (preset === 'custom') return { from: customFrom, to: customTo };
    return getRange(preset, pickYear, pickMonth);
  }, [preset, customFrom, customTo, pickYear, pickMonth]);

  const years = useMemo(() => {
    const ys = new Set<number>(rows.map(r => Number((r.doc_date || '').slice(0, 4))).filter(Boolean));
    ys.add(now.getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [rows]);

  const customers = useMemo(() => Array.from(new Set(rows.map(r => r.customer_name).filter(Boolean))).sort(), [rows]);
  const creators = useMemo(() => Array.from(new Set(rows.map(r => r.created_by_username).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (r.doc_date < range.from || r.doc_date > range.to) return false;
    if (customer !== 'all' && r.customer_name !== customer) return false;
    if (creator !== 'all' && r.created_by_username !== creator) return false;
    return true;
  }), [rows, range, customer, creator]);

  const kpi = useMemo(() => {
    const grand = filtered.reduce((s, r) => s + r.grand_total, 0);
    const sub = filtered.reduce((s, r) => s + r.total_amount, 0);
    const vat = filtered.reduce((s, r) => s + r.vat, 0);
    return { count: filtered.length, grand, sub, vat };
  }, [filtered]);

  const byDay = useMemo(() => {
    const m = new Map<string, { date: string; count: number; total: number }>();
    filtered.forEach(r => {
      const k = r.doc_date;
      const cur = m.get(k) || { date: k, count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.grand_total;
      m.set(k, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const byCustomer = useMemo(() => {
    const m = new Map<string, { name: string; count: number; total: number }>();
    filtered.forEach(r => {
      const k = r.customer_name || '(ไม่ระบุ)';
      const cur = m.get(k) || { name: k, count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.grand_total;
      m.set(k, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byCreator = useMemo(() => {
    const m = new Map<string, { name: string; count: number; total: number }>();
    filtered.forEach(r => {
      const k = r.created_by_username || '(ไม่ระบุ)';
      const cur = m.get(k) || { name: k, count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.grand_total;
      m.set(k, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const compareCards = useMemo(() => {
    const mk = (p: Preset) => {
      const r = getRange(p);
      const f = rows.filter(x => x.doc_date >= r.from && x.doc_date <= r.to);
      return { count: f.length, total: f.reduce((s, x) => s + x.grand_total, 0) };
    };
    return { today: mk('today'), week: mk('week'), year: mk('year') };
  }, [rows]);

  const exportCsv = () => {
    const header = ['เลขที่', 'วันที่', 'ลูกค้า', 'ยอดก่อน VAT', 'VAT', 'ยอดสุทธิ', 'ผู้สร้าง'];
    const lines = [header.join(',')];
    filtered.forEach(r => {
      lines.push([
        r.doc_number,
        r.doc_date,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        r.total_amount, r.vat, r.grand_total,
        r.created_by_username,
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-invoice-report-${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-muted-foreground p-4">กำลังโหลด...</p>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs">ช่วงเวลา</Label>
            <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="week">สัปดาห์นี้</SelectItem>
                <SelectItem value="month">เดือนที่ระบุ</SelectItem>
                <SelectItem value="year">ปีที่ระบุ</SelectItem>
                <SelectItem value="custom">กำหนดเอง</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === 'month' && (
            <>
              <div>
                <Label className="text-xs">ปี (YYYY)</Label>
                <Select value={String(pickYear)} onValueChange={v => setPickYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">เดือน (MM)</Label>
                <Select value={String(pickMonth)} onValueChange={v => setPickMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TH_MONTHS.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {String(i + 1).padStart(2, '0')} - {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {preset === 'year' && (
            <div>
              <Label className="text-xs">ปี (YYYY)</Label>
              <Select value={String(pickYear)} onValueChange={v => setPickYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">จากวันที่</Label>
            <Input type="date" value={preset === 'custom' ? customFrom : range.from}
              onChange={e => { setPreset('custom'); setCustomFrom(e.target.value); }} />
          </div>
          <div>
            <Label className="text-xs">ถึงวันที่</Label>
            <Input type="date" value={preset === 'custom' ? customTo : range.to}
              onChange={e => { setPreset('custom'); setCustomTo(e.target.value); }} />
          </div>
          <div>
            <Label className="text-xs">ลูกค้า / บริษัท</Label>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">ผู้สร้าง</Label>
            <Select value={creator} onValueChange={setCreator}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {creators.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard icon={FileText} label="จำนวนเอกสาร" value={kpi.count.toLocaleString()} suffix="ใบ" />
        <KpiCard icon={Coins} label="ยอดสุทธิรวม" value={fmt(kpi.grand)} suffix="บาท" accent />
        <KpiCard icon={Receipt} label="ยอดก่อน VAT" value={fmt(kpi.sub)} suffix="บาท" />
        <KpiCard icon={Percent} label="VAT รวม" value={fmt(kpi.vat)} suffix="บาท" />
      </div>

      {/* Compare */}
      <div className="grid gap-3 md:grid-cols-3">
        <CompareCard label="วันนี้" data={compareCards.today} />
        <CompareCard label="สัปดาห์นี้" data={compareCards.week} />
        <CompareCard label="ปีนี้" data={compareCards.year} />
      </div>

      {/* Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> สรุปรายวัน</h3>
        {byDay.length === 0 ? (
          <p className="text-muted-foreground text-sm">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: any, name: string) => name === 'total' ? fmt(Number(v)) : v}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="count" name="จำนวนใบ" fill="hsl(var(--primary))" />
                <Bar yAxisId="right" dataKey="total" name="ยอดสุทธิ" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Tables */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-2">Top ลูกค้า / บริษัท</h3>
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCustomer.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">ไม่มีข้อมูล</TableCell></TableRow>
                )}
                {byCustomer.slice(0, 10).map(c => (
                  <TableRow
                    key={c.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { setDetailCustomer(c.name); setExpandedId(null); }}
                  >
                    <TableCell className="text-sm text-primary underline-offset-2 hover:underline">{c.name}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold mb-2">สรุปตามผู้สร้าง</h3>
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้สร้าง</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCreator.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">ไม่มีข้อมูล</TableCell></TableRow>
                )}
                {byCreator.map(c => (
                  <TableRow key={c.name}>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, suffix, accent }: {
  icon: any; label: string; value: string; suffix: string; accent?: boolean;
}) => (
  <Card className={`p-4 ${accent ? 'border-accent bg-accent/5' : ''}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold truncate">{value} <span className="text-xs font-normal text-muted-foreground">{suffix}</span></p>
      </div>
    </div>
  </Card>
);

const CompareCard = ({ label, data }: { label: string; data: { count: number; total: number } }) => (
  <Card className="p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="flex items-baseline justify-between mt-1">
      <p className="text-lg font-bold">{data.count} <span className="text-xs font-normal text-muted-foreground">ใบ</span></p>
      <p className="text-base font-semibold text-primary">{fmt(data.total)}</p>
    </div>
  </Card>
);

export default TaxInvoiceDashboard;
