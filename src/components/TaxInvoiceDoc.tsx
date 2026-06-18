import logo from '@/assets/drs-logo.png';
import stamp from '@/assets/drs-stamp.png';
import signature from '@/assets/drs-signature.png';

export interface InvoiceItem {
  code: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
  /** Service Charge % เฉพาะรายการนี้ (0 = ไม่คิด, 10 = คิด 10%) */
  sc?: number;
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

const COPY_LABELS: Record<CopyType, { th: string; en: string; box_th: string; box_en: string; box_set: string }> = {
  original:   { th: 'ใบกำกับภาษี / ใบเสร็จรับเงิน',     en: 'TAX INVOICE  /  RECEIPT',     box_th: 'ต้นฉบับ',  box_en: 'ORIGINAL', box_set: 'เอกสารออกเป็นชุด' },
  company:    { th: 'ใบกำกับภาษี / ใบเสร็จรับเงิน',     en: 'TAX INVOICE  /  RECEIPT',     box_th: 'สำหรับบริษัท', box_en: 'COMPANY COPY', box_set: 'เอกสารออกเป็นชุด' },
  accounting: { th: 'สำเนาใบกำกับภาษี / ใบเสร็จรับเงิน', en: 'COPY TAX INVOICE  /  RECEIPT', box_th: 'สำหรับบัญชี',  box_en: 'ACCOUNTING COPY', box_set: 'เอกสารออกเป็นชุด' },
};

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function TaxInvoiceDoc({ data, copy = 'original', companySignature }: { data: InvoiceData; copy?: CopyType; companySignature?: string }) {
  const label = COPY_LABELS[copy];
  const showStamp = copy !== 'accounting';
  const showSignature = copy === 'original';
  const signatureSrc = companySignature || signature;


  // Pad to 18 rows for the table (matches PDF template)
  const rows: (InvoiceItem | null)[] = [];
  for (let i = 0; i < 18; i++) rows.push(data.items[i] ?? null);

  return (
    <div className="ti-doc">
      {/* Header */}
      <div className="ti-header">
        <img src={logo} alt="logo" className="ti-logo" />
        <div className="ti-company">
          <div className="ti-company-th">บริษัท ดีรวยสุข จำกัด</div>
          <div className="ti-company-en">DEE RUAY SOOK CO.,LTD.</div>
          <div className="ti-company-addr ti-nowrap">
            สำนักงานใหญ่ : เลขที่ 166 ถนนพุทธมณฑลสาย 1 แขวงบางด้วน เขตภาษีเจริญ กรุงเทพฯ 10160
          </div>
          <div className="ti-company-addr">
            Head Office : No.166 Phutthamonthon Sai 1 Road, Bang Duan Subdistrict, Phasi Charoen District, Bangkok 10160
          </div>
          <div className="ti-company-addr">
            โทร. 094-694-1117 &nbsp; เลขประจำตัวผู้เสียภาษี 0105563140708
          </div>
        </div>
        <div className="ti-corner-box">
          <div className="ti-corner-pill">{label.box_th}</div>
          <div className="ti-corner-en">{label.box_en}</div>
          <div className="ti-corner-set">{label.box_set}</div>
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
          {(() => {
            const lines = (data.customer_address || '')
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 0);
            if (lines.length === 0) {
              return (
                <div className="ti-cust-row">
                  <span className="ti-cust-lbl">ที่อยู่</span>
                  <span className="ti-cust-val"></span>
                </div>
              );
            }
            const lastIdx = lines.length - 1;
            return lines.map((ln, idx) => (
              <div className="ti-cust-row" key={`addr-${idx}`}>
                {idx === 0
                  ? <span className="ti-cust-lbl">ที่อยู่</span>
                  : <span className="ti-cust-lbl ti-cust-lbl-empty" aria-hidden="true"></span>}
                <span className={`ti-cust-val${idx !== lastIdx ? ' ti-cust-val-noline' : ''}`}>{ln}</span>
              </div>
            ));
          })()}


          <div className="ti-cust-row">
            <span className="ti-cust-lbl">เลขประจำตัวผู้เสียภาษี</span>
            <span className="ti-cust-val ti-cust-taxid">{data.customer_tax_id}</span>
            <span className="ti-cb"><span className={`ti-cb-mark ${data.branch_type === 'head' ? 'on' : ''}`} />สำนักงานใหญ่</span>
            <span className="ti-cb"><span className={`ti-cb-mark ${data.branch_type === 'branch' ? 'on' : ''}`} />สาขาที่ {data.branch_no}</span>
          </div>
        </div>
        <div className="ti-cust-right">
          <div className="ti-docno"><span className="ti-docno-lbl">เลขที่</span><span className="ti-docno-val">{data.doc_number}</span></div>
          <div className="ti-docno"><span className="ti-docno-lbl">วันที่</span><span className="ti-docno-val">{data.doc_date}</span></div>
        </div>
      </div>

      {/* Items table */}
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th style={{ width: '7%' }}>ลำดับ</th>
              <th style={{ width: '14%' }}>รหัสสินค้า</th>
              <th style={{ width: '40%' }}>รายละเอียด</th>
              <th style={{ width: '9%' }}>จำนวน</th>
              <th style={{ width: '9%' }}>หน่วย</th>
              <th style={{ width: '10%' }}>ราคา/หน่วย</th>
              <th style={{ width: '11%' }}>จำนวนเงิน</th>
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

      {/* Footer area */}
      <div className="ti-footer-grid">
        <div className="ti-left-col">
          <div className="ti-amount-text">
            <span className="ti-amount-lbl">ตัวอักษร.</span>
            <span className="ti-amount-val">({data.amount_text || 'ศูนย์บาทถ้วน'})</span>
          </div>
          <div className="ti-pay">
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.payment_cash ? 'on' : ''}`} />เงินสด</span></div>
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.payment_transfer ? 'on' : ''}`} />เงินโอนเข้าบัญชี ธนาคารกสิกรไทย เลขที่ 076-8-98037-3 บริษัท ดีรวยสุข จำกัด</span></div>
            <div className="ti-pay-row"><span className="ti-cb"><span className={`ti-cb-mark ${data.cheque_no ? 'on' : ''}`} />เช็คเลขที่ <span className="ti-line">{data.cheque_no}</span> ธนาคาร <span className="ti-line">{data.cheque_bank}</span></span></div>
            <div className="ti-pay-row">&nbsp;&nbsp;&nbsp;&nbsp;วันที่ <span className="ti-line">{data.cheque_date}</span> จำนวนเงิน <span className="ti-line">{data.cheque_amount ? fmt(data.cheque_amount) : ''}</span></div>
          </div>
          <div className="ti-notes">
            <div className="ti-notes-lbl">หมายเหตุ :</div>
            <div className="ti-notes-val">
              <div>1. กรณีชำระเงินโดยเช็คกรุณาสั่งจ่ายเช็คขีดคร่อมในนาม "บริษัท ดีรวยสุข จำกัด" เท่านั้น</div>
              <div>2. สินค้าตามรายการข้างต้นได้ให้บริการจนจบหลังจากผู้ใช้บริการจะได้ชำระเงินเรียบร้อยแล้ว</div>
              <div>3. บริษัทฯ ขอสงวนสิทธิ์ในการแก้ไขใบกำกับภาษีภายใน 7 วัน นับจากวันที่ระบุในใบกำกับภาษี (ผิด ตก ยกเว้น E. & OE.)</div>
              {data.notes && <div className="whitespace-pre-wrap" style={{ marginTop: 2 }}>{data.notes}</div>}
            </div>
          </div>
        </div>
        <div className="ti-totals">
          <div className="ti-tot-cell">
            <div className="ti-tot-left">
              <div className="ti-tot-th">รวมเงิน</div>
              <div className="ti-tot-en">TOTAL AMOUNT</div>
            </div>
            <div className="ti-tot-amt">{fmt(data.total_amount)}</div>
          </div>
          <div className="ti-tot-cell">
            <div className="ti-tot-left">
              <div className="ti-tot-th">หัก เงินมัดจำ / ส่วนลด</div>
              <div className="ti-tot-en">DEPOSIT / DISCOUNT</div>
            </div>
            <div className="ti-tot-amt">{data.discount ? fmt(data.discount) : ''}</div>
          </div>
          <div className="ti-tot-cell">
            <div className="ti-tot-left">
              <div className="ti-tot-th">มูลค่าหลังหักเงินมัดจำ/ส่วนลด</div>
              <div className="ti-tot-en">TOTAL AMOUNT AFTER DEPOSIT / DISCOUNT</div>
            </div>
            <div className="ti-tot-amt">{fmt(data.amount_after_discount)}</div>
          </div>
          <div className="ti-tot-cell">
            <div className="ti-tot-left">
              <div className="ti-tot-th">ภาษีมูลค่าเพิ่ม &nbsp; 7%</div>
              <div className="ti-tot-en">VAT</div>
            </div>
            <div className="ti-tot-amt">{fmt(data.vat)}</div>
          </div>
          <div className="ti-tot-cell ti-tot-grand">
            <div className="ti-tot-left">
              <div className="ti-tot-th">ยอดเงินสุทธิ</div>
              <div className="ti-tot-en">GRAND TOTAL</div>
            </div>
            <div className="ti-tot-amt">{fmt(data.grand_total)}</div>
          </div>
        </div>
      </div>

      {/* Signatures - 3 bordered cells */}
      <div className="ti-sign-row">
        <div className="ti-sign-cell">
          <div className="ti-sign-head">ได้รับสินค้าตามรายการข้างบนนี้ไว้เรียบร้อยแล้ว</div>
          <div className="ti-sign-line-row"><span>ผู้รับสินค้า</span><span className="ti-line">{data.receiver_name}</span></div>
          <div className="ti-sign-line-row"><span>วันที่</span><span className="ti-line">{data.receiver_date}</span></div>
        </div>
        <div className="ti-sign-cell ti-sign-sender-c">
          <div style={{ height: 28 }} />
          <div className="ti-sign-line-row"><span>ผู้ส่งสินค้า</span><span className="ti-line ti-sign-name">{data.signer_name}</span></div>
          {data.signer_license && <div className="ti-sign-license">เลขที่ใบอนุญาต: {data.signer_license}</div>}
          <div className="ti-sign-line-row"><span>วันที่</span><span className="ti-line">{data.signer_date || data.doc_date}</span></div>
        </div>
        <div className="ti-sign-cell ti-sign-auth-c">
          <div className="ti-sign-auth-name">ในนาม บริษัท ดีรวยสุข จำกัด</div>
          <div className="ti-sign-img-wrap">
            {showSignature && <img src={signatureSrc} alt="" className="ti-sign-img" />}
          </div>
          <div className="ti-sign-foot">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
    </div>
  );
}
