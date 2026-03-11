import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  /** CSS selector or ref ID of the area to print */
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {
  const handlePrint = () => {
    const el = document.getElementById(printAreaId);
    if (!el) { toast.error('ไม่พบเนื้อหาสำหรับพิมพ์'); return; }

    // Mark printable area
    el.classList.add('printable-area');
    if (title) document.title = title;
    window.print();
    el.classList.remove('printable-area');
  };

  const handleSavePDF = () => {
    toast.info('เลือก "Save as PDF" ในหน้าต่าง Print ที่ปรากฏ');
    handlePrint();
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
