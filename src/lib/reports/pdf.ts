import jsPDF from "jspdf";
import "jspdf-autotable";
import { ComputedReport, computeReport, computeWeeklyStats } from "./analytics";

const BRAND = {
  darkGreen: [14, 21, 18] as [number, number, number],
  green: [20, 28, 24] as [number, number, number],
  greenLight: [38, 49, 43] as [number, number, number],
  gold: [201, 162, 39] as [number, number, number],
  goldDim: [142, 116, 32] as [number, number, number],
  text: [237, 232, 221] as [number, number, number],
  textDim: [138, 150, 144] as [number, number, number],
  textFaint: [92, 102, 95] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  panel: [24, 32, 25] as [number, number, number],
  panelLight: [28, 38, 31] as [number, number, number],
  border: [38, 49, 43] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  greenAccent: [34, 197, 94] as [number, number, number],
  pageBg: [14, 21, 18] as [number, number, number],
};

function drawBrandHeader(doc: jsPDF, title: string, subtitle: string, dateStr: string, pageWidth: number) {
  doc.setFillColor(...BRAND.darkGreen);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 40, pageWidth, 1.5, "F");

  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("N", 14, 14);

  doc.setTextColor(...BRAND.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("NAMPARK", 22, 14);

  doc.setTextColor(...BRAND.textDim);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ROUTE MANAGEMENT SYSTEM", 22, 20);

  doc.setTextColor(...BRAND.textFaint);
  doc.setFontSize(7);
  doc.text("AnswerPort Ltd / Kanini Haraka Enterprises", 14, 34);

  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(dateStr.toUpperCase(), pageWidth - 14, 14, { align: "right" });

  doc.setTextColor(...BRAND.textFaint);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-KE")}`, pageWidth - 14, 20, { align: "right" });

  doc.setTextColor(...BRAND.text);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 52);

  if (subtitle) {
    doc.setTextColor(...BRAND.textDim);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 59);
  }

  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(14, 63, pageWidth - 14, 63);

  return 68;
}

function drawPageBg(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFillColor(...BRAND.pageBg);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

function drawFooter(doc: jsPDF, pageCount: number, pageWidth: number, pageHeight: number) {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.darkGreen);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
    doc.setFillColor(...BRAND.gold);
    doc.rect(0, pageHeight - 14, pageWidth, 0.5, "F");

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("NAMPARK ROUTE MANAGEMENT", 14, pageHeight - 6);

    doc.setTextColor(...BRAND.textFaint);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }
}

function checkPageBreak(doc: jsPDF, currentY: number, neededSpace: number, pageWidth: number, pageHeight: number): number {
  if (currentY + neededSpace > pageHeight - 20) {
    doc.addPage();
    drawPageBg(doc, pageWidth, pageHeight);
    return 20;
  }
  return currentY;
}

