import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

async function captureNode(node: HTMLElement, width: number) {
  const { default: html2canvas } = await import('html2canvas');

  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-100000px';
  sandbox.style.top = '0';
  sandbox.style.zIndex = '-1';
  sandbox.style.background = 'white';

  const frame = document.createElement('div');
  const maxHeight = width * Math.SQRT2;
  frame.style.width = `${width}px`;
  frame.style.height = `${maxHeight}px`;
  frame.style.overflow = 'hidden';
  frame.style.background = 'white';

  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.minHeight = '0';
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.setProperty('--ti-fit-scale', '1');

  clone.querySelectorAll<HTMLElement>('[class*="overflow"], [class*="max-h-"]').forEach((n) => {
    n.style.overflow = 'visible';
    n.style.maxHeight = 'none';
    n.style.height = 'auto';
  });
  clone.querySelectorAll<HTMLElement>('.print\\:hidden, [class*="print:hidden"], [data-print-hide="true"]').forEach((n) => {
    n.style.display = 'none';
  });

  frame.appendChild(clone);
  sandbox.appendChild(frame);
  document.body.appendChild(sandbox);

  const naturalHeight = Math.max(clone.scrollHeight, clone.offsetHeight);
  const fitScale = Math.min(1, maxHeight / Math.max(1, naturalHeight));
  if (fitScale < 1) {
    clone.style.transform = `scale(${fitScale})`;
    clone.style.setProperty('--ti-fit-scale', `${fitScale}`);
  }

  const canvas = await html2canvas(frame, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width,
    height: maxHeight,
    windowWidth: width,
    windowHeight: maxHeight,
  });

  document.body.removeChild(sandbox);
  return canvas;
}

// 210mm at 96dpi ≈ 794px
const A4_PX_WIDTH = 794;

async function capturePages(el: HTMLElement): Promise<HTMLCanvasElement[]> {
  const docs = Array.from(el.querySelectorAll<HTMLElement>('.ti-doc'));
  const nodes = docs.length > 0 ? docs : [el];
  const canvases: HTMLCanvasElement[] = [];
  for (const n of nodes) {
    canvases.push(await captureNode(n, A4_PX_WIDTH));
  }
  return canvases;
}

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {
  const handlePrint = async () => {
    const el = document.getElementById(printAreaId);
    if (!el) {
      toast.error('ไม่พบเนื้อหาสำหรับพิมพ์');
      return;
    }

    const toastId = toast.loading('กำลังเตรียมหน้าพิมพ์...');

    try {
      const canvases = await capturePages(el);
      const imgs = canvases.map((c) => c.toDataURL('image/png'));

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.dismiss(toastId);
        toast.error('ไม่สามารถเตรียมหน้าพิมพ์ได้');
        document.body.removeChild(iframe);
        return;
      }

      const pages = imgs
        .map((src) => `<div class="page"><img src="${src}" /></div>`)
        .join('');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'Print'}</title>
          <style>
            @page { margin: 0; size: A4; }
            html, body { margin: 0; padding: 0; background: white; }
            .page { width: 210mm; height: 297mm; overflow: hidden; page-break-after: always; display: flex; align-items: center; justify-content: center; }
            .page:last-child { page-break-after: auto; }
            .page img { width: 210mm; height: 297mm; object-fit: contain; display: block; }
          </style>
        </head>
        <body>${pages}</body>
        </html>
      `);
      iframeDoc.close();

      const doPrint = () => {
        toast.dismiss(toastId);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      };
      const lastImg = iframeDoc.querySelectorAll('img');
      if (lastImg.length > 0) {
        const last = lastImg[lastImg.length - 1] as HTMLImageElement;
        if (last.complete) doPrint(); else last.onload = doPrint;
      } else {
        doPrint();
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('เกิดข้อผิดพลาดในการพิมพ์');
      console.error('Print error:', err);
    }
  };

  const handleSavePDF = async () => {
    const el = document.getElementById(printAreaId);
    if (!el) {
      toast.error('ไม่พบเนื้อหาสำหรับบันทึก PDF');
      return;
    }

    const toastId = toast.loading('กำลังสร้างไฟล์ PDF...');

    try {
      const { jsPDF } = await import('jspdf');
      const canvases = await capturePages(el);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;

      canvases.forEach((canvas, idx) => {
        if (idx > 0) pdf.addPage();
        // Fit each captured doc onto a single A4 page, preserving aspect ratio
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
      });

      const filename = (title || 'document').replace(/[^a-zA-Z0-9ก-๙\s-]/g, '').trim();
      pdf.save(`${filename}.pdf`);
      toast.dismiss(toastId);
      toast.success('บันทึก PDF เรียบร้อย');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('เกิดข้อผิดพลาดในการสร้าง PDF');
      console.error('PDF error:', err);
    }
  };

  return (
    <div className="flex gap-1 print:hidden" data-print-hide="true">
      <Button variant="outline" size={size} onClick={handlePrint}>
        <Printer className="w-3.5 h-3.5 mr-1" />พิมพ์
      </Button>
      <Button variant="outline" size={size} onClick={handleSavePDF}>
        <FileDown className="w-3.5 h-3.5 mr-1" />PDF
      </Button>
    </div>
  );
};

export default PrintActions;
