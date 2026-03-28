import { FinancialRecord, calculatePAYETax } from '@/types/onyx';

export interface TaxBreakdown {
  totalInflow: number;
  totalOutflow: number;
  netInflow: number;
  voluntaryGift: number;
  otherExpenses: number;
  assessableIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  taxPayable: number;
}

/**
 * Calculate tax based on financial records
 * Formula:
 * - Net Inflow = Total Inflow - Total Outflow
 * - Assessable Income = Net Inflow + Voluntary Gifts - Other Expenses
 * - Chargeable Income = Assessable Income - Applicable Reliefs
 * - Tax Payable = PAYE calculation on Chargeable Income (with exemption applied)
 */
export const calculateTaxBreakdown = (
  records: FinancialRecord[],
  periodType: 'monthly' | 'annually' = 'monthly'
): TaxBreakdown => {
  // Calculate totals by type
  const inflowRecords = records.filter(r => r.type === 'inflow');
  const outflowRecords = records.filter(r => r.type === 'outflow');
  const reliefRecords = records.filter(r => r.type === 'relief');
  
  const totalInflow = inflowRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalOutflow = outflowRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalReliefs = reliefRecords.reduce((sum, r) => sum + r.amount, 0);
  
  // Extract Voluntary Gifts from inflow
  const voluntaryGift = inflowRecords
    .filter(r => r.category === 'Voluntary Gifts')
    .reduce((sum, r) => sum + r.amount, 0);
  
  // Extract "Others" from outflow (used in assessable income calculation)
  const otherExpenses = outflowRecords
    .filter(r => r.category === 'Others')
    .reduce((sum, r) => sum + r.amount, 0);
  
  // Calculate derived values
  const netInflow = totalInflow - totalOutflow;
  const assessableIncome = netInflow + voluntaryGift - otherExpenses;
  const chargeableIncome = Math.max(0, assessableIncome - totalReliefs);
  const taxPayable = calculatePAYETax(chargeableIncome, periodType);
  
  return {
    totalInflow,
    totalOutflow,
    netInflow,
    voluntaryGift,
    otherExpenses,
    assessableIncome,
    totalReliefs,
    chargeableIncome,
    taxPayable,
  };
};

/**
 * Get records for a specific period
 */
export const getRecordsForPeriod = (
  records: FinancialRecord[],
  periodType: 'monthly' | 'annually',
  periodYear: number,
  periodMonth?: number
): FinancialRecord[] => {
  return records.filter(record => {
    const recordDate = new Date(record.date);
    const recordYear = recordDate.getFullYear();
    const recordMonth = recordDate.getMonth();
    
    if (periodType === 'annually') {
      return recordYear === periodYear;
    } else {
      return recordYear === periodYear && recordMonth === periodMonth;
    }
  });
};
