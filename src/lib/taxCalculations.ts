import { FinancialRecord, TaxpayerProfile, calculatePAYETax } from '@/types/onyx';

export interface TaxBreakdown {
  totalInflow: number;
  totalOutflow: number;
  netIncome: number;
  disallowableExpenses: number;
  exemptIncome: number;
  assessableIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  // Both computed independently per the PAYE spec — never derived from each other
  annualTaxPayable: number;
  monthlyTaxPayable: number;
  // taxPayable = whichever matches the user's periodType (for backward compatibility)
  taxPayable: number;
  cgtAssets: number;
  cgtStocks: number;
}

/**
 * Profile-aware Nigerian Personal Income Tax calculation.
 *
 * Steps (all profiles):
 *   1. Net Income        = Total Inflow − Total Outflow
 *   2. (salary_hustle)   Global Total = Net Income (mathematically equivalent — see note)
 *   3. Assessable Income = Net Income + Disallowable Expenses − Exempt Income
 *   4. Chargeable Income = Assessable Income − Total Reliefs
 *   5. Annual Tax        = PAYE annual bands on Chargeable Income
 *      Monthly Tax       = PAYE monthly bands on Chargeable Income (independent)
 *
 * Profile-specific disallowable / exempt rules:
 *   clergy        — School Fees disallowable; Voluntary Gift exempt
 *   salary        — ALL outflow disallowable; Voluntary Gift exempt
 *   salary_hustle — ALL outflow except Cost of Sale disallowable; Voluntary Gift exempt
 *   entrepreneur  — Disallowable = 0 (all biz expenses allowable); Gifts exempt
 *
 * Note on salary_hustle Global Total equivalence:
 *   Spec: Global Total = (Salary + VG − EmpExp) + OBI − CoS
 *   Code: Net Income   = (Salary + VG + OBI) − (EmpExp + CoS)
 *   These are algebraically identical.
 */
export const calculateTaxBreakdown = (
  records: FinancialRecord[],
  periodType: 'monthly' | 'annually' = 'monthly',
  profile?: TaxpayerProfile | null
): TaxBreakdown => {
  const inflowRecords  = records.filter(r => r.type === 'inflow');
  const outflowRecords = records.filter(r => r.type === 'outflow');
  const reliefRecords  = records.filter(r => r.type === 'relief');

  const totalInflow  = inflowRecords.reduce((s, r) => s + r.amount, 0);
  const totalOutflow = outflowRecords.reduce((s, r) => s + r.amount, 0);
  const totalReliefs = reliefRecords.reduce((s, r) => s + r.amount, 0);

  const sumByCategory = (recs: FinancialRecord[], ...cats: string[]) =>
    recs.filter(r => cats.includes(r.category)).reduce((s, r) => s + r.amount, 0);

  let disallowableExpenses = 0;
  let exemptIncome = 0;

  switch (profile) {
    case 'clergy':
      disallowableExpenses = sumByCategory(outflowRecords, 'School Fees');
      exemptIncome         = sumByCategory(inflowRecords, 'Voluntary Gift');
      break;

    case 'salary':
      // All personal expenses are disallowable — add entire outflow back
      disallowableExpenses = totalOutflow;
      exemptIncome         = sumByCategory(inflowRecords, 'Voluntary Gift');
      break;

    case 'salary_hustle':
      // Cost of Sale is an allowable business expense; all other outflows are personal (disallowable)
      disallowableExpenses = totalOutflow - sumByCategory(outflowRecords, 'Cost of Sale');
      exemptIncome         = sumByCategory(inflowRecords, 'Voluntary Gift');
      break;

    case 'entrepreneur':
      // All business expenses are allowable — no add-back
      disallowableExpenses = 0;
      exemptIncome         = sumByCategory(inflowRecords, 'Gifts');
      break;

    default:
      // null / undefined — fall back to clergy behaviour
      disallowableExpenses = sumByCategory(outflowRecords, 'School Fees');
      exemptIncome         = sumByCategory(inflowRecords, 'Voluntary Gift');
      break;
  }

  const netIncome       = totalInflow - totalOutflow;
  const assessableIncome = netIncome + disallowableExpenses - exemptIncome;
  const chargeableIncome = Math.max(0, assessableIncome - totalReliefs);

  // Compute annual and monthly tax independently — never divide one by 12 to get the other
  const annualTaxPayable  = calculatePAYETax(chargeableIncome, 'annually');
  const monthlyTaxPayable = calculatePAYETax(chargeableIncome, 'monthly');
  const taxPayable        = periodType === 'annually' ? annualTaxPayable : monthlyTaxPayable;

  return {
    totalInflow,
    totalOutflow,
    netIncome,
    disallowableExpenses,
    exemptIncome,
    assessableIncome,
    totalReliefs,
    chargeableIncome,
    annualTaxPayable,
    monthlyTaxPayable,
    taxPayable,
    cgtAssets: 0,
    cgtStocks: 0,
  };
};

export const getRecordsForPeriod = (
  records: FinancialRecord[],
  periodType: 'monthly' | 'annually',
  periodYear: number,
  periodMonth?: number
): FinancialRecord[] => {
  return records.filter(record => {
    const recordDate  = new Date(record.date);
    const recordYear  = recordDate.getFullYear();
    const recordMonth = recordDate.getMonth();

    if (periodType === 'annually') {
      return recordYear === periodYear;
    } else {
      return recordYear === periodYear && recordMonth === periodMonth;
    }
  });
};
