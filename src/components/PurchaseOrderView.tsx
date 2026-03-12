import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import { toast } from 'sonner';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [orderNumber, setOrderNumber] = useState(`PO-${Date.now().toString(36).toUpperCase()}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');

  const filteredIngredients = useMemo(() => {
    if (!searchTerm) return ingredients;
    const lower = searchTerm.toLowerCase();
    return ingredients.filter(
      i => i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower)
    );
  }, [ingredients, searchTerm]);

  const addItem = () => {
    if (!selectedIngredient) {
      toast.warning('กรุณาเลือกวัตถุดิบ');
      return;
    }
    const ing = ingredients.find(i => i.id === selectedIngredient);
    if (!ing) return;

    if (orderItems.some(item => item.ingredientId === ing.id)) {
      toast.warning(`"${ing.name}" อยู่ในรายการแล้ว`);
      return;
    }

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      ingredientId: ing.id,
      name: ing.name,
      code: ing.code,
      qty: ing.purchase_qty,
      unit: ing.purchase_unit,
      pricePerUnit: ing.purchase_price,
      total: ing.purchase_qty * ing.purchase_price,
    };

    setOrderItems(prev => [...prev, newItem]);
    setSelectedIngredient('');
    setSearchTerm('');
    toast.success(`เพิ่ม "${ing.name}" ในรายการสั่งซื้อ`);
  };

  const removeItem = (id: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemQty = (id: string, qty: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, qty, total: qty * item.pricePerUnit }
          : item
      )
    );
  };

  const updateItemPrice = (id: string, pricePerUnit: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, pricePerUnit, total: item.qty * pricePerUnit }
          : item
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

      {/* Print area */}
      <div id="purchase-order-print" className="space-y-4">
        {/* Order Info */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">เลขที่ใบสั่งซื้อ</label>
                <Input
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">วันที่</label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">ชื่อผู้จำหน่าย</label>
                <Input
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="ระบุชื่อร้าน/ผู้จำหน่าย"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">หมายเหตุ</label>
                <Input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="บันทึกเพิ่มเติม"
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Item */}
        <Card data-print-hide="true">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">เลือกวัตถุดิบ</label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาวัตถุดิบ..."
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกจากรายการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredIngredients.map(ing => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.code ? `[${ing.code}] ` : ''}{ing.name} — {ing.purchase_unit}
                      </SelectItem>
                    ))}
                    {filteredIngredients.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">ไม่พบวัตถุดิบ</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addItem} className="h-9">
                <Plus className="w-4 h-4 mr-1" /> เพิ่ม
              </Button>
            </div>
          </CardContent>
        </Card>

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
                            className="h-8 w-24 text-center text-sm mx-auto print:border-none print:bg-transparent"
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.pricePerUnit}
                            onChange={e => updateItemPrice(item.id, Number(e.target.value))}
                            className="h-8 w-28 text-right text-sm ml-auto print:border-none print:bg-transparent"
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
                    {/* Grand Total Row */}
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
