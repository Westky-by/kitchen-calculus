## เป้าหมาย
ลบเมนู/หน้า "ใบสั่งซื้อ (สร้างรายการสั่งซื้อวัตถุดิบ)" ออกจากแอป โดยไม่กระทบ Module อื่น

## จุดที่ต้องแก้ (พบจากการค้นหาแล้ว 3 ไฟล์เท่านั้น)

1. **`src/components/AppNavbar.tsx`**
   - ลบรายการแท็บ `{ id: 'orders', label: 'ใบสั่งซื้อ', icon: ShoppingCart }` (บรรทัด 25)
   - ลบ `'orders'` ออกจาก type `TabType` (บรรทัด 7)
   - ลบ import ไอคอน `ShoppingCart` ที่ไม่ได้ใช้แล้ว

2. **`src/pages/Index.tsx`**
   - ลบ `import PurchaseOrderView from '@/components/PurchaseOrderView';` (บรรทัด 10)
   - ลบ block เงื่อนไข `{activeTab === 'orders' && ( <PurchaseOrderView ... /> )}` (บรรทัด 132-134)

3. **`src/components/PurchaseOrderView.tsx`**
   - ลบไฟล์ทิ้ง (ไม่มีที่อื่นอ้างถึง — ตรวจแล้วด้วย `rg`)

## สิ่งที่ไม่แตะ
- ตาราง/ข้อมูลใน database (ไม่มี table `purchase_order` — ตรวจจาก schema แล้ว)
- ไม่แตะ Module: คำนวณสูตร, ฐานข้อมูลวัตถุดิบ, สูตรที่บันทึก, หมวดหมู่, ใบกำกับภาษี, Admin
- ไม่แตะ routing อื่น ๆ

## การตรวจสอบก่อน/หลัง
- ค้นด้วย `rg "PurchaseOrder|purchase-order|orders" src/` เพื่อยืนยันไม่มี reference ค้าง
- Build check ผ่าน typecheck (TabType ไม่มี `'orders'` แล้ว)
