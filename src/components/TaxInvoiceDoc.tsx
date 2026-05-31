import logo from '@/assets/drs-logo.png';
import stamp from '@/assets/drs-stamp.png';
import signature from '@/assets/drs-signature.png';

export interface InvoiceItem {
  code: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
}

export interface InvoiceData {
  doc_number: string;
  doc_date: string;
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  branch_type: 'head' | 'branch';
  branch_no: string;
  items: InvoiceItem[];
  total_amount: number;
  discount: number;
  amount_after_discount: number;
  vat: number;
  grand_total: number;
  amount_text: string;
  payment_cash: boolean;
  payment_transfer: boolean;
  cheque_no: string;
  cheque_bank: string;
  cheque_date: string;
  cheque_amount: number;
  notes: string;
  signer_name: string;
  signer_license: string;
  signer_date: string;
  receiver_name: string;
  receiver_date: string;
}

type CopyType = 'original' | 'company' | 'accounting';

const COPY_LABELS: Record<CopyType, { th: string; en: string; box: string }> = {
  original: { th: 'ใบกำกับภาษี / ใบเสร็จรับเงิน', en: 'TAX INVOICE  /  RECEIPT', box: 'ต้นฉบับ\nORIGINAL\nเอกสารออกเป็นชุด' },
  company:  { th: 'ใบกำกับภาษี / ใบเสร็จรับเงิน', en: 'TAX INVOICE  /  RECEIPT', box: 'สำหรับบริษัท' },
  accounting:{ th: 'สำเนาใบกำกับภาษี / ใบเสร็จรับเงิน', en: 'COPY TAX INVOICE  /  RECEIPT', box: 'สำหรับบัญชี' },
};

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtThaiDate(d: string): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const day = dt.getDate();
  const month = dt.getMonth() + 1;
  const buddhistYear = (dt.getFullYear() + 543).toString().slice(-2);
  return `${day}/${month}/${buddhistYear}`;
}

