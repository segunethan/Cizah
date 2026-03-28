import { FinancialRecord } from '@/types/onyx';

export const calculateSummary = (records: FinancialRecord[]) => {
  const totalInflow = records
    .filter((r) => r.type === 'inflow')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalOutflow = records
    .filter((r) => r.type === 'outflow')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalReliefs = records
    .filter((r) => r.type === 'relief')
    .reduce((sum, r) => sum + r.amount, 0);
  const actualEarnings = totalInflow - totalOutflow - totalReliefs;
  return { totalInflow, totalOutflow, totalDeductions: totalReliefs, actualEarnings };
};

export const getBreakdownByCategory = (
  records: FinancialRecord[],
  type: 'inflow' | 'outflow' | 'relief'
): Record<string, number> => {
  const filtered = records.filter((r) => r.type === type);
  const breakdown: Record<string, number> = {};
  filtered.forEach((r) => {
    breakdown[r.category] = (breakdown[r.category] || 0) + r.amount;
  });
  return breakdown;
};