export function generateDailyRouteReport(report: ComputedReport): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  const dateStr = new Date(report.date).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subtitle = `${report.route.name} Route  |  Rep: ${report.salesRep.name}  |  Driver: ${report.driver.name}  |  Vehicle: ${report.vehicle.registration}`;

  let yPos = drawBrandHeader(doc, "DAILY ROUTE REPORT", subtitle, dateStr, pageWidth);

  // KPI Status Badge
  const statusColor = report.kpiStatus === "MET" ? BRAND.greenAccent : BRAND.red;
  doc.setFillColor(...statusColor);
  doc.roundedRect(14, yPos, 30, 8, 1, 1, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(report.kpiStatus, 29, yPos + 5.5, { align: "center" });

  doc.setTextColor(...BRAND.textDim);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Attainment: ${report.attainment}%`, 50, yPos + 5.5);

  yPos += 14;

  // KPI Table
  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("KEY PERFORMANCE INDICATORS", 14, yPos);
  yPos += 6;

  const kpiHead = [["KPI", "Target", "Actual", "Status"]];
  const kpiBody = report.kpis.map((kpi) => [
    kpi.metric,
    String(kpi.target),
    String(kpi.actual),
    kpi.status === "MET" ? "MET" : "NOT MET",
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: kpiHead,
    body: kpiBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      halign: "left",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: BRAND.panel,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 30, halign: "center" },
    },
    didParseCell: function (data: any) {
      if (data.section === "body" && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === "MET") {
          data.cell.styles.textColor = BRAND.greenAccent;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = BRAND.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  yPos = (doc.lastAutoTable?.finalY || yPos) + 8;

  // Shift Timings
  if (report.shiftTimings.length > 0) {
    yPos = checkPageBreak(doc, yPos, 30, pageWidth, pageHeight);

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SHIFT TIMINGS", 14, yPos);
    yPos += 6;

    const timingHead = [["Timing", "Status"]];
    const timingBody = report.shiftTimings.map((t) => [
      `${t.label}: ${t.actual ? new Date(t.actual).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}`,
      t.status,
    ]);

    doc.autoTable({
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: timingHead,
      body: timingBody,
      theme: "plain",
      headStyles: {
        fillColor: BRAND.green,
        textColor: BRAND.gold,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: BRAND.text,
        cellPadding: 3,
        lineColor: BRAND.border,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: BRAND.panel },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "center" },
      },
      didParseCell: function (data: any) {
        if (data.section === "body" && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val === "On time") {
            data.cell.styles.textColor = BRAND.greenAccent;
          } else if (val === "Early" || val === "Late") {
            data.cell.styles.textColor = BRAND.gold;
          }
        }
      },
    });

    yPos = (doc.lastAutoTable?.finalY || yPos) + 8;
  }

  // Orders
  if (report.orders.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40, pageWidth, pageHeight);

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ORDERS", 14, yPos);
    yPos += 6;

    const orderRows: (string | number)[][] = [];
    report.orders.forEach((order) => {
      order.lines.forEach((line) => {
        orderRows.push([
          order.customerName,
          line.sku,
          line.quantity,
          `KES ${line.unitPrice.toLocaleString()}`,
          `KES ${line.amount.toLocaleString()}`,
        ]);
      });
    });

    if (orderRows.length > 0) {
      doc.autoTable({
        startY: yPos,
        margin: { left: 14, right: 14 },
        head: [["Customer", "SKU", "Qty", "Unit Price", "Amount"]],
        body: orderRows,
        theme: "plain",
        headStyles: {
          fillColor: BRAND.green,
          textColor: BRAND.gold,
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: BRAND.text,
          cellPadding: 3,
          lineColor: BRAND.border,
          lineWidth: 0.2,
        },
        alternateRowStyles: { fillColor: BRAND.panel },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 35, halign: "right" },
          4: { cellWidth: 35, halign: "right" },
        },
      });
      yPos = (doc.lastAutoTable?.finalY || yPos) + 8;
    }
  }

  // Missing Items
  if (report.missingItems.length > 0) {
    yPos = checkPageBreak(doc, yPos, 30, pageWidth, pageHeight);

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("MISSING ITEMS", 14, yPos);
    yPos += 6;

    const missingHead = [["Item", "Qty", "By N Customers", "Notes"]];
    const missingBody = report.missingItems.map((m) => [
      m.sku,
      m.cartonsAffected,
      m.customerCountAffected,
      m.notes || "—",
    ]);

    doc.autoTable({
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: missingHead,
      body: missingBody,
      theme: "plain",
      headStyles: {
        fillColor: BRAND.green,
        textColor: BRAND.gold,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: BRAND.text,
        cellPadding: 3,
        lineColor: BRAND.border,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: BRAND.panel },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "center" },
        3: { cellWidth: 70 },
      },
    });
    yPos = (doc.lastAutoTable?.finalY || yPos) + 8;
  }

  // Comments
  if (report.comments) {
    yPos = checkPageBreak(doc, yPos, 25, pageWidth, pageHeight);

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("COMMENTS", 14, yPos);
    yPos += 6;

    doc.setFillColor(...BRAND.panel);
    doc.roundedRect(14, yPos, pageWidth - 28, 12, 1, 1, "F");
    doc.setDrawColor(...BRAND.border);
    doc.roundedRect(14, yPos, pageWidth - 28, 12, 1, 1, "S");

    doc.setTextColor(...BRAND.text);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(report.comments, pageWidth - 36);
    doc.text(lines.slice(0, 3), 18, yPos + 5);
    yPos += 16;
  }

  // Closing Banner
  yPos = checkPageBreak(doc, yPos, 20, pageWidth, pageHeight);
  doc.setFillColor(...BRAND.darkGreen);
  doc.roundedRect(14, yPos, pageWidth - 28, 14, 1, 1, "F");
  doc.setFillColor(...BRAND.gold);
  doc.rect(14, yPos, pageWidth - 28, 0.5, "F");

  const bannerMsg = report.kpiStatus === "MET"
    ? "GREAT WORK TODAY! KEEP IT UP!"
    : "KEEP PUSHING! CONSISTENCY BREEDS SUCCESS!";

  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(bannerMsg, pageWidth / 2, yPos + 8.5, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

export function generateDailyOverviewPDF(date: string, reports: ComputedReport[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  const dateStr = new Date(date).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let yPos = drawBrandHeader(doc, "DAILY OPERATIONS OVERVIEW", `${reports.length} routes active`, dateStr, pageWidth);

  // Summary stats
  const totalSales = reports.reduce((s, r) => s + r.summary.salesActual, 0);
  const totalTarget = reports.reduce((s, r) => s + r.summary.salesTarget, 0);
  const metCount = reports.filter((r) => r.kpiStatus === "MET").length;
  const totalMissing = reports.reduce((s, r) => s + r.summary.missingItemsTotal, 0);

  const stats = [
    { label: "Total Sales", value: `KES ${totalSales.toLocaleString()}` },
    { label: "Target", value: `KES ${totalTarget.toLocaleString()}` },
    { label: "KPIs Met", value: `${metCount}/${reports.length}` },
    { label: "Missing Items", value: String(totalMissing) },
  ];

  const statWidth = (pageWidth - 28) / 4;
  stats.forEach((stat, i) => {
    const x = 14 + i * statWidth;
    doc.setFillColor(...BRAND.panel);
    doc.roundedRect(x, yPos, statWidth - 4, 14, 1, 1, "F");
    doc.setDrawColor(...BRAND.border);
    doc.roundedRect(x, yPos, statWidth - 4, 14, 1, 1, "S");

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x + 4, yPos + 5);

    doc.setTextColor(...BRAND.text);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + 4, yPos + 11);
  });

  yPos += 20;

  // Route summary table
  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ROUTE PERFORMANCE", 14, yPos);
  yPos += 6;

  const routeHead = [["Route", "Rep", "Driver", "Sales", "Target", "Attainment", "KPI", "Missing"]];
  const routeBody = reports.map((r) => [
    r.route.name,
    r.salesRep.name,
    r.driver.name,
    `KES ${r.summary.salesActual.toLocaleString()}`,
    `KES ${r.summary.salesTarget.toLocaleString()}`,
    `${r.attainment}%`,
    r.kpiStatus,
    String(r.summary.missingItemsTotal),
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: routeHead,
    body: routeBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 25, halign: "center" },
      6: { cellWidth: 25, halign: "center" },
      7: { cellWidth: 20, halign: "center" },
    },
    didParseCell: function (data: any) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val === "MET") {
          data.cell.styles.textColor = BRAND.greenAccent;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = BRAND.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

export function generateWeeklySummaryPDF(date: string, reports: ComputedReport[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  const stats = computeWeeklyStats(reports);
  const weekEnd = new Date(date);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dateRange = `${new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;

  let yPos = drawBrandHeader(doc, "WEEKLY EXECUTIVE SUMMARY", `${reports.length} daily reports analyzed`, dateRange, pageWidth);

  // Summary stats
  const summaryStats = [
    { label: "Total Sales", value: `KES ${stats.totalSales.toLocaleString()}` },
    { label: "Avg Attainment", value: `${stats.avgAttainment}%` },
    { label: "KPIs Met", value: `${stats.metCount}/${stats.metCount + stats.notMetCount}` },
    { label: "Total Complaints", value: String(stats.totalComplaints) },
    { label: "Missing Items", value: String(stats.totalMissingItems) },
  ];

  const statWidth = (pageWidth - 28) / 5;
  summaryStats.forEach((stat, i) => {
    const x = 14 + i * statWidth;
    doc.setFillColor(...BRAND.panel);
    doc.roundedRect(x, yPos, statWidth - 4, 14, 1, 1, "F");
    doc.setDrawColor(...BRAND.border);
    doc.roundedRect(x, yPos, statWidth - 4, 14, 1, 1, "S");

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x + 4, yPos + 5);

    doc.setTextColor(...BRAND.text);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + 4, yPos + 11);
  });

  yPos += 20;

  // Route breakdown
  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ROUTE PERFORMANCE BREAKDOWN", 14, yPos);
  yPos += 6;

  const routeHead = [["Route", "Rep", "Driver", "Sales", "Target", "Attainment", "KPI", "Complaints", "Missing"]];
  const routeBody = reports.map((r) => [
    r.route.name,
    r.salesRep.name,
    r.driver.name,
    `KES ${r.summary.salesActual.toLocaleString()}`,
    `KES ${r.summary.salesTarget.toLocaleString()}`,
    `${r.attainment}%`,
    r.kpiStatus,
    String(r.kpis.find((k) => k.metric === "Complaints")?.actual || 0),
    String(r.summary.missingItemsTotal),
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: routeHead,
    body: routeBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: "bold" },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 22, halign: "center" },
      8: { cellWidth: 18, halign: "center" },
    },
    didParseCell: function (data: any) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val === "MET") {
          data.cell.styles.textColor = BRAND.greenAccent;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = BRAND.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  yPos = (doc.lastAutoTable?.finalY || yPos) + 10;

  // Daily trend
  const uniqueDates = [...new Set(reports.map((r) => r.date))].sort();
  if (uniqueDates.length > 1) {
    yPos = checkPageBreak(doc, yPos, 40, pageWidth, pageHeight);

    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DAILY TREND", 14, yPos);
    yPos += 6;

    const trendHead = [["Date", "Total Sales", "Target", "Attainment", "Routes Active"]];
    const trendBody = uniqueDates.map((d) => {
      const dayReports = reports.filter((r) => r.date === d);
      const daySales = dayReports.reduce((s, r) => s + r.summary.salesActual, 0);
      const dayTarget = dayReports.reduce((s, r) => s + r.summary.salesTarget, 0);
      const dayAtt = dayTarget > 0 ? Math.round((daySales / dayTarget) * 100) : 0;
      return [
        new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" }),
        `KES ${daySales.toLocaleString()}`,
        `KES ${dayTarget.toLocaleString()}`,
        `${dayAtt}%`,
        String(dayReports.length),
      ];
    });

    doc.autoTable({
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: trendHead,
      body: trendBody,
      theme: "plain",
      headStyles: {
        fillColor: BRAND.green,
        textColor: BRAND.gold,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: BRAND.text,
        cellPadding: 3,
        lineColor: BRAND.border,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: BRAND.panel },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 30, halign: "center" },
      },
    });
  }

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

