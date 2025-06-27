import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/types/invoice';
import { getStateFromGSTIN } from './utils';

// Compact currency formatter for PDF tables
function formatCompactCurrency(amount: number | string): string {
  if (typeof amount === 'string') {
    if (amount === '' || amount === '0') return '';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;
    amount = numAmount;
  }
  if (amount === 0) return '';

  // Round the amount to nearest whole number
  const roundedAmount = Math.round(amount);

  // Format as compact number without rupee symbol
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}



// Function to determine appropriate font size based on text length
const getResponsiveFontSize = (text: string, maxLength: number, baseFontSize: number = 7): number => {
  if (!text) return baseFontSize;

  const textLength = text.length;

  if (textLength <= maxLength) {
    return baseFontSize; // Normal size
  } else if (textLength <= maxLength * 1.5) {
    return Math.max(baseFontSize - 1, 5); // Slightly smaller
  } else if (textLength <= maxLength * 2) {
    return Math.max(baseFontSize - 2, 4); // Smaller
  } else {
    return Math.max(baseFontSize - 3, 3); // Minimum readable size
  }
};

// Column character limits for responsive font sizing
const COLUMN_LIMITS = {
  sno: 3,
  town: 8,
  location: 15,
  hsn: 8,
  media: 10,
  size: 8,
  area: 6,
  type: 8,
  ratePM: 10,
  period: 20,
  amount: 12
};

