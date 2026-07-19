## เพิ่ม Tab "Dashboard สรุป" ในหน้าใบกำกับภาษี/ใบเสร็จรับเงิน

### ภาพรวม
เพิ่ม tab ใหม่ในหน้า `/tax-invoice` (ปัจจุบันมี tab "สร้างเอกสาร" และ "เอกสารทั้งหมด") ชื่อ **"Dashboard สรุป"** เพื่อแสดง report สรุปยอดใบกำกับภาษี/ใบเสร็จแบบ interactive

### ส่วนประกอบของ Dashboard

**1. ตัวกรอง (Filters) — แถวบนสุด**
- ช่วงเวลา (Preset): วันนี้ / สัปดาห์นี้ / เดือนนี้ / ปีนี้ / กำหนดเอง
- Date range picker (จากวันที่ – ถึงวันที่) เมื่อเลือก "กำหนดเอง"
- ค้นหาบริษัท/ลูกค้า (dropdown + search จากรายชื่อลูกค้าที่มีในระบบ)
- ผู้สร้าง (dropdown เลือก username)

**2. KPI Cards — 4 การ์ดสรุป**
- จำนวนเอกสารทั้งหมด (ใบ)
- ยอดรวมสุทธิ (Grand Total)
- ยอดก่อน VAT (Subtotal)
- ยอด VAT รวม

**3. กราฟ/ตารางสรุป**
- **สรุปรายวัน**: bar chart แสดงจำนวนเอกสาร + ยอดเงินต่อวัน ในช่วงที่เลือก
- **สรุปตามลูกค้า/บริษัท**: ตาราง Top 10 บริษัท (ชื่อ, จำนวนใบ, ยอดรวม) พร้อม sort
- **สรุปตามผู้สร้าง**: ตารางแยกตาม username (จำนวนใบ, ยอดรวม)
- **สรุปเปรียบเทียบ**: การ์ดเล็ก 3 ใบ – วันนี้ / สัปดาห์นี้ / ปีนี้ (จำนวน + ยอดรวม) เพื่อดูภาพรวมเสมอ

**4. ปุ่ม Export**
- Export CSV ของข้อมูลที่กรองอยู่ (สำหรับนำไปใช้ต่อ)

### รายละเอียดทางเทคนิค

- แก้ไข `src/pages/TaxInvoice.tsx`:
  - เพิ่ม `<TabsTrigger value="dashboard">` และ `<TabsContent value="dashboard">`
  - Query `tax_invoices` ตามช่วงวันที่ที่เลือก (ใช้ `doc_date` range) แล้วคำนวณ aggregate ฝั่ง client (dataset ไม่ใหญ่)
  - ใช้ `useMemo` คำนวณ KPI, group-by วัน, group-by ลูกค้า, group-by ผู้สร้าง
- สร้าง component ย่อย `src/components/TaxInvoiceDashboard.tsx` เพื่อไม่ให้ไฟล์ TaxInvoice.tsx บวมเกินไป
- กราฟใช้ `recharts` (มีอยู่แล้วใน shadcn stack); ถ้ายังไม่ได้ติดตั้ง จะติดตั้งเพิ่ม
- ใช้ semantic color tokens จาก `index.css` (ไม่ hardcode สี)
- ไม่แตะ schema/DB — ใช้ตาราง `tax_invoices` เดิม

### สิ่งที่ไม่ทำ
- ไม่แก้ไข layout ของหน้า print/PDF ใบกำกับภาษี
- ไม่แตะ tab "สร้างเอกสาร" และ "เอกสารทั้งหมด" (ยกเว้นเพิ่ม tab ใหม่เข้าไปใน TabsList)