export default function TaxInvoiceDoc({ data, copy = 'original' }: { data: InvoiceData; copy?: CopyType }) {
  const label = COPY_LABELS[copy];
  const showStamp = copy !== 'accounting';
  const showSignature = copy === 'original';

  // Pad to 10 rows for the table
  const rows: (InvoiceItem | null)[] = [];
  for (let i = 0; i < 10; i++) rows.push(data.items[i] ?? null);

  return (
    <div className="ti-doc">
      {/* Header */}
      <div className="ti-header">
        <img src={logo} alt="logo" className="ti-logo" />
        <div className="ti-company">
          <div className="ti-company-th">บริษัท ดีรวยสุข จำกัด</div>
          <div className="ti-company-en">DEE RUAY SOOK CO.,LTD.</div>
          <div className="ti-company-addr">
            สำนักงานใหญ่ : เลขที่ 166 ถนนพุทธมณฑลสาย 1 แขวงบางด้วน เขตภาษีเจริญ กรุงเทพฯ 10160
          </div>
          <div className="ti-company-addr">
            Head Office : No.166 Phutthamonthon Sai 1 Road, Bang Duan Subdistrict, Phasi Charoen District, Bangkok 10160
          </div>
          <div className="ti-company-addr">
            โทร. 094-694-1117 เลขประจำตัวผู้เสียภาษี 0105563140708
          </div>
        </div>
        <div className="ti-corner-box">
          {label.box.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      {/* Title pill */}
      <div className="ti-title-row">
        <div className={`ti-title-pill ti-pill-${copy}`}>
          <div className="ti-title-th">{label.th}</div>
          <div className="ti-title-en">{label.en}</div>
        </div>
      </div>

      {/* Customer + doc no */}
      <div className="ti-customer">
        <div className="ti-cust-left">
          <div className="ti-cust-row"><span className="ti-cust-lbl">นามลูกค้า</span><span className="ti-cust-val">{data.customer_name}</span></div>
          <div className="ti-cust-row"><span className="ti-cust-lbl">ที่อยู่</span><span className="ti-cust-val">{data.customer_address}</span></div>
          <div className="ti-cust-row">
            <span className="ti-cust-lbl">เลขประจำตัวผู้เสียภาษี</span>
            <span className="ti-cust-val ti-cust-taxid">{data.customer_tax_id}</span>
            <span className="ti-cb"><span className={`ti-cb-mark ${data.branch_type === 'head' ? 'on' : ''}`} />สำนักงานใหญ่</span>
            <span className="ti-cb"><span className={`ti-cb-mark ${data.branch_type === 'branch' ? 'on' : ''}`} />สาขาที่ {data.branch_no}</span>
          </div>
        </div>
        <div className="ti-cust-right">
          <div className="ti-docno"><span className="ti-docno-lbl">เลขที่</span><span className="ti-docno-val">{data.doc_number}</span></div>
          <div className="ti-docno"><span className="ti-docno-lbl">วันที่</span><span className="ti-docno-val">{fmtThaiDate(data.doc_date)}</span></div>
        </div>
      </div>

      {/* Items table */}
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>ลำดับ</th>
              <th style={{ width: '14%' }}>รหัสสินค้า</th>
              <th style={{ width: '44%' }}>รายละเอียด</th>
              <th style={{ width: '9%' }}>จำนวน</th>
              <th style={{ width: '9%' }}>หน่วย</th>
              <th style={{ width: '9%' }}>ราคา/หน่วย</th>
              <th style={{ width: '9%' }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={i}>
                <td className="ti-c">{it ? i + 1 : ''}</td>
                <td className="ti-c">{it?.code ?? ''}</td>
                <td>{it?.description ?? ''}</td>
                <td className="ti-r">{it ? it.qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                <td className="ti-c">{it?.unit ?? ''}</td>
                <td className="ti-r">{it ? fmt(it.price) : ''}</td>
                <td className="ti-r">{it ? fmt(it.qty * it.price) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {showStamp && <img src={stamp} alt="" className="ti-stamp" />}
      </div>

      {/* Footer area: amount text (left) + totals (right) */}
      <div className="ti-footer-grid">
        <div className="ti-left-col">
          <div className="ti-amount-text">
            <span className="ti-amount-lbl">ตัวอักษร.</span>{' '}
            <span className="ti-amount-val">({data.amount_text || 'ศูนย์บาทถ้วน'})</span>
          </div>
          <div className="ti-pay">
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.payment_cash ? 'on' : ''}`} />เงินสด</span></div>
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.payment_transfer ? 'on' : ''}`} />เงินโอนเข้าบัญชี ธนาคารกสิกรไทย เลขที่ 076-8-98037-3 บริษัท ดีรวยสุข จำกัด</span></div>
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.cheque_no ? 'on' : ''}`} />เช็คเลขที่ <span className="ti-line">{data.cheque_no}</span> ธนาคาร <span className="ti-line">{data.cheque_bank}</span></span></div>
            <div className="ti-pay-row">วันที่ <span className="ti-line">{fmtThaiDate(data.cheque_date)}</span> จำนวนเงิน <span className="ti-line">{data.cheque_amount ? fmt(data.cheque_amount) : ''}</span></div>
          </div>
          <div className="ti-notes">
            <div className="ti-notes-lbl">หมายเหตุ:</div>
            <div className="ti-notes-val">
              {data.notes ? (
                <div className="whitespace-pre-wrap">{data.notes}</div>
              ) : (
                <>
                  <div>1. กรณีชำระเงินโดยเช็คกรุณาสั่งจ่ายเช็คขีดคร่อมในนาม "บริษัท ดีรวยสุข จำกัด" เท่านั้น</div>
                  <div>2. สินค้าตามรายการข้างต้นได้ให้บริการจนจบหลังจากผู้ใช้บริการจะได้ชำระเงินเรียบร้อยแล้ว</div>
                  <div>3. บริษัทฯ ขอสงวนสิทธิ์ในการแก้ไขใบกำกับภาษีภายใน 7 วัน นับจากวันที่ระบุในใบกำกับภาษี (ผิด ตก ยกเว้น E. & OE.)</div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ti-right-col">
          <div className="ti-totals">
            <div className="ti-tot-row"><span>รวมเงิน</span><span>{fmt(data.total_amount)}</span></div>
            <div className="ti-tot-sub">TOTAL AMOUNT</div>
            <div className="ti-tot-row"><span>หัก เงินมัดจำ / ส่วนลด</span><span>{data.discount ? fmt(data.discount) : ''}</span></div>
            <div className="ti-tot-sub">DEPOSIT / DISCOUNT</div>
            <div className="ti-tot-row"><span>มูลค่าหลังหักเงินมัดจำ/ส่วนลด</span><span>{fmt(data.amount_after_discount)}</span></div>
            <div className="ti-tot-sub">TOTAL AMOUNT AFTER DEPOSIT / DISCOUNT</div>
            <div className="ti-tot-row"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>{fmt(data.vat)}</span></div>
            <div className="ti-tot-sub">VAT</div>
            <div className="ti-tot-row ti-tot-grand"><span>ยอดเงินสุทธิ</span><span>{fmt(data.grand_total)}</span></div>
            <div className="ti-tot-sub">GRAND TOTAL</div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="ti-sign-row">
        <div className="ti-sign-receipt">
          <div>ได้รับสินค้าตามรายการข้างบนนี้ไว้เรียบร้อยแล้ว</div>
          <div className="ti-sign-line">
            <div>ผู้รับสินค้า <span className="ti-sign-name">{data.receiver_name || '....................................'}</span></div>
            <div className="ti-sign-date">วันที่ <span className="ti-sign-name">{data.receiver_date ? fmtThaiDate(data.receiver_date) : '...................'}</span></div>
          </div>
        </div>
        <div className="ti-sign-sender">
          <div>ผู้ส่งสินค้า <span className="ti-sign-name">{data.signer_name || '....................................'}</span></div>
          {data.signer_license && (
            <div className="ti-sign-license">เลขที่ใบอนุญาต: {data.signer_license}</div>
          )}
          <div className="ti-sign-date">วันที่ {fmtThaiDate(data.signer_date || data.doc_date)}</div>
        </div>
        <div className="ti-sign-auth">
          <div>ในนาม บริษัท ดีรวยสุข จำกัด</div>
          <div className="ti-sign-img-wrap">
            {showSignature && <img src={signature} alt="" className="ti-sign-img" />}
          </div>
          <div className="ti-sign-foot">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
    </div>
  );
}
