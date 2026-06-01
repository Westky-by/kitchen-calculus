import { Button } from '@/components/ui/button';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface PrintActionsProps {
  printAreaId: string;
  title?: string;
  size?: 'sm' | 'default';
}

/**
 * Print via a hidden iframe so only the target area is rendered (not the entire app).
 * All <link rel="stylesheet"> and <style> tags from the host document are cloned into
 * the iframe so Tailwind and component styles still apply.
 */
const printElementViaIframe = (el: HTMLElement, title: string) => {
  // Collect head styles
  const headHtml = Array.from(
    document.head.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((n) => n.outerHTML)
    .join('\n');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    toast.error('ไม่สามารถสร้างหน้าต่างพิมพ์ได้');
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title.replace(/[<>]/g, '')}</title>
    ${headHtml}
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      .print-host { padding: 12px; }
      [data-print-hide="true"], .print\\:hidden { display: none !important; }
      @page { margin: 12mm; }
    </style>
  </head>
  <body>
    <div class="print-host"></div>
  </body>
</html>`);
  doc.close();

  // Clone the target element into the iframe
  const host = doc.querySelector('.print-host') as HTMLElement | null;
  if (!host) {
    iframe.remove();
    toast.error('สร้างเนื้อหาสำหรับพิมพ์ไม่สำเร็จ');
    return;
  }
  const clone = el.cloneNode(true) as HTMLElement;
  // Strip any controls that should not print
  clone.querySelectorAll('[data-print-hide="true"], .print\\:hidden').forEach((n) => n.remove());
  host.appendChild(clone);

  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      toast.error('สั่งพิมพ์ไม่สำเร็จ');
    } finally {
      // Remove after the print dialog closes
      setTimeout(() => iframe.remove(), 1000);
    }
  };

  // Wait for images/fonts to load so the print captures everything
  const imgs = Array.from(clone.querySelectorAll('img'));
  if (imgs.length === 0) {
    setTimeout(trigger, 100);
    return;
  }
  let remaining = imgs.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) setTimeout(trigger, 100);
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }
  });
  // Hard timeout fallback
  setTimeout(() => {
    if (remaining > 0) {
      remaining = 0;
      trigger();
    }
  }, 4000);
};

const PrintActions = ({ printAreaId, title, size = 'sm' }: PrintActionsProps) => {
  const run = () => {
    const el = document.getElementById(printAreaId);
    if (!el) {
      toast.error('ไม่พบเนื้อหาสำหรับพิมพ์');
      return;
    }
    printElementViaIframe(el, title || document.title || 'พิมพ์');
  };

  return (
    <div className="flex gap-1 print:hidden" data-print-hide="true">
      <Button variant="outline" size={size} onClick={run}>
        <Printer className="w-3.5 h-3.5 mr-1" />พิมพ์
      </Button>
      <Button variant="outline" size={size} onClick={run}>
        <FileDown className="w-3.5 h-3.5 mr-1" />PDF
      </Button>
    </div>
  );
};

export default PrintActions;
