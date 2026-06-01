import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {
  const handlePrint = () => {
    const el = document.getElementById(printAreaId);
    if (!el) {
      toast.error('ไม่พบเนื้อหาสำหรับพิมพ์');
      return;
    }
    window.print();
  };

  const handleSavePDF = () => {
    // Default: use browser's print-to-PDF
    const el = document.getElementById(printAreaId);
    if (!el) {
      toast.error('ไม่พบเนื้อหาสำหรับบันทึก PDF');
      return;
    }
    window.print();
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
