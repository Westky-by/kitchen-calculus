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

  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  clone.style.overflow = 'hidden';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';

  clone.querySelectorAll<HTMLElement>('[class*="overflow"], [class*="max-h-"]').forEach((n) => {
    n.style.overflow = 'visible';
    n.style.maxHeight = 'none';
    n.style.height = 'auto';
  });
  clone.querySelectorAll<HTMLElement>('.print\\:hidden, [class*="print:hidden"], [data-print-hide="true"]').forEach((n) => {
    n.style.display = 'none';
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: clone.scrollWidth,
    windowHeight: clone.scrollHeight,
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
      const canvas = await captureElement(el);
      const dataUrl = canvas.toDataURL('image/png');

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

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title || 'Print'}</title>
          <style>
            @page { margin: 10mm; size: A4; }
            body { margin: 0; padding: 0; }
            img { width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
        </body>
        </html>
      `);
      iframeDoc.close();

      const img = iframeDoc.querySelector('img');
      if (img) {
        img.onload = () => {
          toast.dismiss(toastId);
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        };
      } else {
        toast.dismiss(toastId);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
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
      const canvas = await captureElement(el);

      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

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
