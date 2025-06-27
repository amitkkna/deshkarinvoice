'use client';

import React from 'react';
import Image from 'next/image';
import { Invoice } from '@/types/invoice';
import { formatCurrency, getStateFromGSTIN } from '@/lib/utils';

interface InvoicePreviewProps {
  invoice: Invoice;
  type: 'pdf' | 'excel';
}

// Company details removed as not currently used

// Function to determine appropriate font size based on text length
const getResponsiveFontSize = (text: string, maxLength: number): string => {
  if (!text) return 'text-xs';

  const textLength = text.length;

  if (textLength <= maxLength) {
    return 'text-xs'; // 12px - normal size for table
  } else if (textLength <= maxLength * 1.3) {
    return 'text-[11px]'; // 11px - slightly smaller
  } else if (textLength <= maxLength * 1.6) {
    return 'text-[10px]'; // 10px - smaller
  } else if (textLength <= maxLength * 2) {
    return 'text-[9px]'; // 9px - very small
  } else {
    return 'text-[8px]'; // 8px - minimum readable size
  }
};

// Column character limits for responsive font sizing - optimized for full text display
const COLUMN_LIMITS = {
  sno: 2,
  town: 10,
  location: 20,
  hsn: 8,
  media: 10,
  size: 6,
  area: 5,
  type: 4,
  ratePM: 10,
  period: 25,
  amount: 12
};

