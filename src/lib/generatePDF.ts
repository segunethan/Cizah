import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNaira } from './format';

interface ReportSummary {
  totalInflow: number;
  totalOutflow: number;
  totalDeductions: number;
  actualEarnings: number;
}

interface MonthlyRow {
  month: string;
  inflow: number;
  outflow: number;
  deductions: number;
  net: number;
}

interface CategoryBreakdown {
  [key: string]: number;
}

export const generateMonthlyReportPDF = (
  month: string,
  year: number,
  summary: ReportSummary,
  inflowBreakdown: CategoryBreakdown,
  outflowBreakdown: CategoryBreakdown,
  reliefBreakdown: CategoryBreakdown,
  userName?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(45, 100, 246); // Primary color
  doc.text('Ciza', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('Ministry Finance Report', 20, 32);
  
  // Report Title
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(`${month} ${year} Report`, 20, 50);
  
  if (userName) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared for: ${userName}`, 20, 58);
  }
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65);
  
  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Summary', 20, 80);
  
  autoTable(doc, {
    startY: 85,
    head: [['Category', 'Amount']],
    body: [
      ['Total Inflow', formatNaira(summary.totalInflow)],
      ['Total Outflow', formatNaira(summary.totalOutflow)],
      ['Tax Reliefs', formatNaira(summary.totalDeductions)],
      ['Net Earnings', formatNaira(summary.actualEarnings)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [45, 100, 246] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Inflow Breakdown
  if (Object.keys(inflowBreakdown).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Green
    doc.text('Inflows by Category', 20, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Category', 'Amount']],
      body: Object.entries(inflowBreakdown).map(([cat, amt]) => [cat, formatNaira(amt)]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: { 1: { halign: 'right' } },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Outflow Breakdown
  if (Object.keys(outflowBreakdown).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68); // Red
    doc.text('Outflows by Category', 20, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Category', 'Amount']],
      body: Object.entries(outflowBreakdown).map(([cat, amt]) => [cat, formatNaira(amt)]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      columnStyles: { 1: { halign: 'right' } },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Relief Breakdown
  if (Object.keys(reliefBreakdown).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('Tax Reliefs', 20, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Category', 'Amount']],
      body: Object.entries(reliefBreakdown).map(([cat, amt]) => [cat, formatNaira(amt)]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 1: { halign: 'right' } },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Ciza - Ministry Finance Manager`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`Ciza_${month}_${year}_Report.pdf`);
};

interface YearlyTotals {
  inflow: number;
  outflow: number;
  deductions: number;
  net: number;
}

export const generateYearlyReportPDF = (
  year: number,
  monthlyData: MonthlyRow[],
  yearlyTotals: YearlyTotals,
  userName?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(45, 100, 246);
  doc.text('Ciza', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('Ministry Finance Report', 20, 32);
  
  // Report Title
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(`${year} Annual Report`, 20, 50);
  
  if (userName) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared for: ${userName}`, 20, 58);
  }
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65);
  
  // Annual Summary
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Annual Summary', 20, 80);
  
  autoTable(doc, {
    startY: 85,
    head: [['Category', 'Amount']],
    body: [
      ['Total Inflow', formatNaira(yearlyTotals.inflow)],
      ['Total Outflow', formatNaira(yearlyTotals.outflow)],
      ['Tax Reliefs', formatNaira(yearlyTotals.deductions)],
      ['Net Earnings', formatNaira(yearlyTotals.net)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [45, 100, 246] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Monthly Comparison Table
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Monthly Breakdown', 20, currentY);
  
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Month', 'Inflow', 'Outflow', 'Reliefs', 'Net Earnings']],
    body: monthlyData.map(row => [
      row.month,
      formatNaira(row.inflow),
      formatNaira(row.outflow),
      formatNaira(row.deductions),
      formatNaira(row.net),
    ]),
    foot: [[
      'Total',
      formatNaira(yearlyTotals.inflow),
      formatNaira(yearlyTotals.outflow),
      formatNaira(yearlyTotals.deductions),
      formatNaira(yearlyTotals.net),
    ]],
    theme: 'striped',
    headStyles: { fillColor: [45, 100, 246] },
    footStyles: { fillColor: [45, 100, 246], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', textColor: [16, 185, 129] },
      2: { halign: 'right', textColor: [239, 68, 68] },
      3: { halign: 'right', textColor: [59, 130, 246] },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Ciza - Ministry Finance Manager`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`Ciza_${year}_Annual_Report.pdf`);
};
