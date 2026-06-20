import { describe, it, expect } from 'vitest';
import { calculatePAYETax } from '../types/onyx';
import { calculateTaxBreakdown } from '../lib/taxCalculations';
import type { FinancialRecord } from '../types/onyx';

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0;
const rec = (
  type: 'inflow' | 'outflow' | 'relief',
  category: string,
  amount: number
): FinancialRecord => ({
  id: String(++_id),
  type,
  category,
  amount,
  date: new Date('2025-06-01'),
});

// ── calculatePAYETax ──────────────────────────────────────────────────────────

describe('calculatePAYETax — annual', () => {
  it('returns 0 for zero income', () => {
    expect(calculatePAYETax(0, 'annually')).toBe(0);
  });

  it('returns 0 for negative income', () => {
    expect(calculatePAYETax(-100_000, 'annually')).toBe(0);
  });

  it('returns 0 when income is at or below the ₦800k exemption', () => {
    expect(calculatePAYETax(800_000, 'annually')).toBe(0);
    expect(calculatePAYETax(500_000, 'annually')).toBe(0);
  });

  it('taxes only the portion above ₦800k at 15%', () => {
    // ₦1,000,000 chargeable → ₦200,000 taxable → 200,000 × 15% = ₦30,000
    expect(calculatePAYETax(1_000_000, 'annually')).toBe(30_000);
  });

  it('spans the 15% band exactly (₦800k + ₦2.2M = ₦3M chargeable)', () => {
    // taxable = 2,200,000 → all at 15% = 330,000
    expect(calculatePAYETax(3_000_000, 'annually')).toBe(330_000);
  });

  it('spills into the 18% band', () => {
    // chargeable = 4,000,000
    // taxable    = 3,200,000
    // band 1: 2,200,000 × 15% = 330,000
    // band 2: 1,000,000 × 18% = 180,000
    // total = 510,000
    expect(calculatePAYETax(4_000_000, 'annually')).toBe(510_000);
  });
});

describe('calculatePAYETax — monthly', () => {
  it('returns 0 for zero income', () => {
    expect(calculatePAYETax(0, 'monthly')).toBe(0);
  });

  it('returns 0 when income is at or below the ₦66,666.67 exemption', () => {
    expect(calculatePAYETax(66_666.67, 'monthly')).toBe(0);
    expect(calculatePAYETax(50_000, 'monthly')).toBe(0);
  });

  it('taxes only the portion above ₦66,666.67 at 15%', () => {
    // chargeable = 100,000 → taxable = 33,333.33 → × 15% = 4,999.9995 → rounded = 5,000
    expect(calculatePAYETax(100_000, 'monthly')).toBe(5_000);
  });

  it('monthly and annual are independent — same chargeable income yields different tax', () => {
    // With the same ₦5M chargeable income:
    //   monthly: taxable = 5M − 66,667 = 4,933,333 → spans 5 bands → ~₦1,077,500
    //   annual:  taxable = 5M − 800,000 = 4,200,000 → spans 2 bands → ₦690,000
    // These are genuinely different, proving independent computation.
    const annual  = calculatePAYETax(5_000_000, 'annually');
    const monthly = calculatePAYETax(5_000_000, 'monthly');
    expect(annual).not.toBe(monthly);
    expect(annual).toBe(690_000);
    expect(monthly).toBe(1_077_500);
  });
});

// ── calculateTaxBreakdown ─────────────────────────────────────────────────────

