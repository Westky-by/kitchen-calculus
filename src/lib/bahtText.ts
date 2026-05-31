// Convert number to Thai Baht text (ตัวอักษร ศูนย์บาทถ้วน)
const TH_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function readInt(numStr: string): string {
  const n = numStr.length;
  let out = '';
  for (let i = 0; i < n; i++) {
    const d = parseInt(numStr[i], 10);
    const place = n - i - 1;
    if (d === 0) continue;
    if (place === 0 && d === 1 && n > 1) out += 'เอ็ด';
    else if (place === 1 && d === 2) out += 'ยี่' + TH_PLACES[1];
    else if (place === 1 && d === 1) out += TH_PLACES[1];
    else out += TH_DIGITS[d] + TH_PLACES[place];
  }
  return out;
}

export function bahtText(amount: number): string {
  if (!isFinite(amount)) return '';
  const isNeg = amount < 0;
  amount = Math.abs(amount);
  const fixed = amount.toFixed(2);
  const [bahtStr, satangStr] = fixed.split('.');
  const baht = parseInt(bahtStr, 10);
  const satang = parseInt(satangStr, 10);

  let bahtPart = '';
  if (baht === 0) bahtPart = 'ศูนย์';
  else {
    // Split into groups of 6 digits for ล้าน
    const s = String(baht);
    const groups: string[] = [];
    let rem = s;
    while (rem.length > 6) { groups.unshift(rem.slice(-6)); rem = rem.slice(0, -6); }
    groups.unshift(rem);
    bahtPart = groups.map((g, i) => {
      const r = readInt(g);
      return r + (i < groups.length - 1 ? 'ล้าน' : '');
    }).join('');
  }

  let out = bahtPart + 'บาท';
  if (satang === 0) out += 'ถ้วน';
  else out += readInt(String(satang).padStart(2, '0')) + 'สตางค์';
  return (isNeg ? 'ลบ' : '') + out;
}
