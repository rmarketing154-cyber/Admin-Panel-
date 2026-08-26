import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  data: (string | number)[][];
  summaryStats?: { label: string; value: string | number }[];
}

export function exportToPDF({
  title,
  subtitle,
  filename,
  headers,
  data,
  summaryStats
}: PDFExportOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 24, 28);

  // Subtitle / Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  const dateStr = `Exported: ${new Date().toLocaleString('en-GB')} | Mail Factory Pro Admin`;
  doc.text(subtitle ? `${subtitle}  •  ${dateStr}` : dateStr, 24, 44);

  let startY = 70;

  // Render optional Summary Stats
  if (summaryStats && summaryStats.length > 0) {
    const boxWidth = Math.min(160, (pageWidth - 48 - (summaryStats.length - 1) * 12) / summaryStats.length);
    summaryStats.forEach((stat, idx) => {
      const x = 24 + idx * (boxWidth + 12);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, startY, boxWidth, 34, 4, 4, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label.toUpperCase(), x + 8, startY + 13);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(String(stat.value), x + 8, startY + 28);
    });
    startY += 45;
  }

  // Generate Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: startY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    margin: { left: 24, right: 24, bottom: 30 },
    didDrawPage: (dataInfo) => {
      // Footer page number
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${dataInfo.pageNumber} of ${pageNumber}`,
        pageWidth - 24,
        doc.internal.pageSize.getHeight() - 12,
        { align: 'right' }
      );
    }
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
}
