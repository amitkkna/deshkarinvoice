'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Download, FileSpreadsheet, Eye, X, Copy } from 'lucide-react';
import { InvoiceFormData, InvoiceItem, BillingParty, Invoice } from '@/types/invoice';
import { formatCurrency, numberToWords, calculateGST, getStateFromGSTIN, GST_STATE_CODES } from '@/lib/utils';
import { generateInvoicePDF, generateCompactInvoicePDF, generateOptimalInvoicePDF, canFitOnOnePage } from '@/lib/pdf-export';
import { generateInvoiceExcel } from '@/lib/excel-export';
import InvoicePreview from './InvoicePreview';

const INITIAL_BILLING_PARTY: BillingParty = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  phone: '',
  email: ''
};

const INITIAL_ITEM: Omit<InvoiceItem, 'id' | 'sno'> = {
  town: '',
  location: '',
  hsn: '998366', // Default HSN for advertising services
  media: '',
  size: '',
  area: '',
  type: '',
  ratePM: '',
  period: '',
  amount: 0
};

// Utility functions for calculations
const calculatePeriodFromDates = (startDate: string, duration: string): string => {
  if (!startDate || !duration) return '';

  const durationDays = parseInt(duration);
  if (isNaN(durationDays)) return '';

  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + durationDays - 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return `${formatDate(start)} to ${formatDate(end)}`;
};

const calculateAmountFromDuration = (ratePM: number | string, duration: string): number => {
  if (!ratePM || !duration) return 0;

  const rate = typeof ratePM === 'string' ? parseFloat(ratePM) : ratePM;
  if (isNaN(rate)) return 0;

  const durationDays = parseInt(duration);
  if (isNaN(durationDays)) return 0;

  // Calculate months and days
  const months = Math.floor(durationDays / 30);
  const remainingDays = durationDays % 30;

  // Calculate amount: full months + proportional days
  const monthlyAmount = months * rate;
  const dailyRate = rate / 30;
  const dailyAmount = remainingDays * dailyRate;

  return Math.round(monthlyAmount + dailyAmount);
};

const formatDurationDisplay = (duration: string): string => {
  const durationDays = parseInt(duration);
  if (isNaN(durationDays)) return duration;

  const months = Math.floor(durationDays / 30);
  const remainingDays = durationDays % 30;

  if (months === 0) {
    return `${durationDays} days`;
  } else if (remainingDays === 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `${months} month${months > 1 ? 's' : ''} ${remainingDays} days`;
  }
};

const DEFAULT_TERMS = [
  'Any complaint about the advertisement must be received within 7 days from the date of bill.',
  'Cheques/D.D.(crossed) to be drawn in favour of DESHKAR ADVERTISING, RAIPUR',
  'Interest will be charged @ 24% if the bill is not paid in 10 days.',
  'No receipt is valid unless given on official form.',
  'Subject to Raipur Jurisdiction. State: Chhattisgarh, State Code : 22',
  'Enquiry Pin Code : 492001',
  'Our PAN NO.: AKJPD0941N & Our GST NO.: 22AKJPD0941N4Z8'
];

