import jsPDF from "jspdf";
import "jspdf-autotable";

interface PDFHeader {
  title: string;
  subtitle?: string;
  route?: string;
  repOrDriver?: string;
  date?: string;
  dateRange?: string;
}

interface PDFColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
}

interface PDFSection {
  title?: string;
  columns: PDFColumn[];
  rows: (string | number)[][];
}

const BRAND = {
  teal: [0, 128, 128] as [number, number, number],
  tealDark: [0, 100, 100] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  lightGrey: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

function drawHeader(doc: jsPDF, header: PDFHeader, pageWidth: number) {
  // Teal banner
  doc.setFillColor(...BRAND.teal);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Company name
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Nampark Route Management", 14, 14);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AnswerPort Ltd / Kanini Haraka Enterprises", 14, 21);

  // Date on right
  doc.setFontSize(9);
  const dateStr = header.dateRange || header.date || new Date().toLocaleDateString("en-KE");
  doc.text(dateStr, pageWidth - 14, 14, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleDateString("en-KE")}`, pageWidth - 14, 21, { align: "right" });

  // Report title
  doc.setTextColor(...BRAND.slate);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(header.title, 14, 44);

  let yPos = 52;

  // Subtitle info line
  if (header.route || header.repOrDriver) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const parts: string[] = [];
    if (header.route) parts.push(`Route: ${header.route}`);
    if (header.repOrDriver) parts.push(header.repOrDriver);
    if (header.subtitle) parts.push(header.subtitle);
    doc.text(parts.join("  |  "), 14, yPos);
    yPos += 8;
  }

  // Separator line
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);

  return yPos + 6;
}

function drawFooter(doc: jsPDF, pageCount: number, pageWidth: number, pageHeight: number) {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.lightGrey);
    doc.rect(0, pageHeight - 16, pageWidth, 16, "F");
    doc.setDrawColor(...BRAND.border);
    doc.line(0, pageHeight - 16, pageWidth, pageHeight - 16);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Nampark Route Management", 14, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
}

export function generateReportPDF(
  header: PDFHeader,
  sections: PDFSection[],
  filename?: string
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const tableWidth = pageWidth - margin * 2;

  let yPos = drawHeader(doc, header, pageWidth);

  for (const section of sections) {
    // Section title
    if (section.title) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.slate);
      doc.text(section.title, margin, yPos);
      yPos += 6;
    }

    // Table via autotable
    const head = [section.columns.map((c) => c.header)];
    const body = section.rows;

    doc.autoTable({
      startY: yPos,
      margin: { left: margin, right: margin },
      head,
      body,
      theme: "grid",
      headStyles: {
        fillColor: BRAND.teal,
        textColor: BRAND.white,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: BRAND.slate,
        lineColor: BRAND.border,
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: BRAND.lightGrey,
      },
      columnStyles: Object.fromEntries(
        section.columns.map((c, i) => [
          i,
          {
            halign: c.align || "left",
            cellWidth: c.width || "auto",
          },
        ])
      ),
    });

    const table = doc.lastAutoTable;
    yPos = (table?.finalY || yPos) + 8;
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  if (filename) {
    doc.save(`${filename}.pdf`);
  }

  return doc;
}

export function generateDailyReportPDF(
  date: string,
  routeReports: any[]
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  for (let i = 0; i < routeReports.length; i++) {
    const report = routeReports[i];
    if (i > 0) doc.addPage();

    let yPos = drawHeader(doc, {
      title: `Daily Operations Report`,
      route: report.route?.name,
      repOrDriver: `Rep: ${report.salesRep?.name}  |  Driver: ${report.driver?.name}  |  Vehicle: ${report.vehicle?.registration}`,
      date,
    }, pageWidth);

    // KPIs
    const summary = report.summary || {};
    doc.autoTable({
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [["Metric", "Value"]],
      body: [
        ["Shift Open", report.shift?.shiftOpen || "—"],
        ["Shift Close", report.shift?.shiftClose || "—"],
        ["Customer Count", `${report.shift?.customerCountActual || 0} / ${report.shift?.customerCountTarget || 0}`],
        ["Sales", `KES ${(summary.salesActual || 0).toLocaleString()} / ${(summary.salesTarget || 0).toLocaleString()}`],
        ["Attainment", `${(summary.attainment || 0).toFixed(1)}%`],
        ["Complaints", String(report.shift?.complaints || 0)],
      ],
      theme: "grid",
      headStyles: { fillColor: BRAND.teal, textColor: BRAND.white, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: BRAND.slate },
      alternateRowStyles: { fillColor: BRAND.lightGrey },
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    });

    let yPos2 = (doc.lastAutoTable?.finalY || yPos) + 6;

    // Orders
    if (report.orders && report.orders.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.slate);
      doc.text("Orders", margin, yPos2);
      yPos2 += 5;

      const orderRows: (string | number)[][] = [];
      report.orders.forEach((order: any) => {
        (order.lines || []).forEach((line: any) => {
          orderRows.push([
            order.customerName || "—",
            line.sku?.name || "—",
            line.quantity || 0,
            `KES ${(line.unitPrice || 0).toLocaleString()}`,
            `KES ${(line.amount || 0).toLocaleString()}`,
          ]);
        });
      });

      if (orderRows.length > 0) {
        doc.autoTable({
          startY: yPos2,
          margin: { left: margin, right: margin },
          head: [["Customer", "SKU", "Qty", "Unit Price", "Amount"]],
          body: orderRows,
          theme: "grid",
          headStyles: { fillColor: BRAND.tealDark, textColor: BRAND.white, fontStyle: "bold", fontSize: 7 },
          bodyStyles: { fontSize: 7, textColor: BRAND.slate },
          alternateRowStyles: { fillColor: BRAND.lightGrey },
        });
        yPos2 = (doc.lastAutoTable?.finalY || yPos2) + 6;
      }
    }

    // Missing items
    if (report.missingItems && report.missingItems.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.slate);
      doc.text("Missing Items", margin, yPos2);
      yPos2 += 5;

      doc.autoTable({
        startY: yPos2,
        margin: { left: margin, right: margin },
        head: [["SKU", "Customers Affected", "Cartons", "Notes"]],
        body: report.missingItems.map((m: any) => [
          m.sku?.name || "—",
          m.customerCountAffected || 0,
          m.cartonsAffected || 0,
          m.notes || "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: [217, 119, 6], textColor: BRAND.white, fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: BRAND.slate },
        alternateRowStyles: { fillColor: [255, 251, 235] },
      });
      yPos2 = (doc.lastAutoTable?.finalY || yPos2) + 6;
    }

    // Driver shift times
    if (report.driverShift) {
      const ds = report.driverShift;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND.slate);
      doc.text("Driver Shift", margin, yPos2);
      yPos2 += 5;

      doc.autoTable({
        startY: yPos2,
        margin: { left: margin, right: margin },
        head: [["Loading Start", "Loading End", "Shift Start", "Gate Pass", "Shift End", "Customers"]],
        body: [[
          ds.loadingStart || "—",
          ds.loadingEnd || "—",
          ds.shiftStart || "—",
          ds.gatePassTime || "—",
          ds.shiftEnd || "—",
          ds.customerCountActual || 0,
        ]],
        theme: "grid",
        headStyles: { fillColor: BRAND.teal, textColor: BRAND.white, fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: BRAND.slate },
      });
    }
  }

  // Footers
  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}
