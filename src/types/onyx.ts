export type RecordType = 'inflow' | 'outflow' | 'relief';

export type TaxpayerProfile = 'clergy' | 'salary' | 'salary_hustle' | 'entrepreneur';

export const TAXPAYER_PROFILES = [
  {
    value: 'clergy' as const,
    label: 'Religious Minister / Clergy',
    description: 'Pastors, priests, reverends and other clergy members',
  },
  {
    value: 'salary' as const,
    label: 'Strictly Salary Earner',
    description: 'Employees with only employment income and no side business',
  },
  {
    value: 'salary_hustle' as const,
    label: 'Salary Earner + Side Hustle',
    description: 'Employees who also run a side business or freelance',
  },
  {
    value: 'entrepreneur' as const,
    label: 'Entrepreneur / Self-Employed',
    description: 'Business owners and fully self-employed individuals',
  },
] as const;

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
  name: string;
  email?: string;
  phone?: string;
  surname?: string;
  firstName?: string;
  otherName?: string;
  preferredName?: string;
  prefix?: 'Mr' | 'Miss' | 'Ms' | 'Mrs' | 'Dr' | 'Pastor' | 'Rev';
  dateOfBirth?: Date;
  gender?: 'Male' | 'Female';
  houseAddress?: string;
  officeAddress?: string;
  state?: string;
  lga?: string;
  lcda?: string;
  occupation?: string;
  identityType?: 'BVN' | 'NIN';
  identityNumber?: string;
  lassraNo?: string;
  passportPhotoUrl?: string;
  taxRecordNumber?: string;
  numBanks?: number;
  banksList?: string[];
  numCars?: number;
  numHouses?: number;
  apartmentStyle?: 'flat' | 'bungalow' | 'duplex' | 'studio' | 'mini_flat';
  apartmentType?: 'tenant' | 'owner' | 'mission' | 'gift' | 'family';
  rentAmount?: number;
  rentAgreementUrl?: string;
  rentReceiptUrl?: string;
  hasMortgage?: boolean;
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
  netIncome: number;
  disallowableExpenses: number;
  exemptIncome: number;
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
  receiptPath?: string;
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

// ── Inflow categories by taxpayer profile ──────────────────────────────────

export const CLERGY_INFLOW_CATEGORIES = [
  'Salary',
  'Voluntary Gift',
  'Honorarium',
  'Prophet Offerings',
  'Tithes Received',
  'Others',
] as const;

export const SALARY_INFLOW_CATEGORIES = [
  'Salary',
  'Voluntary Gift',
] as const;

export const SALARY_HUSTLE_INFLOW_CATEGORIES = [
  'Salary',
  'Voluntary Gift',
  'Other Business Income',
] as const;

export const ENTREPRENEUR_INFLOW_CATEGORIES = [
  'Sales Income',
  'Investment Income',
  'Service Income',
  'Other Income',
  'Gifts',
] as const;

// ── Outflow categories by taxpayer profile ─────────────────────────────────

export const CLERGY_OUTFLOW_CATEGORIES = [
  'Electricity',
  'Data',
  'Materials',
  'Tithe',
  'Offerings',
  'Gifts/Givings',
  'Fuel',
  'Feeding',
  'Repairs & Maintenance',
  'Travel',
  'School Fees',
  'Others',
] as const;

// Salary earners: all personal expenses — ALL are disallowable
export const SALARY_OUTFLOW_CATEGORIES = [
  'Electricity',
  'Data',
  'Gifts/Givings',
  'Fuel',
  'Feeding',
  'Others',
] as const;

// Salary + side hustle: same personal expenses + Cost of Sale for the business side
export const SALARY_HUSTLE_OUTFLOW_CATEGORIES = [
  'Cost of Sale',
  'Electricity',
  'Data',
  'Gifts/Givings',
  'Fuel',
  'Feeding',
  'Others',
] as const;

// Entrepreneurs: all are allowable business expenses (disallowable add-back = 0)
export const ENTREPRENEUR_OUTFLOW_CATEGORIES = [
  'Cost of Sale',
  'Electricity',
  'Data',
  'Gifts/Givings',
  'Fuel',
  'Feeding',
  'Others',
] as const;

// Legacy exports kept for backward compatibility (defaults to clergy)
export const INFLOW_CATEGORIES = CLERGY_INFLOW_CATEGORIES;
export const OUTFLOW_CATEGORIES = CLERGY_OUTFLOW_CATEGORIES;

// Legacy aliases for old profile names (in case any code still references them)
export const SALARY_ONLY_INFLOW_CATEGORIES = SALARY_INFLOW_CATEGORIES;
export const SALARY_ONLY_OUTFLOW_CATEGORIES = SALARY_OUTFLOW_CATEGORIES;
export const SALARY_SIDE_HUSTLE_INFLOW_CATEGORIES = SALARY_HUSTLE_INFLOW_CATEGORIES;
export const SALARY_SIDE_HUSTLE_OUTFLOW_CATEGORIES = SALARY_HUSTLE_OUTFLOW_CATEGORIES;

