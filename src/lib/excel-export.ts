import * as XLSX from 'xlsx';
import { Invoice } from '@/types/invoice';

export function generateInvoiceExcel(invoice: Invoice): void {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Company Header Data
  const headerData = [
    ['DESHKAR ADVERTISING'],
    ['Shop No. 123, Advertisement Plaza'],
    ['Mumbai, Maharashtra - 400001'],
    ['Phone: +91 98765 43210 | Email: info@deshkaradvertising.com'],
    ['GSTIN: 27AAAAA0000A1Z5'],
    [''],
    ['TAX INVOICE'],
    [''],
    [`Invoice No: ${invoice.invoiceNumber}`, '', '', `Invoice Date: ${invoice.invoiceDate}`],
    [invoice.dueDate ? `Due Date: ${invoice.dueDate}` : ''],
    [''],
    ['BILL TO:'],
    [invoice.billingParty.name],
    [invoice.billingParty.address],
    [`${invoice.billingParty.city}, ${invoice.billingParty.state} - ${invoice.billingParty.pincode}`],
    [`GSTIN: ${invoice.billingParty.gstin}`],
    [''],
    ['INVOICE DETAILS:'],
    ['S.No.', 'Town', 'Location', 'HSN', 'Media', 'Size', 'Area', 'Type', 'Rate P.M.', 'Period', 'Amount']
  ];
  
  // Add invoice items
  const itemsData = invoice.items.map(item => [
    item.sno,
    item.town,
    item.location,
    item.hsn,
    item.media,
    item.size,
    item.area,
    item.type,
    item.ratePM,
    item.period,
    item.amount
  ]);
  
  // Tax summary data
  const taxData = [
    [''],
    ['', '', '', '', '', '', '', '', 'Subtotal:', '', invoice.subtotal],
  ];
  
  if (invoice.cgst > 0) {
    taxData.push(
      ['', '', '', '', '', '', '', '', 'CGST:', '', invoice.cgst],
      ['', '', '', '', '', '', '', '', 'SGST:', '', invoice.sgst]
    );
  } else {
    taxData.push(['', '', '', '', '', '', '', '', 'IGST:', '', invoice.igst]);
  }
  
  taxData.push(['', '', '', '', '', '', '', '', 'Grand Total:', '', invoice.grandTotal]);
  
  // Amount in words
  const wordsData = [
    [''],
    [`Amount in Words: ${invoice.totalInWords}`],
    ['']
  ];
  
  // Terms and conditions
  const termsData = [
    ['TERMS & CONDITIONS:'],
    ...invoice.termsAndConditions.map((term, index) => [`${index + 1}. ${term}`]),
    [''],
    [''],
    ['For DESHKAR ADVERTISING'],
    ['Authorized Signatory']
  ];
  
  // Combine all data
  const allData = [
    ...headerData,
    ...itemsData,
    ...taxData,
    ...wordsData,
    ...termsData
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allData);
  
  // Set column widths
  const colWidths = [
    { wch: 8 },  // S.No.
    { wch: 15 }, // Town
    { wch: 20 }, // Location
    { wch: 12 }, // HSN
    { wch: 15 }, // Media
    { wch: 15 }, // Size
    { wch: 10 }, // Area
    { wch: 15 }, // Type
    { wch: 12 }, // Rate P.M.
    { wch: 15 }, // Period
    { wch: 15 }  // Amount
  ];
  ws['!cols'] = colWidths;
  
  // Style the header rows
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Apply styles to specific cells (basic styling)
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, sz: row === 0 ? 16 : row === 6 ? 14 : 12 },
          alignment: { horizontal: 'center' }
        };
      }
    }
  }
  
  // Style the table header
  const headerRowIndex = headerData.length - 1;
  for (let col = 0; col <= 10; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "2980B9" } },
        alignment: { horizontal: 'center' }
      };
    }
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
  
  // Save the file
  XLSX.writeFile(wb, `Invoice_${invoice.invoiceNumber}.xlsx`);
}