export function generatePerformancePDF(reports: ComputedReport[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  let yPos = drawBrandHeader(doc, "PERFORMANCE ANALYTICS", "Route-level performance analysis", new Date().toLocaleDateString("en-KE"), pageWidth);

  // Route performance
  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ROUTE RANKINGS", 14, yPos);
  yPos += 6;

  const sorted = [...reports].sort((a, b) => b.attainment - a.attainment);

  const rankHead = [["Rank", "Route", "Rep", "Attainment", "Sales", "Target", "Status"]];
  const rankBody = sorted.map((r, i) => [
    String(i + 1),
    r.route.name,
    r.salesRep.name,
    `${r.attainment}%`,
    `KES ${r.summary.salesActual.toLocaleString()}`,
    `KES ${r.summary.salesTarget.toLocaleString()}`,
    r.kpiStatus,
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: rankHead,
    body: rankBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    columnStyles: {
      0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 30, fontStyle: "bold" },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 35, halign: "right" },
      6: { cellWidth: 25, halign: "center" },
    },
    didParseCell: function (data: any) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val === "MET") {
          data.cell.styles.textColor = BRAND.greenAccent;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = BRAND.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

export function generateMissingItemsPDF(
  items: { sku: string; count: number; cartons: number; customers: number; routes: string[] }[]
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  let yPos = drawBrandHeader(doc, "MISSING ITEMS REPORT", "Items affecting sales performance", new Date().toLocaleDateString("en-KE"), pageWidth);

  const tableHead = [["Item", "Frequency", "Cartons", "Customers Affected", "Routes"]];
  const tableBody = items.map((m) => [
    m.sku,
    String(m.count),
    String(m.cartons),
    String(m.customers),
    m.routes.join(", "),
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: tableHead,
    body: tableBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 35, halign: "center" },
      4: { cellWidth: 60 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

export function generateReturnsPDF(
  returnsByType: { type: string; count: number; amount: number }[],
  detailedReturns: { date: string; driver: string; route: string; sku: string; type: string; qty: number; amount: number }[]
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBg(doc, pageWidth, pageHeight);

  let yPos = drawBrandHeader(doc, "RETURNS ANALYSIS", "Return trends and breakdown", new Date().toLocaleDateString("en-KE"), pageWidth);

  // Summary by type
  doc.setTextColor(...BRAND.gold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RETURNS BY TYPE", 14, yPos);
  yPos += 6;

  const typeHead = [["Type", "Count", "Total Amount"]];
  const typeBody = returnsByType.map((r) => [
    r.type.replace(/_/g, " "),
    String(r.count),
    `KES ${r.amount.toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: typeHead,
    body: typeBody,
    theme: "plain",
    headStyles: {
      fillColor: BRAND.green,
      textColor: BRAND.gold,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND.text,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: BRAND.panel },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
    },
  });

  yPos = (doc.lastAutoTable?.finalY || yPos) + 10;

  // Detailed returns
  if (detailedReturns.length > 0) {
    doc.setTextColor(...BRAND.gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DETAILED RETURNS", 14, yPos);
    yPos += 6;

    const detailHead = [["Date", "Driver", "Route", "SKU", "Type", "Qty", "Amount"]];
    const detailBody = detailedReturns.map((r) => [
      new Date(r.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
      r.driver,
      r.route,
      r.sku,
      r.type.replace(/_/g, " "),
      String(r.qty),
      `KES ${r.amount.toLocaleString()}`,
    ]);

    doc.autoTable({
      startY: yPos,
      margin: { left: 14, right: 14 },
      head: detailHead,
      body: detailBody,
      theme: "plain",
      headStyles: {
        fillColor: BRAND.green,
        textColor: BRAND.gold,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: BRAND.text,
        cellPadding: 3,
        lineColor: BRAND.border,
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: BRAND.panel },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 30 },
        2: { cellWidth: 28 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 },
        5: { cellWidth: 15, halign: "center" },
        6: { cellWidth: 30, halign: "right" },
      },
    });
  }

  const pageCount = doc.getNumberOfPages();
  drawFooter(doc, pageCount, pageWidth, pageHeight);

  return doc;
}

// ============================================================
// KH Account Unblock Letter Template
// ============================================================

const KH = {
  navy: [11, 42, 74] as [number, number, number],
  navyDark: [20, 33, 61] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  cream: [255, 253, 245] as [number, number, number],
  textNavy: [11, 42, 74] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function drawDoubleBorder(doc: jsPDF, pw: number, ph: number) {
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pw - 16, ph - 16);
  doc.setDrawColor(...KH.navy);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pw - 20, ph - 20);
}

function drawCornerRibbons(doc: jsPDF, pw: number, ph: number) {
  // Top-left ribbon
  doc.setFillColor(...KH.navy);
  doc.triangle(0, 0, 45, 0, 0, 45, "F");
  doc.setFillColor(...KH.gold);
  doc.triangle(0, 0, 25, 0, 0, 25, "F");

  // Bottom-right ribbon
  doc.setFillColor(...KH.navy);
  doc.triangle(pw, ph, pw - 45, ph, pw, ph - 45, "F");
  doc.setFillColor(...KH.gold);
  doc.triangle(pw, ph, pw - 25, ph, pw, ph - 25, "F");
}

function drawCrest(doc: jsPDF, x: number, y: number) {
  // Laurel wreath — simplified as two symmetric curved paths using lines
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.6);
  // Left branch arc (approximated with lines)
  for (let i = 0; i < 8; i++) {
    const angle = (200 + i * 17) * Math.PI / 180;
    const rx = 14, ry = 20;
    const cx = x - 2, cy = y - 18;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    const angle2 = (200 + (i + 1) * 17) * Math.PI / 180;
    const px2 = cx + rx * Math.cos(angle2);
    const py2 = cy + ry * Math.sin(angle2);
    doc.line(px, py, px2, py2);
  }
  // Right branch arc
  for (let i = 0; i < 8; i++) {
    const angle = (200 + i * 17) * Math.PI / 180;
    const rx = 14, ry = 20;
    const cx = x + 2, cy = y - 18;
    const px = cx - rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    const angle2 = (200 + (i + 1) * 17) * Math.PI / 180;
    const px2 = cx - rx * Math.cos(angle2);
    const py2 = cy + ry * Math.sin(angle2);
    doc.line(px, py, px2, py2);
  }

  // Star
  doc.setFillColor(...KH.gold);
  doc.setFontSize(8);
  doc.text("\u2605", x, y - 28, { align: "center" });

  // KH monogram
  doc.setTextColor(...KH.navy);
  doc.setFontSize(28);
  doc.setFont("times", "bold");
  doc.text("KH", x, y, { align: "center" });

  // Company name
  doc.setFontSize(9);
  doc.setFont("times", "bold");
  doc.text("KANINI HARAKA", x, y + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...KH.gold);
  doc.setFont("times", "normal");
  doc.text("ENTERPRISE", x, y + 16, { align: "center" });

  // Gold flourish
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.4);
  doc.line(x - 30, y + 22, x + 30, y + 22);
  doc.setFillColor(...KH.gold);
  doc.triangle(x - 2, y + 20, x + 2, y + 24, x - 2, y + 24, "F");
  doc.triangle(x + 2, y + 20, x - 2, y + 24, x + 2, y + 24, "F");
}

function drawInfoBlock(doc: jsPDF, x: number, y: number, repName: string, dateStr: string) {
  const items = [
    { icon: "\u263A", label: repName },
    { icon: "\u2302", label: "Nampark Branch, AnswerPort Ltd" },
    { icon: "\u2611", label: dateStr },
  ];

  // Vertical gold hairline
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.3);
  doc.line(x, y, x, y + 40);

  items.forEach((item, i) => {
    const iy = y + 4 + i * 14;
    // Circle icon
    doc.setFillColor(...KH.navy);
    doc.circle(x, iy, 3, "F");
    doc.setTextColor(...KH.white);
    doc.setFontSize(5);
    doc.text(item.icon, x, iy + 1, { align: "center" });
    // Text
    doc.setTextColor(...KH.textNavy);
    doc.setFontSize(7);
    doc.setFont("times", "normal");
    doc.text(item.label, x + 7, iy + 1.5);
  });
}

function drawToBanner(doc: jsPDF, x: number, y: number, text: string) {
  // Navy pill with notch
  doc.setFillColor(...KH.navyDark);
  doc.roundedRect(x, y, 25, 10, 2, 2, "F");
  // Notch (triangle cut on right)
  doc.setFillColor(...KH.cream);
  doc.triangle(x + 25, y, x + 30, y + 5, x + 25, y + 10, "F");
  // Text
  doc.setTextColor(...KH.gold);
  doc.setFontSize(10);
  doc.setFont("times", "italic");
  doc.text("To:", x + 4, y + 7);
}

function drawRefBanner(doc: jsPDF, pw: number, y: number, text: string) {
  const bannerW = pw - 60;
  const bx = 30;

  // Navy banner
  doc.setFillColor(...KH.navyDark);
  doc.rect(bx, y, bannerW, 12, "F");

  // Gold double-line border
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.4);
  doc.rect(bx + 2, y + 2, bannerW - 4, 8);

  // Flourishes on sides
  doc.setFillColor(...KH.gold);
  doc.circle(bx - 5, y + 6, 1.5, "F");
  doc.circle(bx + bannerW + 5, y + 6, 1.5, "F");

  // Text
  doc.setTextColor(...KH.white);
  doc.setFontSize(9);
  doc.setFont("times", "bold");
  doc.text(text, pw / 2, y + 8, { align: "center" });
}

function drawIconRail(doc: jsPDF, x: number, y: number) {
  const icons = ["\u260E", "\u2191", "\u2714"];
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x, y, x, y + 40);
  doc.setLineDashPattern([], 0);

  icons.forEach((icon, i) => {
    const iy = y + 5 + i * 14;
    doc.setDrawColor(...KH.navy);
    doc.setLineWidth(0.3);
    doc.circle(x, iy, 4, "S");
    doc.setTextColor(...KH.navy);
    doc.setFontSize(7);
    doc.text(icon, x, iy + 1.5, { align: "center" });
  });
}

function drawFooterKH(doc: jsPDF, pw: number, ph: number) {
  const fy = ph - 30;
  const fw = 120;
  const fx = (pw - fw) / 2;

  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(fx, fy, fw, 20, 3, 3, "S");

  doc.setTextColor(...KH.navy);
  doc.setFontSize(10);
  doc.setFont("times", "bold");
  doc.text("TOGETHER WE SUCCEED!", pw / 2, fy + 7, { align: "center" });

  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.3);
  doc.line(fx + 10, fy + 10, fx + fw - 10, fy + 10);

  doc.setFontSize(7);
  doc.setFont("times", "italic");
  doc.setTextColor(...KH.textNavy);
  doc.text("Thank you for your continued support and cooperation.", pw / 2, fy + 14, { align: "center" });

  doc.setTextColor(...KH.gold);
  doc.text("* We appreciate your prompt assistance. *", pw / 2, fy + 18, { align: "center" });
}

interface LetterData {
  repName: string;
  amount: number;
  justification: string;
  routeOrRetailerRef: string;
  requestedAt: string;
}

export function generateAccountLetter(data: LetterData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(...KH.cream);
  doc.rect(0, 0, pw, ph, "F");

  // Border & ribbons
  drawDoubleBorder(doc, pw, ph);
  drawCornerRibbons(doc, pw, ph);

  // Crest (top-left)
  drawCrest(doc, 45, 65);

  // Info block (top-right)
  const dateObj = new Date(data.requestedAt);
  const day = dateObj.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
  const dateStr = `${day}${suffix} ${dateObj.toLocaleDateString("en-KE", { month: "short", year: "numeric" })}`;
  drawInfoBlock(doc, pw - 50, 45, data.repName, dateStr);

  // To: banner
  drawToBanner(doc, 20, 100, "To:");
  doc.setTextColor(...KH.textNavy);
  doc.setFontSize(10);
  doc.setFont("times", "bold");
  doc.text("The Cashier,", 20, 118);
  doc.text("Nampark Branch", 20, 125);
  doc.text("AnswerPort Ltd", 20, 132);

  // Salutation
  doc.setTextColor(...KH.textNavy);
  doc.setFontSize(10);
  doc.setFont("times", "italic");
  doc.text("Dear sir,", 20, 150);

  // REF banner
  drawRefBanner(doc, pw, 162, `REF: Requesting to Unblock ${data.repName}'s Account`);

  // Body
  const bodyText = `I, ${data.repName}, request you to unblock my account with a pending balance of KES ${data.amount.toLocaleString()}. ${data.justification}`;
  doc.setTextColor(...KH.textNavy);
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  const bodyLines = doc.splitTextToSize(bodyText, pw - 60);
  doc.text(bodyLines, 20, 185);

  // Icon rail
  drawIconRail(doc, 15, 200);

  // Signature
  const sigY = 185 + bodyLines.length * 5 + 15;
  doc.setTextColor(...KH.textNavy);
  doc.setFontSize(10);
  doc.setFont("times", "italic");
  doc.text("Yours faithfully,", pw - 30, sigY, { align: "right" });
  doc.setFont("times", "bold");
  doc.text(data.repName, pw - 30, sigY + 8, { align: "right" });

  // Gold flourish under signature
  doc.setDrawColor(...KH.gold);
  doc.setLineWidth(0.4);
  doc.line(pw - 65, sigY + 12, pw - 15, sigY + 12);

  // Footer
  drawFooterKH(doc, pw, ph);

  return doc;
}

export { computeReport };