export function generateInvoicePDF(invoice: Invoice): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;

  // Page management variables (removed unused variables)

  // Function to add header and footer to any page
  function addHeaderFooter(pageNumber: number) {
    // Header Image Section - Outside invoice boundary
    const headerHeight = 25;
    const headerMargin = 5;

    // Load and add header image
    const headerImg = new Image();
    headerImg.crossOrigin = 'anonymous';
    headerImg.onload = function() {
      // Add header image to PDF at the very top
      doc.addImage(headerImg, 'JPEG', headerMargin, headerMargin, pageWidth - (headerMargin * 2), headerHeight);
    };

    headerImg.onerror = function() {
      console.warn('Could not load header image, using fallback design');
      createFallbackHeader();
    };

    // Try to load the header image
    headerImg.src = '/header-image.jpg';

    function createFallbackHeader() {
      // Header design with decorative elements
      doc.rect(headerMargin, headerMargin, pageWidth - (headerMargin * 2), headerHeight);

      // Add decorative elements (diamond-shaped squares to represent the design)
      doc.setFillColor(255, 140, 66); // Orange color
      const squareSize = 2.5;

      // Left side decorative pattern
      doc.rect(headerMargin + 6, headerMargin + 6, squareSize, squareSize, 'F');
      doc.rect(headerMargin + 13, headerMargin + 10, squareSize * 1.2, squareSize * 1.2, 'F');
      doc.rect(headerMargin + 23, headerMargin + 4, squareSize * 0.8, squareSize * 0.8, 'F');
      doc.rect(headerMargin + 30, headerMargin + 13, squareSize, squareSize, 'F');
      doc.rect(headerMargin + 10, headerMargin + 18, squareSize * 1.1, squareSize * 1.1, 'F');
      doc.rect(headerMargin + 20, headerMargin + 22, squareSize * 0.7, squareSize * 0.7, 'F');

      // Center logo area with border
      const logoX = pageWidth / 2 - 35;
      const logoY = headerMargin + 4;
      const logoWidth = 70;
      const logoHeight = 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(logoX, logoY, logoWidth, logoHeight);

      // Company name in logo area
      doc.setFillColor(0, 0, 0); // Reset to black
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DESHKAR', logoX + logoWidth / 2, logoY + 9, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('ADVERTISING', logoX + logoWidth / 2, logoY + 15, { align: 'center' });

      // Right side decorative pattern
      doc.setFillColor(255, 140, 66); // Orange color
      doc.rect(pageWidth - headerMargin - 13, headerMargin + 6, squareSize * 1.1, squareSize * 1.1, 'F');
      doc.rect(pageWidth - headerMargin - 23, headerMargin + 10, squareSize * 1.3, squareSize * 1.3, 'F');
      doc.rect(pageWidth - headerMargin - 33, headerMargin + 4, squareSize, squareSize, 'F');
      doc.rect(pageWidth - headerMargin - 18, headerMargin + 18, squareSize * 0.8, squareSize * 0.8, 'F');
      doc.rect(pageWidth - headerMargin - 28, headerMargin + 22, squareSize * 1.2, squareSize * 1.2, 'F');
      doc.rect(pageWidth - headerMargin - 38, headerMargin + 13, squareSize * 0.7, squareSize * 0.7, 'F');
    }

    // Footer Section - Outside invoice boundary at bottom
    const footerHeight = 25;
    const footerMargin = 5;
    const footerY = pageHeight - footerHeight - footerMargin;

    // Load and add footer image
    const footerImg = new Image();
    footerImg.crossOrigin = 'anonymous';
    footerImg.onload = function() {
      // Add footer image to PDF at the very bottom
      doc.addImage(footerImg, 'JPEG', footerMargin, footerY, pageWidth - (footerMargin * 2), footerHeight);
    };

    footerImg.onerror = function() {
      console.warn('Could not load footer image, using fallback design');
      createFallbackFooter();
    };

    // Try to load the footer image
    footerImg.src = '/footer-image.jpg';

    function createFallbackFooter() {
      // Footer design with contact information
      // Draw footer border
      doc.rect(footerMargin, footerY, pageWidth - (footerMargin * 2), footerHeight);

      // Add decorative elements in footer
      doc.setFillColor(255, 140, 66); // Orange color
      const footerSquareSize = 1.5;

      // Left side decorative pattern
      doc.rect(footerMargin + 6, footerY + 5, footerSquareSize, footerSquareSize, 'F');
      doc.rect(footerMargin + 10, footerY + 8, footerSquareSize * 1.2, footerSquareSize * 1.2, 'F');
      doc.rect(footerMargin + 16, footerY + 4, footerSquareSize * 0.8, footerSquareSize * 0.8, 'F');
      doc.rect(footerMargin + 20, footerY + 10, footerSquareSize, footerSquareSize, 'F');
      doc.rect(footerMargin + 8, footerY + 15, footerSquareSize * 1.1, footerSquareSize * 1.1, 'F');
      doc.rect(footerMargin + 14, footerY + 18, footerSquareSize * 0.7, footerSquareSize * 0.7, 'F');

      // Contact Information
      doc.setFillColor(0, 0, 0); // Reset to black
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);

      // Address
      doc.text('R15, SP Tower 1st Floor, Anupam Nagar, Nr. Flyover, Raipur, Chhattisgarh 492007', footerMargin + 28, footerY + 8);

      // Phone and Email
      doc.text('Phone: +91 771 2538818', footerMargin + 28, footerY + 14);
      doc.text('Email: deshkaradvertising@gmail.com', footerMargin + 78, footerY + 14);

      // Website
      doc.text('Website: www.deshkaradvertising.com', footerMargin + 28, footerY + 20);

      // IOAA Membership Box
      const ioaaX = pageWidth - 80;
      const ioaaY = footerY + 3;
      const ioaaWidth = 50;
      const ioaaHeight = 18;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(ioaaX, ioaaY, ioaaWidth, ioaaHeight);

      doc.setFontSize(5);
      doc.text('Proud Member Of', ioaaX + ioaaWidth / 2, ioaaY + 4, { align: 'center' });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('INDIAN OUTDOOR', ioaaX + ioaaWidth / 2, ioaaY + 8, { align: 'center' });
      doc.text('ADVERTISING', ioaaX + ioaaWidth / 2, ioaaY + 12, { align: 'center' });
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text('ASSOCIATION', ioaaX + ioaaWidth / 2, ioaaY + 16, { align: 'center' });

      // Right side decorative pattern
      doc.setFillColor(255, 140, 66); // Orange color
      doc.rect(pageWidth - footerMargin - 13, footerY + 5, footerSquareSize * 1.1, footerSquareSize * 1.1, 'F');
      doc.rect(pageWidth - footerMargin - 18, footerY + 8, footerSquareSize * 1.3, footerSquareSize * 1.3, 'F');
      doc.rect(pageWidth - footerMargin - 24, footerY + 4, footerSquareSize, footerSquareSize, 'F');
      doc.rect(pageWidth - footerMargin - 16, footerY + 15, footerSquareSize * 0.8, footerSquareSize * 0.8, 'F');
      doc.rect(pageWidth - footerMargin - 22, footerY + 18, footerSquareSize * 1.2, footerSquareSize * 1.2, 'F');
      doc.rect(pageWidth - footerMargin - 28, footerY + 10, footerSquareSize * 0.7, footerSquareSize * 0.7, 'F');
    }

    // Add page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNumber}`, pageWidth - 30, footerY - 5);
  }

  // Header Image Section - Outside invoice boundary
  const headerHeight = 25;
  const headerMargin = 5;

  // Load and add header image
  const headerImg = new Image();
  headerImg.crossOrigin = 'anonymous';
  headerImg.onload = function() {
    // Add header image to PDF at the very top
    doc.addImage(headerImg, 'JPEG', headerMargin, headerMargin, pageWidth - (headerMargin * 2), headerHeight);

    // Continue with the rest of the PDF generation
    generateRestOfPDF();
  };

  headerImg.onerror = function() {
    console.warn('Could not load header image, using fallback design');
    // Fallback header design
    createFallbackHeader();
    generateRestOfPDF();
  };

  // Try to load the header image
  headerImg.src = '/header-image.jpg';

  function createFallbackHeader() {
    // Header design with decorative elements
    doc.rect(headerMargin, headerMargin, pageWidth - (headerMargin * 2), headerHeight);

    // Add decorative elements (diamond-shaped squares to represent the design)
    doc.setFillColor(255, 140, 66); // Orange color
    const squareSize = 2.5;

    // Left side decorative pattern
    doc.rect(headerMargin + 6, headerMargin + 6, squareSize, squareSize, 'F');
    doc.rect(headerMargin + 13, headerMargin + 10, squareSize * 1.2, squareSize * 1.2, 'F');
    doc.rect(headerMargin + 23, headerMargin + 4, squareSize * 0.8, squareSize * 0.8, 'F');
    doc.rect(headerMargin + 30, headerMargin + 13, squareSize, squareSize, 'F');
    doc.rect(headerMargin + 10, headerMargin + 18, squareSize * 1.1, squareSize * 1.1, 'F');
    doc.rect(headerMargin + 20, headerMargin + 22, squareSize * 0.7, squareSize * 0.7, 'F');

    // Center logo area with border
    const logoX = pageWidth / 2 - 35;
    const logoY = headerMargin + 4;
    const logoWidth = 70;
    const logoHeight = 18;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(logoX, logoY, logoWidth, logoHeight);

    // Company name in logo area
    doc.setFillColor(0, 0, 0); // Reset to black
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DESHKAR', logoX + logoWidth / 2, logoY + 9, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ADVERTISING', logoX + logoWidth / 2, logoY + 15, { align: 'center' });

    // Right side decorative pattern
    doc.setFillColor(255, 140, 66); // Orange color
    doc.rect(pageWidth - headerMargin - 13, headerMargin + 6, squareSize * 1.1, squareSize * 1.1, 'F');
    doc.rect(pageWidth - headerMargin - 23, headerMargin + 10, squareSize * 1.3, squareSize * 1.3, 'F');
    doc.rect(pageWidth - headerMargin - 33, headerMargin + 4, squareSize, squareSize, 'F');
    doc.rect(pageWidth - headerMargin - 18, headerMargin + 18, squareSize * 0.8, squareSize * 0.8, 'F');
    doc.rect(pageWidth - headerMargin - 28, headerMargin + 22, squareSize * 1.2, squareSize * 1.2, 'F');
    doc.rect(pageWidth - headerMargin - 38, headerMargin + 13, squareSize * 0.7, squareSize * 0.7, 'F');
  }

  // Start first page
  addHeaderFooter(1);

  function generateRestOfPDF() {
    // Invoice boundary starts below header
    const headerHeight = 25;
    const headerMargin = 5;
    const invoiceStartY = headerHeight + headerMargin + 10;

    // Calculate available space for content (excluding header and footer)
    const footerSpace = 50; // Space reserved for footer
    const availableHeight = pageHeight - invoiceStartY - footerSpace;

    // Draw main invoice border for first page
    doc.rect(margin, invoiceStartY, pageWidth - (margin * 2), availableHeight);

    // Tax Invoice Title (centered at top of invoice)
    doc.setFillColor(0, 0, 0); // Reset to black
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Invoice', pageWidth / 2, invoiceStartY + 15, { align: 'center' });

    // Draw horizontal line under title
    doc.line(margin + 2, invoiceStartY + 19, pageWidth - margin - 2, invoiceStartY + 19);

    // Customer and PO Details Section with proper boxing
    const detailsY = invoiceStartY + 24;
    const detailsHeight = 45;

  // Draw main box for customer and PO details
  doc.rect(margin + 2, detailsY, pageWidth - (margin * 2) - 4, detailsHeight);

  // Vertical line to separate customer and PO details
  const middleX = pageWidth / 2 + 15;
  doc.line(middleX, detailsY, middleX, detailsY + detailsHeight);

  // Left side - Customer Details Box
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('To,', margin + 5, detailsY + 6);

  doc.setFont('helvetica', 'bold');
  const customerName = invoice.billingParty.name;
  const maxLeftWidth = middleX - margin - 10;
  const customerNameLines = doc.splitTextToSize(customerName, maxLeftWidth);
  let currentY = detailsY + 12;
  customerNameLines.forEach((line: string) => {
    doc.text(line, margin + 5, currentY);
    currentY += 3.5;
  });

  doc.setFont('helvetica', 'normal');
  // Handle long addresses by wrapping with smaller font
  const customerAddressLines = doc.splitTextToSize(invoice.billingParty.address, maxLeftWidth);
  customerAddressLines.forEach((line: string) => {
    if (currentY < detailsY + detailsHeight - 5) { // Ensure we don't overflow the box
      doc.text(line, margin + 5, currentY);
      currentY += 3.5;
    }
  });

  // Add remaining details with space checking
  if (currentY < detailsY + detailsHeight - 5) {
    const cityStateText = `${invoice.billingParty.city}, ${invoice.billingParty.state} - ${invoice.billingParty.pincode}`;
    const cityStateLines = doc.splitTextToSize(cityStateText, maxLeftWidth);
    cityStateLines.forEach((line: string) => {
      if (currentY < detailsY + detailsHeight - 5) {
        doc.text(line, margin + 5, currentY);
        currentY += 3.5;
      }
    });
  }

  if (currentY < detailsY + detailsHeight - 5) {
    doc.setFont('helvetica', 'normal');
    doc.text('GSTIN: ', margin + 5, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.billingParty.gstin || '', margin + 20, currentY);
    currentY += 3.5;
  }

  if (currentY < detailsY + detailsHeight - 5) {
    const stateInfo = getStateFromGSTIN(invoice.billingParty.gstin || '');
    const stateCode = stateInfo?.code || '00';
    const stateText = `State: ${invoice.billingParty.state}, State Code: ${stateCode}`;
    const stateLines = doc.splitTextToSize(stateText, maxLeftWidth);
    stateLines.forEach((line: string) => {
      if (currentY < detailsY + detailsHeight - 5) {
        doc.text(line, margin + 5, currentY);
        currentY += 3.5;
      }
    });
  }

  // Right side - Invoice Details Box
  const rightX = middleX + 5;
  const maxRightWidth = pageWidth - middleX - margin - 10;
  let rightY = detailsY + 12;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // Invoice Number
  const invoiceNoText = `Invoice No: ${invoice.invoiceNumber}`;
  const invoiceNoLines = doc.splitTextToSize(invoiceNoText, maxRightWidth);
  invoiceNoLines.forEach((line: string) => {
    if (rightY < detailsY + detailsHeight - 5) {
      doc.text(line, rightX, rightY);
      rightY += 3.5;
    }
  });

  // Invoice Date
  const invoiceDateText = `Invoice Date: ${invoice.invoiceDate}`;
  const invoiceDateLines = doc.splitTextToSize(invoiceDateText, maxRightWidth);
  invoiceDateLines.forEach((line: string) => {
    if (rightY < detailsY + detailsHeight - 5) {
      doc.text(line, rightX, rightY);
      rightY += 3.5;
    }
  });

  // PO Number (if exists)
  if (invoice.poNumber && rightY < detailsY + detailsHeight - 5) {
    const poNoText = `PO NO.: ${invoice.poNumber}`;
    const poNoLines = doc.splitTextToSize(poNoText, maxRightWidth);
    poNoLines.forEach((line: string) => {
      if (rightY < detailsY + detailsHeight - 5) {
        doc.text(line, rightX, rightY);
        rightY += 3.5;
      }
    });
  }

  // PO Date (if exists)
  if (invoice.poDate && rightY < detailsY + detailsHeight - 5) {
    const poDateText = `PO Date: ${invoice.poDate}`;
    const poDateLines = doc.splitTextToSize(poDateText, maxRightWidth);
    poDateLines.forEach((line: string) => {
      if (rightY < detailsY + detailsHeight - 5) {
        doc.text(line, rightX, rightY);
        rightY += 3.5;
      }
    });
  }

  // Description section with box
  const descY = detailsY + detailsHeight + 5;
  const descHeight = 20;

  // Draw box around description
  doc.rect(margin + 2, descY - 2, pageWidth - (margin * 2) - 4, descHeight);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Towards the hoarding display charges at following particulars.', margin + 5, descY + 3);

  doc.setFont('helvetica', 'normal');
  doc.text('Display : " ', margin + 5, descY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.displayName || invoice.billingParty.name, margin + 25, descY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(' "', margin + 25 + doc.getTextWidth(invoice.displayName || invoice.billingParty.name), descY + 8);

  doc.text(`Duration : ${invoice.duration || '37 Days'}`, margin + 5, descY + 13);
  
  // Combined table data with items and totals
  const tableStartY = descY + descHeight + 5;
  const tableData = [
    // Main items
    ...invoice.items.map(item => [
      item.sno.toString(),
      item.town,
      item.location,
      item.hsn,
      item.media,
      item.size,
      item.area.toString(),
      item.type,
      formatCompactCurrency(item.ratePM),
      item.period,
      formatCompactCurrency(item.amount)
    ]),
    // Totals rows with empty cells for first 9 columns
    ['', '', '', '', '', '', '', '', '', 'SUB TOTAL', formatCompactCurrency(invoice.subtotal)],
    ['', '', '', '', '', '', '', '', '', 'Add : CGST @ 9%', invoice.cgst > 0 ? formatCompactCurrency(invoice.cgst) : '0'],
    ['', '', '', '', '', '', '', '', '', 'Add : SGST @ 9%', invoice.sgst > 0 ? formatCompactCurrency(invoice.sgst) : '0'],
    ['', '', '', '', '', '', '', '', '', 'Add : IGST @ 18%', invoice.igst > 0 ? formatCompactCurrency(invoice.igst) : '0'],
    ['', '', '', '', '', '', '', '', '', 'Less : PO', '0'],
    ['', '', '', '', '', '', '', '', '', 'GRAND TOTAL', formatCompactCurrency(invoice.grandTotal)]
  ];

  // Calculate available width for table
  const availableWidth = pageWidth - (margin * 2) - 4;

  // Split data for controlled pagination - max 13 rows on first page
  const maxRowsFirstPage = 13;
  const firstPageData = tableData.slice(0, maxRowsFirstPage);
  const remainingData = tableData.slice(maxRowsFirstPage);

  // First page table with exactly 13 rows max
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin + 2, right: margin + 2 },
    head: [['Sr.NO', 'TOWN', 'LOCATION', 'HSN', 'MEDIA', 'SIZE', 'AREA', 'TYPE', 'RATE P.M.', 'PERIOD', 'AMOUNT']],
    body: firstPageData,
    theme: 'plain',
    pageBreak: 'avoid', // Prevent auto page break
    showHead: 'firstPage',
    tableWidth: availableWidth,
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.25,
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2,
      overflow: 'linebreak',
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      halign: 'center',
      overflow: 'linebreak',
      cellWidth: 'wrap',
      textColor: [0, 0, 0]
    },
    alternateRowStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: availableWidth * 0.05 },    // Sr.NO - 5%
      1: { halign: 'center', cellWidth: availableWidth * 0.07 },    // TOWN - 7%
      2: { halign: 'center', cellWidth: availableWidth * 0.10 },    // LOCATION - 10%
      3: { halign: 'center', cellWidth: availableWidth * 0.06 },    // HSN - 6%
      4: { halign: 'center', cellWidth: availableWidth * 0.07 },    // MEDIA - 7%
      5: { halign: 'center', cellWidth: availableWidth * 0.06 },    // SIZE - 6%
      6: { halign: 'center', cellWidth: availableWidth * 0.05 },    // AREA - 5%
      7: { halign: 'center', cellWidth: availableWidth * 0.05 },    // TYPE - 5%
      8: { halign: 'right', cellWidth: availableWidth * 0.08 },     // RATE P.M. - 8%
      9: { halign: 'center', cellWidth: availableWidth * 0.19 },    // PERIOD - 19%
      10: { halign: 'right', cellWidth: availableWidth * 0.25 }     // AMOUNT - 25%
    },
    didParseCell: function(data) {
      // Force strict boundary respect and text wrapping
      data.cell.styles.overflow = 'linebreak';
      data.cell.styles.cellWidth = 'wrap';
      data.cell.styles.valign = 'middle';

      // Apply uniform border styling to ALL cells first
      data.cell.styles.lineWidth = 0.25;
      data.cell.styles.lineColor = [0, 0, 0];

      // Identify totals rows (starting from invoice.items.length)
      const totalsStartRow = invoice.items.length;
      const isSubTotalRow = data.row.index === totalsStartRow;
      const isGrandTotalRow = data.row.index === totalsStartRow + 5;
      const isTotalsRow = data.row.index >= totalsStartRow;

      // Style totals rows
      if (isTotalsRow) {
        // Hide borders for empty cells (columns 0-8)
        if (data.column.index < 9) {
          data.cell.styles.lineWidth = 0;
          data.cell.styles.lineColor = [255, 255, 255]; // White borders (invisible)
        } else {
          // Keep uniform borders for PERIOD and AMOUNT columns
          data.cell.styles.lineWidth = 0.25;
          data.cell.styles.lineColor = [0, 0, 0]; // Black borders
        }

        // Style SUB TOTAL and GRAND TOTAL rows with bold and gray background
        if (isSubTotalRow || isGrandTotalRow) {
          if (data.column.index >= 9) { // Only for PERIOD and AMOUNT columns
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240]; // Light gray background
          }
        }

        // Align totals labels to left in PERIOD column
        if (data.column.index === 9) {
          data.cell.styles.halign = 'left';
        }
      } else {
        // For regular item rows, apply responsive font sizing
        if (data.cell.text && data.cell.text.length > 0) {
          const text = data.cell.text[0];

          // Get column limits and apply responsive font sizing
          let maxLength;
          switch (data.column.index) {
            case 0: maxLength = COLUMN_LIMITS.sno; break;
            case 1: maxLength = COLUMN_LIMITS.town; break;
            case 2: maxLength = COLUMN_LIMITS.location; break;
            case 3: maxLength = COLUMN_LIMITS.hsn; break;
            case 4: maxLength = COLUMN_LIMITS.media; break;
            case 5: maxLength = COLUMN_LIMITS.size; break;
            case 6: maxLength = COLUMN_LIMITS.area; break;
            case 7: maxLength = COLUMN_LIMITS.type; break;
            case 8: maxLength = COLUMN_LIMITS.ratePM; break;
            case 9: maxLength = COLUMN_LIMITS.period; break;
            case 10: maxLength = COLUMN_LIMITS.amount; break;
            default: maxLength = 10;
          }

          // Apply responsive font sizing - reduce font size first, then wrap if necessary
          const responsiveFontSize = getResponsiveFontSize(text, maxLength, 7);
          data.cell.styles.fontSize = responsiveFontSize;

          // Only enable wrapping if text is extremely long (more than 3x the limit)
          if (text.length > maxLength * 3) {
            data.cell.styles.overflow = 'linebreak';
            data.cell.styles.cellWidth = 'wrap';
          } else {
            // For moderately long text, just use smaller font and prevent wrapping
            data.cell.styles.overflow = 'hidden';
          }
        }
      }
    }
  });

  // Add C/F text if there's remaining data
  if (remainingData.length > 0) {
    const firstTableFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('C/F (Carried Forward)', pageWidth - 80, firstTableFinalY + 10);

    // Add new page for remaining data
    doc.addPage();
    addHeaderFooter(2);

    // Add invoice boundary for second page
    const headerHeight = 25;
    const headerMargin = 5;
    const invoiceStartY = headerHeight + headerMargin + 10;
    const footerSpace = 50;
    const availableHeight = pageHeight - invoiceStartY - footerSpace;

    doc.rect(margin, invoiceStartY, pageWidth - (margin * 2), availableHeight);

    // Add B/F text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('B/F (Brought Forward)', margin + 5, invoiceStartY + 15);

    // Continue with remaining data table
    autoTable(doc, {
      startY: invoiceStartY + 25,
      margin: { left: margin + 2, right: margin + 2 },
      head: [['Sr.NO', 'TOWN', 'LOCATION', 'HSN', 'MEDIA', 'SIZE', 'AREA', 'TYPE', 'RATE P.M.', 'PERIOD', 'AMOUNT']],
      body: remainingData,
      theme: 'plain',
      pageBreak: 'auto',
      showHead: 'everyPage',
      tableWidth: availableWidth,
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.25,
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        halign: 'center',
        overflow: 'linebreak',
        cellWidth: 'wrap',
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: availableWidth * 0.05 },    // Sr.NO - 5%
        1: { halign: 'center', cellWidth: availableWidth * 0.07 },    // TOWN - 7%
        2: { halign: 'center', cellWidth: availableWidth * 0.10 },    // LOCATION - 10%
        3: { halign: 'center', cellWidth: availableWidth * 0.06 },    // HSN - 6%
        4: { halign: 'center', cellWidth: availableWidth * 0.07 },    // MEDIA - 7%
        5: { halign: 'center', cellWidth: availableWidth * 0.06 },    // SIZE - 6%
        6: { halign: 'center', cellWidth: availableWidth * 0.05 },    // AREA - 5%
        7: { halign: 'center', cellWidth: availableWidth * 0.05 },    // TYPE - 5%
        8: { halign: 'right', cellWidth: availableWidth * 0.08 },     // RATE P.M. - 8%
        9: { halign: 'center', cellWidth: availableWidth * 0.19 },    // PERIOD - 19%
        10: { halign: 'right', cellWidth: availableWidth * 0.25 }     // AMOUNT - 25%
      },
      didParseCell: function(data) {
        // Force strict boundary respect and text wrapping
        data.cell.styles.overflow = 'linebreak';
        data.cell.styles.cellWidth = 'wrap';

        // Apply responsive font sizing for better fit
        if (data.row.section === 'body') {
          // For regular item rows, apply responsive font sizing
          if (data.cell.text && data.cell.text.length > 0) {
            const text = data.cell.text[0];

            // Get column limits and apply responsive font sizing
            let maxLength;
            switch (data.column.index) {
              case 0: maxLength = COLUMN_LIMITS.sno; break;
              case 1: maxLength = COLUMN_LIMITS.town; break;
              case 2: maxLength = COLUMN_LIMITS.location; break;
              case 3: maxLength = COLUMN_LIMITS.hsn; break;
              case 4: maxLength = COLUMN_LIMITS.media; break;
              case 5: maxLength = COLUMN_LIMITS.size; break;
              case 6: maxLength = COLUMN_LIMITS.area; break;
              case 7: maxLength = COLUMN_LIMITS.type; break;
              case 8: maxLength = COLUMN_LIMITS.ratePM; break;
              case 9: maxLength = COLUMN_LIMITS.period; break;
              case 10: maxLength = COLUMN_LIMITS.amount; break;
              default: maxLength = 10;
            }

            // Apply responsive font sizing - reduce font size first, then wrap if necessary
            const responsiveFontSize = getResponsiveFontSize(text, maxLength, 7);
            data.cell.styles.fontSize = responsiveFontSize;

            // Only enable wrapping if text is extremely long (more than 3x the limit)
            if (text.length > maxLength * 3) {
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.cellWidth = 'wrap';
            } else {
              // For moderately long text, just use smaller font and prevent wrapping
              data.cell.styles.overflow = 'hidden';
            }
          }
        }
      }
    });
  }

  // Handle multi-page with C/F and B/F for any additional pages beyond the second
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  if (totalPages > 2) {
    // Go through pages 3 and beyond (we already handled pages 1 and 2 manually)
    for (let pageNum = 3; pageNum <= totalPages; pageNum++) {
      doc.setPage(pageNum);
      addHeaderFooter(pageNum);

      // Add invoice boundary for continuation pages
      const headerHeight = 25;
      const headerMargin = 5;
      const invoiceStartY = headerHeight + headerMargin + 10;
      const footerSpace = 50;
      const availableHeight = pageHeight - invoiceStartY - footerSpace;

      doc.rect(margin, invoiceStartY, pageWidth - (margin * 2), availableHeight);

      // Add "B/F" text at the top of continuation pages
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('B/F (Brought Forward)', margin + 5, invoiceStartY + 15);

      // Add "C/F" text at the bottom if not the last page
      if (pageNum < totalPages) {
        doc.text('C/F (Carried Forward)', pageWidth - 80, invoiceStartY + availableHeight - 10);
      }
    }

    // Return to the last page for final content
    doc.setPage(totalPages);
  } else {
    // If we only have 1 or 2 pages, make sure we're on the last page
    doc.setPage(totalPages);
  }

  // Get the final Y position after the combined table
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || descY + 100;

  // Amount in Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`Total in words : Rs. ${invoice.totalInWords}.`, margin + 5, finalY + 10);

  // Terms and Conditions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const termsY = finalY + 20;
  doc.text('1. Any complaint about the advertisement must be received within 7 days from the date of bill.', margin + 5, termsY);
  doc.text('2. Cheques/D.D.(crossed) to be drawn in favour of DESHKAR ADVERTISING, RAIPUR', margin + 5, termsY + 4);
  doc.text('3. Interest will be charged @ 24% if the bill is not paid in 10 days.', margin + 5, termsY + 8);
  doc.text('4. No receipt is valid unless given on official form.', margin + 5, termsY + 12);
  doc.text('5. Subject to Raipur Jurisdiction. State: Chhattisgarh, State Code : 22', margin + 5, termsY + 16);
  doc.text('6. Enquiry Pin Code : 492001', margin + 5, termsY + 20);
  doc.text('7. Our PAN NO.: AKJPD0941N & Our GST NO.: 22AKJPD0941N4Z8', margin + 5, termsY + 24);

  // Footer - positioned within the border
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
    doc.text('For, DESHKAR ADVERTISING', pageWidth - 60, termsY + 10);
    doc.text('Authorised Signatory', pageWidth - 60, termsY + 25);

    // Footer Section - Outside invoice boundary at bottom
    const footerHeight = 25;
    const footerMargin = 5;
    const footerY = pageHeight - footerHeight - footerMargin;

    // Load and add footer image
    const footerImg = new Image();
    footerImg.crossOrigin = 'anonymous';
    footerImg.onload = function() {
      // Add footer image to PDF at the very bottom
      doc.addImage(footerImg, 'JPEG', footerMargin, footerY, pageWidth - (footerMargin * 2), footerHeight);

      // Save PDF after footer is loaded
      doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    };

    footerImg.onerror = function() {
      console.warn('Could not load footer image, using fallback design');
      createFallbackFooter();
      doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    };

    // Try to load the footer image
    footerImg.src = '/footer-image.jpg';

    function createFallbackFooter() {
      // Footer design with contact information
      // Draw footer border
      doc.rect(footerMargin, footerY, pageWidth - (footerMargin * 2), footerHeight);

      // Add decorative elements in footer
      doc.setFillColor(255, 140, 66); // Orange color
      const footerSquareSize = 1.5;

      // Left side decorative pattern
      doc.rect(footerMargin + 6, footerY + 5, footerSquareSize, footerSquareSize, 'F');
      doc.rect(footerMargin + 10, footerY + 8, footerSquareSize * 1.2, footerSquareSize * 1.2, 'F');
      doc.rect(footerMargin + 16, footerY + 4, footerSquareSize * 0.8, footerSquareSize * 0.8, 'F');
      doc.rect(footerMargin + 20, footerY + 10, footerSquareSize, footerSquareSize, 'F');
      doc.rect(footerMargin + 8, footerY + 15, footerSquareSize * 1.1, footerSquareSize * 1.1, 'F');
      doc.rect(footerMargin + 14, footerY + 18, footerSquareSize * 0.7, footerSquareSize * 0.7, 'F');

      // Contact Information
      doc.setFillColor(0, 0, 0); // Reset to black
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);

      // Address
      doc.text('R15, SP Tower 1st Floor, Anupam Nagar, Nr. Flyover, Raipur, Chhattisgarh 492007', footerMargin + 28, footerY + 8);

      // Phone and Email
      doc.text('Phone: +91 771 2538818', footerMargin + 28, footerY + 14);
      doc.text('Email: deshkaradvertising@gmail.com', footerMargin + 78, footerY + 14);

      // Website
      doc.text('Website: www.deshkaradvertising.com', footerMargin + 28, footerY + 20);

      // IOAA Membership Box
      const ioaaX = pageWidth - 80;
      const ioaaY = footerY + 3;
      const ioaaWidth = 50;
      const ioaaHeight = 18;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(ioaaX, ioaaY, ioaaWidth, ioaaHeight);

      doc.setFontSize(5);
      doc.text('Proud Member Of', ioaaX + ioaaWidth / 2, ioaaY + 4, { align: 'center' });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('INDIAN OUTDOOR', ioaaX + ioaaWidth / 2, ioaaY + 8, { align: 'center' });
      doc.text('ADVERTISING', ioaaX + ioaaWidth / 2, ioaaY + 12, { align: 'center' });
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text('ASSOCIATION', ioaaX + ioaaWidth / 2, ioaaY + 16, { align: 'center' });

      // Right side decorative pattern
      doc.setFillColor(255, 140, 66); // Orange color
      doc.rect(pageWidth - footerMargin - 13, footerY + 5, footerSquareSize * 1.1, footerSquareSize * 1.1, 'F');
      doc.rect(pageWidth - footerMargin - 18, footerY + 8, footerSquareSize * 1.3, footerSquareSize * 1.3, 'F');
      doc.rect(pageWidth - footerMargin - 24, footerY + 4, footerSquareSize, footerSquareSize, 'F');
      doc.rect(pageWidth - footerMargin - 16, footerY + 15, footerSquareSize * 0.8, footerSquareSize * 0.8, 'F');
      doc.rect(pageWidth - footerMargin - 22, footerY + 18, footerSquareSize * 1.2, footerSquareSize * 1.2, 'F');
      doc.rect(pageWidth - footerMargin - 28, footerY + 10, footerSquareSize * 0.7, footerSquareSize * 0.7, 'F');
    }
  }
}




