import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {

  const handlePrint = async () => {
    const el = document.getElementById(printAreaId);
    if (!el) { toast.error('ไม่พบเนื้อหาสำหรับพิมพ์'); return; }

    const { default: html2canvas } = await import('html2canvas');

    toast.info('กำลังเตรียมหน้าพิมพ์...');

    // Hide non-printable buttons temporarily
    const hiddenEls = el.querySelectorAll('.print\\:hidden, [class*="print:hidden"]');
    hiddenEls.forEach((e) => (e as HTMLElement).style.display = 'none');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Restore hidden elements
    hiddenEls.forEach((e) => (e as HTMLElement).style.display = '');

    const dataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้'); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || 'Print'}</title>
        <style>
          @page { margin: 10mm; }
          body { margin: 0; padding: 0; }
          img { width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" />
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSavePDF = async () => {
    const el = document.getElementById(printAreaId);
    if (!el) { toast.error('ไม่พบเนื้อหาสำหรับบันทึก PDF'); return; }

    toast.info('กำลังสร้างไฟล์ PDF...');

    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    // Hide non-printable buttons temporarily
    const hiddenEls = el.querySelectorAll('.print\\:hidden, [class*="print:hidden"]');
    hiddenEls.forEach((e) => (e as HTMLElement).style.display = 'none');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Restore hidden elements
    hiddenEls.forEach((e) => (e as HTMLElement).style.display = '');

    const imgWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filename = (title || 'document').replace(/[^a-zA-Z0-9ก-๙\s-]/g, '').trim();
    pdf.save(`${filename}.pdf`);
    toast.success('บันทึก PDF เรียบร้อย');
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