describe('calculateTaxBreakdown — clergy', () => {
  it('adds back School Fees as disallowable; exempts Voluntary Gift', () => {
    const records = [
      rec('inflow',  'Salary',          500_000),
      rec('inflow',  'Voluntary Gift',   50_000),
      rec('outflow', 'School Fees',      80_000),
      rec('outflow', 'Feeding',          20_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'clergy');

    expect(bd.totalInflow).toBe(550_000);
    expect(bd.totalOutflow).toBe(100_000);
    expect(bd.netIncome).toBe(450_000);
    expect(bd.disallowableExpenses).toBe(80_000);   // only School Fees
    expect(bd.exemptIncome).toBe(50_000);            // Voluntary Gift
    // assessable = 450k + 80k − 50k = 480k
    expect(bd.assessableIncome).toBe(480_000);
  });

  it('non-School-Fees outflow is NOT disallowable for clergy', () => {
    const records = [
      rec('inflow',  'Salary',   300_000),
      rec('outflow', 'Feeding',   50_000),
      rec('outflow', 'Data',      10_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'clergy');
    expect(bd.disallowableExpenses).toBe(0);
  });
});

describe('calculateTaxBreakdown — salary', () => {
  it('adds back ALL outflow as disallowable; exempts Voluntary Gift', () => {
    const records = [
      rec('inflow',  'Salary',          600_000),
      rec('inflow',  'Voluntary Gift',   40_000),
      rec('outflow', 'Electricity',      30_000),
      rec('outflow', 'Feeding',          20_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'salary');

    expect(bd.disallowableExpenses).toBe(50_000);   // entire outflow
    expect(bd.exemptIncome).toBe(40_000);
    // net = 590k; assessable = 590k + 50k − 40k = 600k
    expect(bd.assessableIncome).toBe(600_000);
  });
});

describe('calculateTaxBreakdown — salary_hustle', () => {
  it('excludes Cost of Sale from disallowables; exempts Voluntary Gift', () => {
    const records = [
      rec('inflow',  'Salary',              400_000),
      rec('inflow',  'Other Business Income', 200_000),
      rec('inflow',  'Voluntary Gift',        30_000),
      rec('outflow', 'Cost of Sale',          60_000),  // allowable → NOT disallowable
      rec('outflow', 'Electricity',           20_000),  // personal → disallowable
      rec('outflow', 'Data',                  10_000),  // personal → disallowable
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'salary_hustle');

    expect(bd.totalOutflow).toBe(90_000);
    expect(bd.disallowableExpenses).toBe(30_000); // 90k − 60k CoS
    expect(bd.exemptIncome).toBe(30_000);
    // net = 630k − 90k = 540k; assessable = 540k + 30k − 30k = 540k
    expect(bd.assessableIncome).toBe(540_000);
  });

  it('if there is no Cost of Sale, all outflow is disallowable', () => {
    const records = [
      rec('inflow',  'Salary',   500_000),
      rec('outflow', 'Feeding',   50_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'salary_hustle');
    expect(bd.disallowableExpenses).toBe(50_000);
  });
});

describe('calculateTaxBreakdown — entrepreneur', () => {
  it('disallowable is always 0; exempts Gifts (not Voluntary Gift)', () => {
    const records = [
      rec('inflow',  'Sales Income',  1_000_000),
      rec('inflow',  'Gifts',           100_000),
      rec('inflow',  'Voluntary Gift',   50_000), // NOT exempt for entrepreneur
      rec('outflow', 'Cost of Sale',    200_000),
      rec('outflow', 'Electricity',      30_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'entrepreneur');

    expect(bd.disallowableExpenses).toBe(0);
    expect(bd.exemptIncome).toBe(100_000);       // only 'Gifts'
    // net = 1,150k − 230k = 920k; assessable = 920k + 0 − 100k = 820k
    expect(bd.assessableIncome).toBe(820_000);
  });

  it('Voluntary Gift is NOT exempt for entrepreneur', () => {
    const records = [
      rec('inflow', 'Sales Income',   500_000),
      rec('inflow', 'Voluntary Gift', 100_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'entrepreneur');
    expect(bd.exemptIncome).toBe(0);
  });
});

// ── Reliefs reduce chargeable income ─────────────────────────────────────────

describe('calculateTaxBreakdown — reliefs', () => {
  it('reliefs reduce chargeable income', () => {
    const records = [
      rec('inflow',  'Salary',   2_000_000),
      rec('relief',  'Pension',    200_000),
      rec('relief',  'NHF',        100_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'clergy');
    expect(bd.totalReliefs).toBe(300_000);
    expect(bd.chargeableIncome).toBe(1_700_000);
  });

  it('chargeable income cannot go below 0', () => {
    const records = [
      rec('inflow',  'Salary',   500_000),
      rec('relief',  'Pension', 5_000_000),
    ];
    const bd = calculateTaxBreakdown(records, 'annually', 'salary');
    expect(bd.chargeableIncome).toBe(0);
    expect(bd.taxPayable).toBe(0);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('calculateTaxBreakdown — edge cases', () => {
  it('returns all zeros for empty records', () => {
    const bd = calculateTaxBreakdown([], 'annually', 'salary');
    expect(bd.totalInflow).toBe(0);
    expect(bd.totalOutflow).toBe(0);
    expect(bd.taxPayable).toBe(0);
  });

  it('falls back to clergy rules when profile is null', () => {
    const records = [
      rec('inflow',  'Salary',        300_000),
      rec('outflow', 'School Fees',    50_000),
      rec('outflow', 'Feeding',        20_000),
    ];
    const withNull   = calculateTaxBreakdown(records, 'annually', null);
    const withClergy = calculateTaxBreakdown(records, 'annually', 'clergy');
    expect(withNull.disallowableExpenses).toBe(withClergy.disallowableExpenses);
    expect(withNull.assessableIncome).toBe(withClergy.assessableIncome);
  });

  it('taxPayable reflects the chosen periodType', () => {
    const records = [rec('inflow', 'Salary', 5_000_000)];
    const monthly  = calculateTaxBreakdown(records, 'monthly',  'salary');
    const annually = calculateTaxBreakdown(records, 'annually', 'salary');
    expect(monthly.taxPayable).toBe(monthly.monthlyTaxPayable);
    expect(annually.taxPayable).toBe(annually.annualTaxPayable);
    expect(monthly.taxPayable).not.toBe(annually.taxPayable);
  });

  it('annualTaxPayable and monthlyTaxPayable are always both present', () => {
    const records = [rec('inflow', 'Salary', 2_000_000)];
    const bd = calculateTaxBreakdown(records, 'monthly', 'salary');
    expect(bd.annualTaxPayable).toBeGreaterThan(0);
    expect(bd.monthlyTaxPayable).toBeGreaterThan(0);
  });
});