export default function InvoicePreview({ invoice, type }: InvoicePreviewProps) {
  if (type === 'excel') {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Excel Export Preview</h3>
          <p className="text-blue-700 text-sm">
            The Excel file will contain all invoice data in a structured spreadsheet format with:
          </p>
          <ul className="list-disc list-inside text-blue-700 text-sm mt-2 space-y-1">
            <li>Company header and branding</li>
            <li>Invoice details and billing party information</li>
            <li>Detailed item table with all columns</li>
            <li>Tax calculations (CGST/SGST/IGST)</li>
            <li>Terms and conditions</li>
            <li>Professional formatting and styling</li>
          </ul>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-3 font-semibold">Excel Structure Preview</div>
          <div className="p-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Invoice Number:</strong> {invoice.invoiceNumber}</div>
              <div><strong>Date:</strong> {invoice.invoiceDate}</div>
              <div><strong>Client:</strong> {invoice.billingParty.name}</div>
              <div><strong>Items:</strong> {invoice.items.length}</div>
              <div><strong>Subtotal:</strong> {formatCurrency(invoice.subtotal)}</div>
              <div><strong>Grand Total:</strong> {formatCurrency(invoice.grandTotal)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[1000px]" style={{ fontSize: '12px' }}>
      {/* Header Image - Outside invoice boundary */}
      <div className="w-full mb-4">
        <Image
          src="/header-image.jpg"
          alt="Deshkar Advertising Header"
          width={1000}
          height={128}
          className="w-full h-auto max-h-32 object-contain"
        />
      </div>

      {/* Invoice Container */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        {/* Tax Invoice Title */}
        <div className="text-center p-4 border-b border-black">
          <h2 className="text-lg font-bold">Tax Invoice</h2>
        </div>

      {/* Customer and Invoice Details - Properly Boxed */}
      <div className="border border-black mx-2 my-2">
        <div className="grid grid-cols-2 min-h-[120px]">
          {/* Customer Details Box */}
          <div className="p-3 border-r border-black">
            <p className="mb-2"><strong>To,</strong></p>
            <p className="font-bold text-sm">{invoice.billingParty.name}</p>
            <p className="text-sm">{invoice.billingParty.address}</p>
            <p className="text-sm">{invoice.billingParty.city}</p>
            <p className="text-sm">{invoice.billingParty.state} - {invoice.billingParty.pincode}, India</p>
            <p className="text-sm"><strong>GSTIN :</strong> <span className="font-bold">{invoice.billingParty.gstin}</span></p>
            <p className="text-sm"><strong>State :</strong> {invoice.billingParty.state}, State Code : {getStateFromGSTIN(invoice.billingParty.gstin || '')?.code || '00'}</p>
          </div>

          {/* Invoice Details Box */}
          <div className="p-3">
            <p className="text-sm"><strong>Invoice No :</strong> {invoice.invoiceNumber}</p>
            <p className="text-sm"><strong>Invoice Date :</strong> {invoice.invoiceDate}</p>
            {invoice.poNumber && (
              <p className="text-sm mt-2"><strong>PO NO. :</strong> {invoice.poNumber}</p>
            )}
            {invoice.poDate && (
              <p className="text-sm"><strong>PO Date :</strong> {invoice.poDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="p-4 border-b">
        <div className="border border-black p-3 bg-gray-50">
          <p className="text-sm font-semibold mb-2">Towards the hoarding display charges at following particulars.</p>
          <p className="text-sm">Display : &quot; <span className="font-bold">{invoice.displayName || invoice.billingParty.name}</span> &quot;</p>
          <p className="text-sm">Duration : {invoice.duration || '37 Days'}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="p-4 border-b">
        <div className="overflow-x-auto">
          <table id="main-invoice-table" className="w-full border-collapse border border-black text-sm text-black" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '3%', minWidth: '25px' }}>Sr.NO</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '7%', minWidth: '55px' }}>TOWN</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '18%', minWidth: '140px' }}>LOCATION</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '6%', minWidth: '45px' }}>HSN</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '8%', minWidth: '60px' }}>MEDIA</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '6%', minWidth: '45px' }}>SIZE</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '5%', minWidth: '35px' }}>AREA</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '4%', minWidth: '30px' }}>TYPE</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '9%', minWidth: '70px' }}>RATE P.M.</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '22%', minWidth: '170px' }}>PERIOD</th>
                <th className="border border-black px-1 py-1 text-center font-bold text-[10px] text-black whitespace-nowrap" style={{ width: '12%', minWidth: '90px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {/* Invoice Items */}
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.sno?.toString() || '', COLUMN_LIMITS.sno)} text-black whitespace-nowrap`} style={{ width: '3%', minWidth: '25px' }}>{item.sno}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.town || '', COLUMN_LIMITS.town)} text-black whitespace-nowrap`} style={{ width: '7%', minWidth: '55px' }}>{item.town}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.location || '', COLUMN_LIMITS.location)} text-black whitespace-nowrap`} style={{ width: '18%', minWidth: '140px' }}>{item.location}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.hsn || '', COLUMN_LIMITS.hsn)} text-black whitespace-nowrap`} style={{ width: '6%', minWidth: '45px' }}>{item.hsn}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.media || '', COLUMN_LIMITS.media)} text-black whitespace-nowrap`} style={{ width: '8%', minWidth: '60px' }}>{item.media}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.size || '', COLUMN_LIMITS.size)} text-black whitespace-nowrap`} style={{ width: '6%', minWidth: '45px' }}>{item.size}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.area?.toString() || '', COLUMN_LIMITS.area)} text-black whitespace-nowrap`} style={{ width: '5%', minWidth: '35px' }}>{item.area}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.type || '', COLUMN_LIMITS.type)} text-black whitespace-nowrap`} style={{ width: '4%', minWidth: '30px' }}>{item.type}</td>
                  <td className={`border border-black px-1 py-1 text-right ${getResponsiveFontSize(formatCurrency(item.ratePM), COLUMN_LIMITS.ratePM)} text-black whitespace-nowrap`} style={{ width: '9%', minWidth: '70px' }}>{formatCurrency(item.ratePM)}</td>
                  <td className={`border border-black px-1 py-1 text-center ${getResponsiveFontSize(item.period || '', COLUMN_LIMITS.period)} text-black whitespace-nowrap`} style={{ width: '22%', minWidth: '170px' }}>{item.period}</td>
                  <td className={`border border-black px-1 py-1 text-right font-medium ${getResponsiveFontSize(formatCurrency(item.amount), COLUMN_LIMITS.amount)} text-black whitespace-nowrap`} style={{ width: '12%', minWidth: '90px' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}

              {/* Totals Section - Continuing in the same table */}
              <tr>
                <td className="border-0 p-0" style={{ width: '4%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '15%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-1 py-2 font-bold text-sm text-black bg-gray-100 whitespace-nowrap" style={{ width: '20%' }}>SUB TOTAL</td>
                <td className="border border-black px-1 py-2 text-right font-bold text-sm text-black whitespace-nowrap" style={{ width: '15%' }}>{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td className="border-0 p-0" style={{ width: '4%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '15%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-1 py-2 text-sm text-black whitespace-nowrap" style={{ width: '20%' }}>Add : CGST @ 9%</td>
                <td className="border border-black px-1 py-2 text-right text-sm text-black whitespace-nowrap" style={{ width: '15%' }}>{invoice.cgst > 0 ? formatCurrency(invoice.cgst) : '0'}</td>
              </tr>
              <tr>
                <td className="border-0 p-0" style={{ width: '4%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '15%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-1 py-2 text-sm text-black whitespace-nowrap" style={{ width: '20%' }}>Add : SGST @ 9%</td>
                <td className="border border-black px-1 py-2 text-right text-sm text-black whitespace-nowrap" style={{ width: '15%' }}>{invoice.sgst > 0 ? formatCurrency(invoice.sgst) : '0'}</td>
              </tr>
              <tr>
                <td className="border-0 p-0" style={{ width: '4%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '15%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-1 py-2 text-sm text-black whitespace-nowrap" style={{ width: '20%' }}>Add : IGST @ 18%</td>
                <td className="border border-black px-2 py-2 text-right text-sm text-black whitespace-nowrap" style={{ width: '25%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.igst > 0 ? formatCurrency(invoice.igst) : '0'}</td>
              </tr>
              <tr>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '7%' }}></td>
                <td className="border-0 p-0" style={{ width: '10%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '7%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-2 py-2 text-sm text-black whitespace-nowrap" style={{ width: '19%', overflow: 'hidden', textOverflow: 'ellipsis' }}>Less : PO</td>
                <td className="border border-black px-2 py-2 text-right text-sm text-black whitespace-nowrap" style={{ width: '25%', overflow: 'hidden', textOverflow: 'ellipsis' }}>0</td>
              </tr>
              <tr>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '7%' }}></td>
                <td className="border-0 p-0" style={{ width: '10%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '7%' }}></td>
                <td className="border-0 p-0" style={{ width: '6%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '5%' }}></td>
                <td className="border-0 p-0" style={{ width: '8%' }}></td>
                <td className="border border-black px-2 py-2 font-bold text-sm text-black bg-gray-100 whitespace-nowrap" style={{ width: '19%', overflow: 'hidden', textOverflow: 'ellipsis' }}>GRAND TOTAL</td>
                <td className="border border-black px-2 py-2 text-right font-bold text-sm text-black whitespace-nowrap" style={{ width: '25%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(invoice.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="p-2 border-b">
        <p className="text-sm"><strong>Total in words : Rs. {invoice.totalInWords}.</strong></p>
      </div>

      {/* Terms and Conditions */}
      <div className="p-4 border-b">
        <div className="space-y-1 text-xs">
          <p>1. Any complaint about the advertisement must be received within 7 days from the date of bill.</p>
          <p>2. Cheques/D.D.(crossed) to be drawn in favour of DESHKAR ADVERTISING, RAIPUR</p>
          <p>3. Interest will be charged @ 24% if the bill is not paid in 10 days.</p>
          <p>4. No receipt is valid unless given on official form.</p>
          <p>5. Subject to Raipur Jurisdiction. State: Chhattisgarh, State Code : 22</p>
          <p>6. Enquiry Pin Code : 492001</p>
          <p>7. Our PAN NO.: AKJPD0941N & Our GST NO.: 22AKJPD0941N4Z8</p>
        </div>
      </div>

        {/* Footer */}
        <div className="p-4 text-right">
          <p className="text-sm">For, DESHKAR ADVERTISING</p>
          <div className="mt-8">
            <p className="text-sm">Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer Image - Outside invoice boundary */}
      <div className="w-full mt-4">
        <Image
          src="/footer-image.jpg"
          alt="Deshkar Advertising Footer"
          width={1000}
          height={80}
          className="w-full h-auto max-h-20 object-contain"
        />
      </div>
    </div>
  );
}