import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, ShoppingCart, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types/recipe';
import PrintActions from './PrintActions';

interface OrderItem {
  id: string;
  ingredientId: string;
  name: string;
  code: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  total: number;
}

interface PurchaseOrderViewProps {
  ingredients: Ingredient[];
}

const PurchaseOrderView = ({ ingredients }: PurchaseOrderViewProps) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState(`PO-${Date.now().toString(36).toUpperCase()}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');

  const selectedIng = useMemo(
    () => ingredients.find(i => i.id === selectedIngredient),
    [ingredients, selectedIngredient]
  );

  const addItem = () => {
    if (!selectedIng) {
      toast.warning('กรุณาเลือกวัตถุดิบ');
      return;
    }

    if (orderItems.some(item => item.ingredientId === selectedIng.id)) {
      toast.warning(`"${selectedIng.name}" อยู่ในรายการแล้ว`);
      return;
    }

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      ingredientId: selectedIng.id,
      name: selectedIng.name,
      code: selectedIng.code,
      qty: selectedIng.purchaseQty,
      unit: selectedIng.purchaseUnit,
      pricePerUnit: selectedIng.purchasePrice,
      total: selectedIng.purchaseQty * selectedIng.purchasePrice,
    };

    setOrderItems(prev => [...prev, newItem]);
    setSelectedIngredient('');
    toast.success(`เพิ่ม "${selectedIng.name}" ในรายการสั่งซื้อ`);
  };

  const removeItem = (id: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemQty = (id: string, qty: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty, total: qty * item.pricePerUnit } : item
      )
    );
  };

  const updateItemPrice = (id: string, pricePerUnit: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, pricePerUnit, total: item.qty * pricePerUnit } : item
      )
    );
  };

  const grandTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.total, 0),
    [orderItems]
  );

  const clearOrder = () => {
    setOrderItems([]);
    setOrderNumber(`PO-${Date.now().toString(36).toUpperCase()}`);
    setSupplierName('');
    setNote('');
    toast.info('ล้างรายการสั่งซื้อแล้ว');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">ใบสั่งซื้อ</h2>
            <p className="text-xs text-muted-foreground">สร้างรายการสั่งซื้อวัตถุดิบ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PrintActions printAreaId="purchase-order-print" title={`ใบสั่งซื้อ-${orderNumber}`} />
          <Button variant="outline" size="sm" onClick={clearOrder}>
            ล้างรายการ
          </Button>
        </div>
      </div>

      {/* Order Info — editable (hidden in print) */}
      <Card data-print-hide="true">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">เลขที่ใบสั่งซื้อ</label>
              <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">วันที่</label>
              <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ชื่อผู้จำหน่าย</label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ระบุชื่อร้าน/ผู้จำหน่าย" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">หมายเหตุ</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกเพิ่มเติม" className="mt-1 h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item — hidden in print */}
      <Card data-print-hide="true">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">เลือกวัตถุดิบ</label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between mt-1 h-9 text-sm font-normal"
                  >
                    {selectedIng
                      ? `${selectedIng.code ? `[${selectedIng.code}] ` : ''}${selectedIng.name}`
                      : 'พิมพ์ค้นหาหรือเลือกวัตถุดิบ...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="ค้นหาชื่อหรือรหัสวัตถุดิบ..." />
                    <CommandList>
                      <CommandEmpty>ไม่พบวัตถุดิบ</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {ingredients.map(ing => (
                          <CommandItem
                            key={ing.id}
                            value={`${ing.code} ${ing.name}`}
                            onSelect={() => {
                              setSelectedIngredient(ing.id === selectedIngredient ? '' : ing.id);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedIngredient === ing.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {ing.code ? `[${ing.code}] ` : ''}{ing.name} — {ing.purchaseUnit}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button size="sm" onClick={addItem} className="h-9">
              <Plus className="w-4 h-4 mr-1" /> เพิ่ม
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print area */}
      <div id="purchase-order-print" className="space-y-4">
        {/* Order Info for print — plain text */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-foreground">ใบสั่งซื้อวัตถุดิบ</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <p><span className="font-medium text-muted-foreground">เลขที่:</span> <span className="font-semibold">{orderNumber}</span></p>
            <p><span className="font-medium text-muted-foreground">วันที่:</span> <span className="font-semibold">{formatDate(orderDate)}</span></p>
            <p><span className="font-medium text-muted-foreground">ผู้จำหน่าย:</span> <span className="font-semibold">{supplierName || '-'}</span></p>
            <p><span className="font-medium text-muted-foreground">หมายเหตุ:</span> <span className="font-semibold">{note || '-'}</span></p>
          </div>
        </div>

        {/* Order Table */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>รายการสั่งซื้อ ({orderItems.length} รายการ)</span>
              <span className="text-base font-bold text-accent">
                รวมทั้งสิ้น: ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {orderItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">ยังไม่มีรายการสั่งซื้อ</p>
                <p className="text-xs">เลือกวัตถุดิบจากด้านบนเพื่อเพิ่มรายการ</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อวัตถุดิบ</TableHead>
                      <TableHead className="text-center w-28">จำนวน</TableHead>
                      <TableHead className="text-center">หน่วย</TableHead>
                      <TableHead className="text-right w-32">ราคา/หน่วย</TableHead>
                      <TableHead className="text-right">รวม (฿)</TableHead>
                      <TableHead className="w-10 print:hidden" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-mono">{item.code || '-'}</TableCell>
                        <TableCell className="font-medium text-sm">{item.name}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={e => updateItemQty(item.id, Number(e.target.value))}
                            className="h-8 w-24 text-center text-sm mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.pricePerUnit}
                            onChange={e => updateItemPrice(item.id, Number(e.target.value))}
                            className="h-8 w-28 text-right text-sm ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="print:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={6} className="text-right text-sm">
                        รวมทั้งสิ้น
                      </TableCell>
                      <TableCell className="text-right text-base text-accent">
                        ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="print:hidden" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer for print */}
        {orderItems.length > 0 && (
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t text-sm text-muted-foreground">
            <div>
              <p className="mb-8">ผู้สั่งซื้อ: ____________________________</p>
              <p>วันที่: ____________________________</p>
            </div>
            <div>
              <p className="mb-8">ผู้อนุมัติ: ____________________________</p>
              <p>วันที่: ____________________________</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderView;
