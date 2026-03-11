import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

async function captureElement(el: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas');

  // Hide buttons/actions temporarily
  const hideSelectors = [
    '[class*="print:hidden"]',
    'button',
    '[role="button"]',
  ];
  const hiddenEls: { el: HTMLElement; prev: string }[] = [];

  // Only hide direct action buttons, not table content
  el.querySelectorAll(hideSelectors.join(',')).forEach((node) => {
    const htmlEl = node as HTMLElement;
    // Keep buttons inside tables visible (they're data)
    if (htmlEl.closest('table')) return;
    // Keep dialog close button
    if (htmlEl.closest('[role="dialog"]') && htmlEl.getAttribute('class')?.includes('absolute')) return;
    hiddenEls.push({ el: htmlEl, prev: htmlEl.style.display });
    htmlEl.style.display = 'none';
  });

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  // Restore hidden elements
  hiddenEls.forEach(({ el, prev }) => {
    el.style.display = prev;
  });

  return canvas;
}

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {

  const handlePrint = async () => {
    const el = document.getElementById(printAreaId);
    if (!el) { toast.error('ไม่พบเนื้อหาสำหรับพิมพ์'); return; }

    const toastId = toast.loading('กำลังเตรียมหน้าพิมพ์...');

    try {
      const canvas = await captureElement(el);
      const dataUrl = canvas.toDataURL('image/png');

      // Use hidden iframe instead of popup (avoids popup blockers)
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

      // Wait for image to load then print
      const img = iframeDoc.querySelector('img');
      if (img) {
        img.onload = () => {
          toast.dismiss(toastId);
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        };
      } else {
        toast.dismiss(toastId);
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
    if (!el) { toast.error('ไม่พบเนื้อหาสำหรับบันทึก PDF'); return; }

    const toastId = toast.loading('กำลังสร้างไฟล์ PDF...');

    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await captureElement(el);

      const imgWidth = 190; // A4 with margins
      const pageHeight = 277; // A4 with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 10; // top margin

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
    <div className="flex gap-1 print:hidden">
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
