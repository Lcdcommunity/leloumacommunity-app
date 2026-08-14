// web/lib/card-pdf.ts
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54;

interface GenerateMembershipCardPdfParams {
  frontNode: HTMLElement;
  backNode: HTMLElement;
  fileName?: string;
}

export async function generateMembershipCardPdf({
  frontNode,
  backNode,
  fileName = 'carte-membre.pdf',
}: GenerateMembershipCardPdfParams): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const captureOptions = {
    pixelRatio: 3,
    cacheBust: true,
  };

  const [frontDataUrl, backDataUrl] = await Promise.all([
    toPng(frontNode, captureOptions),
    toPng(backNode, captureOptions),
  ]);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  pdf.addImage(frontDataUrl, 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
  pdf.addImage(backDataUrl, 'PNG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);

  pdf.save(fileName);
}