export default function InvoiceForm() {
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: `INV${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    creditDays: 0,
    poNumber: '',
    poDate: '',
    displayName: '',
    duration: '37',
    startDate: '',
    billingParty: INITIAL_BILLING_PARTY,
    items: [],
    gstRate: 18,
    isInterstate: false,
    termsAndConditions: DEFAULT_TERMS.join('\n')
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'pdf' | 'excel' | null>(null);

  // Function to calculate due date based on invoice date and credit days
  const calculateDueDate = useCallback((invoiceDate: string, creditDays: number): string => {
    if (!invoiceDate || creditDays <= 0) return '';

    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + creditDays);
    return date.toISOString().split('T')[0];
  }, []);

  // Update due date when invoice date or credit days change
  const updateInvoiceDate = useCallback((date: string) => {
    setFormData(prev => ({
      ...prev,
      invoiceDate: date,
      dueDate: calculateDueDate(date, prev.creditDays)
    }));
  }, [calculateDueDate]);

  const updateCreditDays = useCallback((days: number) => {
    setFormData(prev => ({
      ...prev,
      creditDays: days,
      dueDate: calculateDueDate(prev.invoiceDate, days)
    }));
  }, [calculateDueDate]);

  const addItem = useCallback(() => {
    const newItem: InvoiceItem = {
      ...INITIAL_ITEM,
      id: Date.now().toString(),
      sno: formData.items.length + 1
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  }, [formData.items.length]);

  const removeItem = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id).map((item, index) => ({
        ...item,
        sno: index + 1
      }))
    }));
  }, []);

  const copyItem = useCallback((id: string) => {
    setFormData(prev => {
      const itemToCopy = prev.items.find(item => item.id === id);
      if (!itemToCopy) return prev;

      const copiedItem: InvoiceItem = {
        ...itemToCopy,
        id: Date.now().toString(),
        sno: prev.items.length + 1
      };

      return {
        ...prev,
        items: [...prev.items, copiedItem]
      };
    });
  }, []);

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Auto-calculate amount when rate changes
          if (field === 'ratePM' && prev.duration) {
            const ratePM = value;
            if (ratePM && prev.duration) {
              updatedItem.amount = calculateAmountFromDuration(ratePM, prev.duration);
            }
          }

          // Auto-calculate period when global start date and duration are available
          if (prev.startDate && prev.duration) {
            updatedItem.period = calculatePeriodFromDates(prev.startDate, prev.duration);
          }

          return updatedItem;
        }
        return item;
      })
    }));
  }, []);

  // Update all items when global start date or duration changes
  const updateGlobalDateDuration = useCallback((field: 'startDate' | 'duration', value: string) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, [field]: value };

      // Recalculate period and amounts for all items
      const updatedItems = prev.items.map(item => {
        const updatedItem = { ...item };

        // Update period if both start date and duration are available
        if (updatedFormData.startDate && updatedFormData.duration) {
          updatedItem.period = calculatePeriodFromDates(updatedFormData.startDate, updatedFormData.duration);
        }

        // Recalculate amount if rate and duration are available
        if (item.ratePM && updatedFormData.duration) {
          updatedItem.amount = calculateAmountFromDuration(item.ratePM, updatedFormData.duration);
        }

        return updatedItem;
      });

      return {
        ...updatedFormData,
        items: updatedItems
      };
    });
  }, []);

  const updateBillingParty = useCallback((field: keyof BillingParty, value: string) => {
    setFormData(prev => {
      const updatedBillingParty = { ...prev.billingParty, [field]: value };

      // Auto-detect state from GSTIN
      if (field === 'gstin' && value) {
        const stateInfo = getStateFromGSTIN(value);
        if (stateInfo) {
          updatedBillingParty.state = stateInfo.state;
        }
      }

      return {
        ...prev,
        billingParty: updatedBillingParty
      };
    });
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = Math.round(formData.items.reduce((sum, item) => sum + item.amount, 0));
    const gst = calculateGST(subtotal, formData.gstRate);

    return {
      subtotal,
      cgst: formData.isInterstate ? 0 : gst.cgst,
      sgst: formData.isInterstate ? 0 : gst.sgst,
      igst: formData.isInterstate ? gst.igst : 0,
      grandTotal: gst.total
    };
  }, [formData.items, formData.gstRate, formData.isInterstate]);

  const totals = calculateTotals();

  const generateInvoice = useCallback((): Invoice => {
    return {
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      poNumber: formData.poNumber || undefined,
      poDate: formData.poDate || undefined,
      displayName: formData.displayName || undefined,
      duration: formData.duration || undefined,
      billingParty: formData.billingParty,
      items: formData.items,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      grandTotal: totals.grandTotal,
      totalInWords: numberToWords(Math.round(totals.grandTotal)),
      termsAndConditions: formData.termsAndConditions.split('\n').filter(term => term.trim())
    };
  }, [formData, totals]);

  const handleDownloadPDF = useCallback(() => {
    const invoice = generateInvoice();
    generateInvoicePDF(invoice);
  }, [generateInvoice]);

  const handleDownloadCompactPDF = useCallback(() => {
    const invoice = generateInvoice();
    generateCompactInvoicePDF(invoice);
  }, [generateInvoice]);

  const handleDownloadOptimalPDF = useCallback(() => {
    const invoice = generateInvoice();
    generateOptimalInvoicePDF(invoice);
  }, [generateInvoice]);

  const handleDownloadExcel = useCallback(() => {
    const invoice = generateInvoice();
    generateInvoiceExcel(invoice);
  }, [generateInvoice]);

  const handlePreview = useCallback((type: 'pdf' | 'excel') => {
    setPreviewType(type);
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewType(null);
  }, []);

  const handleConfirmDownload = useCallback(() => {
    if (previewType === 'pdf') {
      handleDownloadPDF();
    } else if (previewType === 'excel') {
      handleDownloadExcel();
    }
    handleClosePreview();
  }, [previewType, handleDownloadPDF, handleDownloadExcel, handleClosePreview]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Enhanced Elegant Header */}
        <div className="text-center mb-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100/50 p-8 mb-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mr-6 shadow-lg transform hover:rotate-6 transition-transform duration-300">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                  DESHKAR ADVERTISING
                </h1>
                <p className="text-gray-500 text-base font-medium tracking-wider mt-2">PROFESSIONAL INVOICE MANAGEMENT SYSTEM</p>
              </div>
            </div>
            <div className="w-32 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full mx-auto animate-pulse"></div>

            {/* Status Indicators */}
            <div className="flex justify-center space-x-6 mt-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 font-medium">System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                <span className="text-sm text-gray-600 font-medium">GST Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-700"></div>
                <span className="text-sm text-gray-600 font-medium">Multi-format Export</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Invoice Details */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100/50 p-8 mb-8 transform hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Invoice Details</h2>
              <p className="text-gray-500 text-sm mt-1">Configure your invoice information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group">
              <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Invoice Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 focus:bg-white focus:shadow-lg transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-md"
                  placeholder="INV-001"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="group">
              <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Invoice Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => updateInvoiceDate(e.target.value)}
                  className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white focus:shadow-lg transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-md"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="group">
              <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Credit Days
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.creditDays}
                  onChange={(e) => updateCreditDays(Number(e.target.value))}
                  className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white focus:shadow-lg transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-md"
                  placeholder="0"
                  min="0"
                  max="365"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            <div className="group">
              <label className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Due Date <span className="text-xs text-gray-500 ml-1">(Auto-calculated)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  readOnly
                  className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:bg-white focus:shadow-lg transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-md cursor-not-allowed"
                  placeholder="Auto-calculated from credit days"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              {formData.creditDays > 0 && formData.dueDate && (
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                  Due in {formData.creditDays} days from invoice date
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Elegant PO Details & Display Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">PO Details & Display Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PO Number
                </label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PO Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PO Date
                </label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MSP STEEL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 37 Days"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Billing Party Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Billing Party Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Company Name *</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.billingParty.name}
                  onChange={(e) => updateBillingParty('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3">GSTIN *</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.billingParty.gstin}
                  onChange={(e) => updateBillingParty('gstin', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                  placeholder="27AAAAA0000A1Z5"
                  required
                />
                {formData.billingParty.gstin && getStateFromGSTIN(formData.billingParty.gstin) && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ State auto-detected: {getStateFromGSTIN(formData.billingParty.gstin)?.state} (Code: {getStateFromGSTIN(formData.billingParty.gstin)?.code})
                  </p>
                )}
              </div>
            </div> {/* <-- THIS CLOSING TAG WAS MISSING */}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                value={formData.billingParty.address}
                onChange={(e) => updateBillingParty('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.billingParty.city}
                onChange={(e) => updateBillingParty('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State * <span className="text-xs text-gray-500">(Auto-filled from GSTIN)</span>
              </label>
              <select
                value={formData.billingParty.state}
                onChange={(e) => {
                  updateBillingParty('state', e.target.value);
                  // Auto-detect interstate based on state
                  setFormData(prev => ({
                    ...prev,
                    isInterstate: e.target.value !== 'Chhattisgarh' // Company is in Chhattisgarh
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select State</option>
                {Object.values(GST_STATE_CODES).map(({ state }) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                value={formData.billingParty.pincode}
                onChange={(e) => updateBillingParty('pincode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.billingParty.phone}
                onChange={(e) => updateBillingParty('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Elegant GST Settings */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Rate (%)
              </label>
              <input
                type="number"
                value={formData.gstRate}
                onChange={(e) => setFormData(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="28"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="interstate"
                checked={formData.isInterstate}
                onChange={(e) => setFormData(prev => ({ ...prev, isInterstate: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="interstate" className="text-sm font-medium text-gray-700">
                Interstate Transaction (IGST)
              </label>
            </div>
          </div>
        </div>

        {/* Start Date and Duration */}
        <div className="mb-8 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Period Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateGlobalDateDuration('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => updateGlobalDateDuration('duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                placeholder="e.g., 37"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Display
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                {formData.startDate && formData.duration
                  ? calculatePeriodFromDates(formData.startDate, formData.duration)
                  : 'Set start date and duration'
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formData.duration ? formatDurationDisplay(formData.duration) : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Invoice Items</h2>
              <p className="text-gray-500 text-sm mt-1">Add advertising services and hoarding details</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={addItem}
                className="group relative flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 mr-2 transform group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-semibold">Add Item</span>
              </button>
            </div>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 border-2 border-dashed border-gray-300">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileSpreadsheet className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Items Added Yet</h3>
                <p className="text-gray-500 mb-6">Start building your invoice by adding advertising services and hoarding details</p>
                <button
                  onClick={addItem}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Item
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">S.No.</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Town</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Location</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">HSN</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Media</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Size</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Area</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Type</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Rate P.M.</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Period</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Amount</th>
                    <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-2 py-2 text-center text-sm">{item.sno}</td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.town}
                          onChange={(e) => updateItem(item.id, 'town', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Town"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.location}
                          onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Location"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="HSN"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.media}
                          onChange={(e) => updateItem(item.id, 'media', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Media"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.size}
                          onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Size"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.area}
                          onChange={(e) => updateItem(item.id, 'area', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Area"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.type}
                          onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Type"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.ratePM}
                          onChange={(e) => updateItem(item.id, 'ratePM', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Rate"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.period}
                          readOnly
                          className="w-full px-2 py-1 text-sm border-0 bg-gray-50 text-gray-600"
                          placeholder="Auto-calculated from start date + duration"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateItem(item.id, 'amount', Math.round(Number(e.target.value)))}
                          className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          placeholder="Amount"
                          min="0"
                          step="1"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => copyItem(item.id)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Copy Item"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoice Summary */}
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invoice Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>

                {formData.isInterstate ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST ({formData.gstRate}%):</span>
                    <span className="font-medium">{formatCurrency(totals.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST ({formData.gstRate / 2}%):</span>
                      <span className="font-medium">{formatCurrency(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST ({formData.gstRate / 2}%):</span>
                      <span className="font-medium">{formatCurrency(totals.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="text-blue-600">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white p-4 rounded border">
                <h3 className="font-medium text-gray-800 mb-2">Amount in Words:</h3>
                <p className="text-sm text-gray-600 italic">
                  {totals.grandTotal > 0 ? numberToWords(Math.round(totals.grandTotal)) : 'Zero Only'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Terms & Conditions</h2>
          <textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            placeholder="Enter terms and conditions (one per line)"
          />
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100/50 p-8 mb-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Export & Preview</h3>
            <p className="text-gray-500">Generate professional invoices in multiple formats</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <button
              onClick={() => handlePreview('pdf')}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Eye className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Preview PDF</span>
            </button>

            <button
              onClick={handleDownloadOptimalPDF}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
              title="Auto-optimized layout for best fit"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Download className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Smart PDF</span>
            </button>

            <button
              onClick={handleDownloadCompactPDF}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
              title="Compact layout - fits more content on one page"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Download className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Compact PDF</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
              title="Standard PDF layout"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Download className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Standard PDF</span>
            </button>

            <button
              onClick={() => handlePreview('excel')}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl hover:from-teal-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-400 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Eye className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Preview Excel</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={formData.items.length === 0 || !formData.billingParty.name}
              className="group relative flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <FileSpreadsheet className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-sm">Download Excel</span>
            </button>
          </div>

          {/* Status indicator with layout optimization info */}
          <div className="mt-6 text-center space-y-2">
            {formData.items.length === 0 || !formData.billingParty.name ? (
              <div className="flex items-center justify-center text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">Please add items and billing party details to enable export</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium">Ready to export • {formData.items.length} items • {formatCurrency(totals.grandTotal)} total</span>
                </div>

                {/* Layout optimization indicator */}
                <div className="flex items-center justify-center space-x-4 text-xs">
                  {(() => {
                    const invoice = generateInvoice();
                    const canFitOne = canFitOnOnePage(invoice);
                    return (
                      <>
                        <div className={`flex items-center ${canFitOne ? 'text-green-600' : 'text-blue-600'}`}>
                          <div className={`w-1.5 h-1.5 ${canFitOne ? 'bg-green-500' : 'bg-blue-500'} rounded-full mr-1`}></div>
                          <span>{canFitOne ? 'Can fit on one page' : 'Multi-page layout'}</span>
                        </div>

                        <div className="flex items-center text-purple-600">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></div>
                          <span>Smart PDF recommended</span>
                        </div>

                        {formData.items.length <= 10 && (
                          <div className="flex items-center text-orange-600">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1"></div>
                            <span>Compact mode available</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Elegant Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-600 font-medium">© 2024 Deshkar Advertising</p>
            </div>
            <p className="text-gray-500 text-sm">Professional Invoice Management System</p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto mt-3"></div>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {previewType === 'pdf' ? 'PDF Preview' : 'Excel Preview'}
                </h2>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[75vh] overflow-x-auto">
                <InvoicePreview invoice={generateInvoice()} type={previewType!} />
              </div>

              <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDownload}
                  className={`px-6 py-2 text-white rounded-md transition-colors ${
                    previewType === 'pdf'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  Download {previewType?.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Quick Actions */}
        <div className="fixed bottom-8 right-8 z-50">
          <div className="flex flex-col space-y-4">
            {/* Quick Add Item Button */}
            <button
              onClick={addItem}
              className="group w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
              title="Quick Add Item"
            >
              <Plus className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Quick Export Button */}
            {formData.items.length > 0 && formData.billingParty.name && (
              <button
                onClick={handleDownloadPDF}
                className="group w-14 h-14 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center animate-bounce"
                title="Quick Download PDF"
              >
                <Download className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="fixed top-4 right-4 z-40">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.billingParty.name ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`}>
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span className="text-xs text-gray-600 mt-1">Customer</span>
              </div>
              <div className={`w-8 h-0.5 ${formData.billingParty.name ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`}></div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.items.length > 0 ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`}>
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span className="text-xs text-gray-600 mt-1">Items</span>
              </div>
              <div className={`w-8 h-0.5 ${formData.items.length > 0 && formData.billingParty.name ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`}></div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.items.length > 0 && formData.billingParty.name ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`}>
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <span className="text-xs text-gray-600 mt-1">Export</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}