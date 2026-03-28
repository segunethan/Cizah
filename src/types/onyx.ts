export type RecordType = 'inflow' | 'outflow' | 'relief';

export interface FinancialRecord {
  id: string;
  type: RecordType;
  category: string;
  amount: number;
  description?: string;
  date: Date;
  evidenceUrl?: string;
}

export interface UserProfile {
  // Basic info (from Phase 1)
  name: string;
  email?: string;
  phone?: string;
  
  // Personal info (Phase 2)
  surname?: string;
  firstName?: string;
  otherName?: string;
  preferredName?: string;
  prefix?: 'Mr' | 'Miss' | 'Ms' | 'Mrs' | 'Dr' | 'Pastor' | 'Rev';
  dateOfBirth?: Date;
  gender?: 'Male' | 'Female';
  
  // Address info
  houseAddress?: string;
  officeAddress?: string;
  state?: string;
  lga?: string;
  lcda?: string;
  
  // Identity & Work
  occupation?: string;
  identityType?: 'BVN' | 'NIN';
  identityNumber?: string;
  lassraNo?: string;
  passportPhotoUrl?: string;
  taxRecordNumber?: string;
  
  // Financial & Asset info
  numBanks?: number;
  banksList?: string[];
  numCars?: number;
  numHouses?: number;
  
  // Apartment/Housing info
  apartmentStyle?: 'flat' | 'bungalow' | 'duplex' | 'studio' | 'mini_flat';
  apartmentType?: 'tenant' | 'owner' | 'mission' | 'gift' | 'family';
  rentAmount?: number;
  rentAgreementUrl?: string;
  rentReceiptUrl?: string;
  hasMortgage?: boolean;
  
  // Onboarding status
  onboardingCompleted?: boolean;
  bankAccountsConnected?: boolean;
}

export interface ConnectedBankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountNumber?: string;
  accountType?: string;
  isSelected: boolean;
  connectedAt: Date;
}

export interface TaxCalculation {
  id: string;
  userId: string;
  periodType: 'monthly' | 'annually';
  periodMonth?: number;
  periodYear: number;
  totalInflow: number;
  totalOutflow: number;
  netInflow: number;
  voluntaryGift: number;
  otherExpenses: number;
  assessableIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  taxPayable: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'filed' | 'revisit';
  rejectionReason?: string;
  rejectionEvidenceUrl?: string;
  userRejectionReason?: string;
  paymentReference?: string;
  paymentDate?: Date;
  filedAt?: Date;
  filedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaxPeriodPreference = 'monthly' | 'annually';

export interface MonthlySummary {
  month: string;
  year: number;
  totalInflow: number;
  totalOutflow: number;
  totalDeductions: number;
  actualEarnings: number;
}

export const INFLOW_CATEGORIES = [
  'Salary',
  'Voluntary Gifts',
  'Honourarium',
  'Prophet Offerings',
  'Others',
] as const;

// Individual outflow categories (no grouping, Others at end)
export const OUTFLOW_CATEGORIES = [
  'Electricity',
  'Data',
  'Material',
  'Fuel',
  'Feeding',
  'Travels',
  'Tithe',
  'Offerings',
  'Gifts/Givings',
  'Rent',
  'Maintenance (Housing)',
  'Repairs/Maintenance (Vehicle)',
  'School Fees',
  'Others',
] as const;

// All possible relief categories - user selects which apply during onboarding
export const RELIEF_CATEGORIES = [
  'NHF',
  'Pension',
  'NHIS',
  'Mortgage Interest',
  'Life Insurance/Annuity Premium',
] as const;

export const APARTMENT_STYLES = [
  { value: 'flat', label: 'Flat' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'studio', label: 'Studio' },
  { value: 'mini_flat', label: 'Mini Flat' },
] as const;

export const APARTMENT_OWN_TYPES = [
  { value: 'tenant', label: 'Tenant' },
  { value: 'owner', label: 'Owner' },
  { value: 'mission', label: 'Mission' },
  { value: 'gift', label: 'Gift' },
  { value: 'family', label: 'Family' },
] as const;

export const getCategoriesForType = (type: RecordType, selectedReliefs?: string[]): readonly string[] => {
  switch (type) {
    case 'inflow':
      return INFLOW_CATEGORIES;
    case 'outflow':
      return OUTFLOW_CATEGORIES;
    case 'relief':
      // If selectedReliefs provided, filter to only those; otherwise show all
      if (selectedReliefs && selectedReliefs.length > 0) {
        return RELIEF_CATEGORIES.filter(cat => selectedReliefs.includes(cat));
      }
      return RELIEF_CATEGORIES;
  }
};

// Nigerian States
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;

// Nigerian Banks
export const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)',
  'Heritage Bank', 'Keystone Bank', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Titan Trust Bank',
  'Union Bank of Nigeria', 'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank',
  'Zenith Bank', 'Jaiz Bank', 'TAJBank', 'Lotus Bank', 'Optimus Bank', 'Parallex Bank',
  'Kuda Bank', 'OPay', 'PalmPay', 'Moniepoint'
] as const;

export const PREFIX_OPTIONS = ['Mr', 'Miss', 'Ms', 'Mrs', 'Dr', 'Pastor', 'Rev'] as const;

// Tax exemption amounts (subtracted from chargeable income before applying bands)
export const TAX_EXEMPTION = {
  annual: 800000,
  monthly: 66666.67,
} as const;

// Nigerian PAYE Tax Bands (Annual - cumulative thresholds after exemption)
export const TAX_BANDS_ANNUAL = [
  { min: 0, max: 2200000, rate: 0.15 },
  { min: 2200000, max: 9000000, rate: 0.18 },
  { min: 9000000, max: 13000000, rate: 0.21 },
  { min: 13000000, max: 25000000, rate: 0.23 },
  { min: 25000000, max: 50000000, rate: 0.25 },
  { min: 50000000, max: Infinity, rate: 0.25 },
] as const;

// Nigerian PAYE Tax Bands (Monthly - cumulative thresholds after exemption)
export const TAX_BANDS_MONTHLY = [
  { min: 0, max: 183333.33, rate: 0.15 },
  { min: 183333.33, max: 750000, rate: 0.18 },
  { min: 750000, max: 1083333.33, rate: 0.21 },
  { min: 1083333.33, max: 2083333.33, rate: 0.23 },
  { min: 2083333.33, max: 4166666.67, rate: 0.25 },
  { min: 4166666.67, max: Infinity, rate: 0.25 },
] as const;

// Legacy export for backward compatibility
export const TAX_BANDS = TAX_BANDS_ANNUAL;

// Calculate PAYE tax based on chargeable income
export const calculatePAYETax = (
  chargeableIncome: number,
  periodType: 'monthly' | 'annually' = 'annually'
): number => {
  if (chargeableIncome <= 0) return 0;
  
  // Get exemption and bands based on period type
  const exemption = periodType === 'annually' ? TAX_EXEMPTION.annual : TAX_EXEMPTION.monthly;
  const bands = periodType === 'annually' ? TAX_BANDS_ANNUAL : TAX_BANDS_MONTHLY;
  
  // Subtract exemption from chargeable income
  const taxableIncome = Math.max(0, chargeableIncome - exemption);
  if (taxableIncome <= 0) return 0;
  
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const band of bands) {
    if (remainingIncome <= 0) break;
    
    const bandWidth = band.max - band.min;
    const taxableInBand = Math.min(remainingIncome, bandWidth);
    tax += taxableInBand * band.rate;
    remainingIncome -= taxableInBand;
  }
  
  return Math.round(tax * 100) / 100;
};