// All possible relief categories — user selects which apply during onboarding
export const RELIEF_CATEGORIES = [
  'NHF',
  'Pension',
  'NHIS',
  'Mortgage Interest',
  'Life Insurance/Annuity Premium',
  'Rent',
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

export const getCategoriesForType = (
  type: RecordType,
  selectedReliefs?: string[],
  profile?: TaxpayerProfile | null
): readonly string[] => {
  switch (type) {
    case 'inflow':
      switch (profile) {
        case 'salary':         return SALARY_INFLOW_CATEGORIES;
        case 'salary_hustle':  return SALARY_HUSTLE_INFLOW_CATEGORIES;
        case 'entrepreneur':   return ENTREPRENEUR_INFLOW_CATEGORIES;
        case 'clergy':
        default:               return CLERGY_INFLOW_CATEGORIES;
      }
    case 'outflow':
      switch (profile) {
        case 'salary':         return SALARY_OUTFLOW_CATEGORIES;
        case 'salary_hustle':  return SALARY_HUSTLE_OUTFLOW_CATEGORIES;
        case 'entrepreneur':   return ENTREPRENEUR_OUTFLOW_CATEGORIES;
        case 'clergy':
        default:               return CLERGY_OUTFLOW_CATEGORIES;
      }
    case 'relief':
      if (selectedReliefs && selectedReliefs.length > 0) {
        return RELIEF_CATEGORIES.filter(cat => selectedReliefs.includes(cat));
      }
      return RELIEF_CATEGORIES;
  }
};

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;

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

// First ₦800,000 annual (₦66,666.67 monthly) of chargeable income is tax-free
export const TAX_EXEMPTION = {
  annual: 800_000,
  monthly: 66_666.67,
} as const;

// ── Nigerian PAYE Tax Bands ────────────────────────────────────────────────
//
// `limit` = the WIDTH of the band (how much income fits in this bracket).
// The function calculates tax by exhausting each band in order after the exemption.
//
// Annual bands (apply to annual chargeable income):
//   0 – 800k:               0%   (exemption, handled separately)
//   next 2,200,000:        15%
//   next 9,000,000:        18%
//   next 13,000,000:       21%
//   next 25,000,000:       23%
//   next 50,000,000+:      25%
//
// Monthly bands = annual bands ÷ 12 (apply to monthly chargeable income independently):
//   0 – 66,667:             0%   (exemption)
//   next 183,333.33:       15%
//   next 750,000:          18%
//   next 1,083,333.33:     21%
//   next 2,083,333.33:     23%
//   next 4,166,666.67+:    25%

export type TaxBand = { limit: number; rate: number };

export const TAX_BANDS_ANNUAL: TaxBand[] = [
  { limit: 2_200_000, rate: 0.15 },
  { limit: 9_000_000, rate: 0.18 },
  { limit: 13_000_000, rate: 0.21 },
  { limit: 25_000_000, rate: 0.23 },
  { limit: 50_000_000, rate: 0.25 },
  { limit: Infinity,   rate: 0.25 },
];

export const TAX_BANDS_MONTHLY: TaxBand[] = [
  { limit: 183_333.33,   rate: 0.15 },
  { limit: 750_000,      rate: 0.18 },
  { limit: 1_083_333.33, rate: 0.21 },
  { limit: 2_083_333.33, rate: 0.23 },
  { limit: 4_166_666.67, rate: 0.25 },
  { limit: Infinity,     rate: 0.25 },
];

// Legacy alias
export const TAX_BANDS = TAX_BANDS_ANNUAL;

/**
 * Compute PAYE tax on a chargeable income figure.
 *
 * Annual and monthly are computed INDEPENDENTLY using separate band tables —
 * do NOT derive one by dividing the other by 12.
 *
 * Algorithm:
 *   1. Subtract the period exemption from chargeable income → taxable income
 *   2. Walk through bands in order, consuming each band's `limit` width
 *   3. Sum the tax per band
 */
export const calculatePAYETax = (
  chargeableIncome: number,
  periodType: 'monthly' | 'annually' = 'annually'
): number => {
  if (chargeableIncome <= 0) return 0;

  const exemption = periodType === 'annually' ? TAX_EXEMPTION.annual : TAX_EXEMPTION.monthly;
  const bands = periodType === 'annually' ? TAX_BANDS_ANNUAL : TAX_BANDS_MONTHLY;

  const taxableIncome = Math.max(0, chargeableIncome - exemption);
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let remaining = taxableIncome;

  for (const band of bands) {
    if (remaining <= 0) break;
    const inBand = Math.min(remaining, band.limit);
    tax += inBand * band.rate;
    remaining -= inBand;
  }

  return Math.round(tax * 100) / 100;
};
