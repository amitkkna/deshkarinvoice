import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  if (typeof amount === 'string') {
    if (amount === '' || amount === '0') return '';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;
    amount = numAmount;
  }
  if (amount === 0) return '';

  // Round the amount to nearest whole number
  const roundedAmount = Math.round(amount);

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
}

export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  // thousands array removed as not used in current implementation

  if (num === 0) return 'Zero';

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousandsValue = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;

  let result = '';

  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
  }

  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
  }

  if (thousandsValue > 0) {
    result += convertHundreds(thousandsValue) + 'Thousand ';
  }
  
  if (hundreds > 0) {
    result += convertHundreds(hundreds);
  }

  return result.trim() + ' Only';
}

// GST State Code Mapping
export const GST_STATE_CODES: Record<string, { state: string; code: string }> = {
  '01': { state: 'Jammu and Kashmir', code: '01' },
  '02': { state: 'Himachal Pradesh', code: '02' },
  '03': { state: 'Punjab', code: '03' },
  '04': { state: 'Chandigarh', code: '04' },
  '05': { state: 'Uttarakhand', code: '05' },
  '06': { state: 'Haryana', code: '06' },
  '07': { state: 'Delhi', code: '07' },
  '08': { state: 'Rajasthan', code: '08' },
  '09': { state: 'Uttar Pradesh', code: '09' },
  '10': { state: 'Bihar', code: '10' },
  '11': { state: 'Sikkim', code: '11' },
  '12': { state: 'Arunachal Pradesh', code: '12' },
  '13': { state: 'Nagaland', code: '13' },
  '14': { state: 'Manipur', code: '14' },
  '15': { state: 'Mizoram', code: '15' },
  '16': { state: 'Tripura', code: '16' },
  '17': { state: 'Meghalaya', code: '17' },
  '18': { state: 'Assam', code: '18' },
  '19': { state: 'West Bengal', code: '19' },
  '20': { state: 'Jharkhand', code: '20' },
  '21': { state: 'Odisha', code: '21' },
  '22': { state: 'Chhattisgarh', code: '22' },
  '23': { state: 'Madhya Pradesh', code: '23' },
  '24': { state: 'Gujarat', code: '24' },
  '26': { state: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  '27': { state: 'Maharashtra', code: '27' },
  '29': { state: 'Karnataka', code: '29' },
  '30': { state: 'Goa', code: '30' },
  '31': { state: 'Lakshadweep', code: '31' },
  '32': { state: 'Kerala', code: '32' },
  '33': { state: 'Tamil Nadu', code: '33' },
  '34': { state: 'Puducherry', code: '34' },
  '35': { state: 'Andaman and Nicobar Islands', code: '35' },
  '36': { state: 'Telangana', code: '36' },
  '37': { state: 'Andhra Pradesh', code: '37' },
  '38': { state: 'Ladakh', code: '38' }
};

export function getStateFromGSTIN(gstin: string): { state: string; code: string } | null {
  if (!gstin || gstin.length < 2) return null;

  const stateCode = gstin.substring(0, 2);
  return GST_STATE_CODES[stateCode] || null;
}

export function calculateGST(amount: number, gstRate: number = 18) {
  const roundedAmount = Math.round(amount);
  const gstAmount = Math.round((roundedAmount * gstRate) / 100);
  return {
    cgst: Math.round(gstAmount / 2),
    sgst: Math.round(gstAmount / 2),
    igst: Math.round(gstAmount),
    total: Math.round(roundedAmount + gstAmount)
  };
}
