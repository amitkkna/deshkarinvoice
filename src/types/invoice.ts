export interface InvoiceItem {
  id: string;
  sno: number;
  town: string;
  location: string;
  hsn: string;
  media: string;
  size: string;
  area: number | string;
  type: string;
  ratePM: number | string;
  period: string;
  amount: number;
}

export interface BillingParty {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  phone?: string;
  email?: string;
}

export interface CompanyDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  phone: string;
  email: string;
}

export interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  poNumber?: string;
  poDate?: string;
  displayName?: string;
  duration?: string;
  billingParty: BillingParty;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  totalInWords: string;
  termsAndConditions: string[];
}

export interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  poDate: string;
  displayName: string;
  duration: string;
  startDate: string;
  billingParty: BillingParty;
  items: InvoiceItem[];
  gstRate: number;
  isInterstate: boolean;
  termsAndConditions: string;
}
