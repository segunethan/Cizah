import { FinancialRecord, UserProfile } from '@/types/claymoney';

export const mockUser: UserProfile = {
  name: 'Pastor Tunde Okafor',
  email: 'tunde@example.com',
  phone: '08012345678',
};

export const mockRecords: FinancialRecord[] = [
  {
    id: '1',
    type: 'inflow',
    category: 'Honourarium',
    amount: 50000,
    description: 'Sunday service ministration',
    date: new Date('2025-01-15'),
  },
  {
    id: '2',
    type: 'outflow',
    category: 'Electricity and Data',
    amount: 3500,
    description: 'Monthly utilities',
    date: new Date('2025-01-14'),
  },
  {
    id: '3',
    type: 'inflow',
    category: 'Voluntary Gifts',
    amount: 25000,
    description: 'Gift from church member',
    date: new Date('2025-01-12'),
  },
  {
    id: '4',
    type: 'relief',
    category: 'Pension',
    amount: 2500,
    description: 'Monthly pension contribution',
    date: new Date('2025-01-10'),
  },
  {
    id: '5',
    type: 'outflow',
    category: 'School Fees',
    amount: 15000,
    description: 'Children school fees',
    date: new Date('2025-01-08'),
  },
  {
    id: '6',
    type: 'inflow',
    category: 'Prophet Offerings',
    amount: 20000,
    description: 'Special thanksgiving service',
    date: new Date('2025-01-07'),
  },
  {
    id: '7',
    type: 'outflow',
    category: 'Material, Fuel, Feeding, and Travels',
    amount: 8000,
    description: 'Fuel and feeding expenses',
    date: new Date('2025-01-06'),
  },
  {
    id: '8',
    type: 'relief',
    category: 'NHIS',
    amount: 3500,
    description: 'Health insurance',
    date: new Date('2025-01-05'),
  },
  {
    id: '9',
    type: 'outflow',
    category: 'Tithe, Offerings, Gifts/Givings',
    amount: 5000,
    description: 'Monthly tithe',
    date: new Date('2025-01-04'),
  },
  {
    id: '10',
    type: 'inflow',
    category: 'Others',
    amount: 30500,
    description: 'Miscellaneous income',
    date: new Date('2025-01-03'),
  },
  {
    id: '11',
    type: 'outflow',
    category: 'Rent and Maintenance (Housing)',
    amount: 20000,
    description: 'Housing maintenance',
    date: new Date('2025-01-02'),
  },
  {
    id: '12',
    type: 'relief',
    category: 'NHF',
    amount: 500,
    description: 'National Housing Fund',
    date: new Date('2025-01-01'),
  },
  {
    id: '13',
    type: 'relief',
    category: 'Life Insurance/Annuity Premium',
    amount: 1000,
    description: 'Life insurance',
    date: new Date('2025-01-01'),
  },
  {
    id: '14',
    type: 'relief',
    category: 'Mortgage Interest',
    amount: 1000,
    description: 'Monthly mortgage interest',
    date: new Date('2025-01-01'),
  },
];

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

export const getBreakdownByCategory = (records: FinancialRecord[], type: 'inflow' | 'outflow' | 'relief') => {
  const filtered = records.filter((r) => r.type === type);
  const breakdown: Record<string, number> = {};
  
  filtered.forEach((r) => {
    breakdown[r.category] = (breakdown[r.category] || 0) + r.amount;
  });
  
  return breakdown;
};

