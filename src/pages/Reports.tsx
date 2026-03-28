import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/MainLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';
import { calculateSummary, getBreakdownByCategory } from '@/lib/recordUtils';
import { generateMonthlyReportPDF, generateYearlyReportPDF } from '@/lib/generatePDF';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  PieChart,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ReportTab = 'monthly' | 'yearly';

const Reports = () => {
  const { user, records, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useApp();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const recordDate = new Date(r.date);
      if (activeTab === 'monthly') {
        return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
      }
      return recordDate.getFullYear() === selectedYear;
    });
  }, [records, selectedMonth, selectedYear, activeTab]);

  const summary = useMemo(() => calculateSummary(filteredRecords), [filteredRecords]);

  const inflowBreakdown = useMemo(
    () => getBreakdownByCategory(filteredRecords, 'inflow'),
    [filteredRecords]
  );
  const outflowBreakdown = useMemo(
    () => getBreakdownByCategory(filteredRecords, 'outflow'),
    [filteredRecords]
  );
  const reliefBreakdown = useMemo(
    () => getBreakdownByCategory(filteredRecords, 'relief'),
    [filteredRecords]
  );

  // Calculate monthly data from actual records for the selected year
  const computedMonthlyData = useMemo(() => {
    return months.map((month, monthIndex) => {
      const monthRecords = records.filter((r) => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() === monthIndex && recordDate.getFullYear() === selectedYear;
      });
      const monthSummary = calculateSummary(monthRecords);
      return {
        month,
        inflow: monthSummary.totalInflow,
        outflow: monthSummary.totalOutflow,
        deductions: monthSummary.totalDeductions,
        net: monthSummary.actualEarnings,
      };
    });
  }, [records, selectedYear]);

  const yearlyTotals = useMemo(() => {
    return computedMonthlyData.reduce(
      (acc, m) => ({
        inflow: acc.inflow + m.inflow,
        outflow: acc.outflow + m.outflow,
        deductions: acc.deductions + m.deductions,
        net: acc.net + m.net,
      }),
      { inflow: 0, outflow: 0, deductions: 0, net: 0 }
    );
  }, [computedMonthlyData]);

  const userName = user?.name || authUser?.user_metadata?.name || 'User';

  const handleDownloadPDF = () => {
    if (activeTab === 'monthly') {
      generateMonthlyReportPDF(
        months[selectedMonth],
        selectedYear,
        summary,
        inflowBreakdown,
        outflowBreakdown,
        reliefBreakdown,
        userName
      );
      toast.success('Monthly report downloaded!');
    } else {
      generateYearlyReportPDF(
        selectedYear,
        computedMonthlyData,
        yearlyTotals,
        userName
      );
      toast.success('Yearly report downloaded!');
    }
  };

  // Calculate percentages for visual breakdown
  const totalExpenses = summary.totalOutflow + summary.totalDeductions;
  const savingsRate = summary.totalInflow > 0 
    ? ((summary.actualEarnings / summary.totalInflow) * 100).toFixed(1)
    : '0';

  return (
    <MainLayout>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive breakdown of your ministry finances
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'monthly' && (
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-32 h-10 bg-card border-border rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl z-50">
                  {months.map((month, i) => (
                    <SelectItem key={month} value={i.toString()} className="rounded-lg">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-24 h-10 bg-card border-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-xl z-50">
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()} className="rounded-lg">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleDownloadPDF}
              className="h-10 gradient-primary hover:opacity-90 transition-opacity rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => setActiveTab('monthly')}
            className={cn(
              'px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-secondary'
            )}
          >
            <Calendar className="w-4 h-4" />
            Monthly
          </button>
          <button
            onClick={() => setActiveTab('yearly')}
            className={cn(
              'px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-secondary'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Yearly
          </button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Inflow"
            amount={formatNaira(activeTab === 'monthly' ? summary.totalInflow : yearlyTotals.inflow)}
            icon={<ArrowUpCircle className="w-5 h-5 text-inflow" />}
            variant="inflow"
            delay={0.1}
          />
          <SummaryCard
            title="Total Outflow"
            amount={formatNaira(activeTab === 'monthly' ? summary.totalOutflow : yearlyTotals.outflow)}
            icon={<ArrowDownCircle className="w-5 h-5 text-outflow" />}
            variant="outflow"
            delay={0.2}
          />
          <SummaryCard
            title="Reliefs"
            amount={formatNaira(activeTab === 'monthly' ? summary.totalDeductions : yearlyTotals.deductions)}
            icon={<Settings className="w-5 h-5 text-deduction" />}
            variant="deduction"
            delay={0.3}
          />
          <SummaryCard
            title="Net Earnings"
            amount={formatNaira(activeTab === 'monthly' ? summary.actualEarnings : yearlyTotals.net)}
            icon={<Wallet className="w-5 h-5 text-primary-foreground" />}
            variant="primary"
            delay={0.4}
          />
        </div>

        {activeTab === 'monthly' ? (
          <>
            {/* Quick Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Savings Rate</span>
                </div>
                <p className="text-2xl font-bold text-primary">{savingsRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">of total inflow retained</p>
              </div>
              
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-5 h-5 text-outflow" />
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                </div>
                <p className="text-2xl font-bold text-outflow">{formatNaira(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">outflows + reliefs</p>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-deduction" />
                  <span className="text-sm text-muted-foreground">Record Count</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{filteredRecords.length}</p>
                <p className="text-xs text-muted-foreground mt-1">transactions this month</p>
              </div>
            </motion.div>

            {/* Monthly Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inflows */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card rounded-2xl p-6 shadow-card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-inflow-muted rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-inflow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Inflows</h3>
                    <p className="text-xs text-muted-foreground">by category</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-inflow mb-4">
                  {formatNaira(summary.totalInflow)}
                </div>
                <div className="space-y-3">
                  {Object.entries(inflowBreakdown).length > 0 ? (
                    Object.entries(inflowBreakdown).map(([category, amount]) => {
                      const percentage = summary.totalInflow > 0 
                        ? ((amount / summary.totalInflow) * 100).toFixed(0)
                        : '0';
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">{category}</span>
                            <span className="font-semibold text-inflow">{formatNaira(amount)}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-inflow rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No inflows this period</p>
                  )}
                </div>
              </motion.div>

              {/* Outflows */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-card rounded-2xl p-6 shadow-card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-outflow-muted rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-outflow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Outflows</h3>
                    <p className="text-xs text-muted-foreground">by category</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-outflow mb-4">
                  {formatNaira(summary.totalOutflow)}
                </div>
                <div className="space-y-3">
                  {Object.entries(outflowBreakdown).length > 0 ? (
                    Object.entries(outflowBreakdown).map(([category, amount]) => {
                      const percentage = summary.totalOutflow > 0 
                        ? ((amount / summary.totalOutflow) * 100).toFixed(0)
                        : '0';
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">{category}</span>
                            <span className="font-semibold text-outflow">{formatNaira(amount)}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-outflow rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No outflows this period</p>
                  )}
                </div>
              </motion.div>

              {/* Reliefs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-card rounded-2xl p-6 shadow-card"
              >
                <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-deduction-muted rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-deduction" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Reliefs</h3>
                    <p className="text-xs text-muted-foreground">tax reliefs</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-deduction mb-4">
                  {formatNaira(summary.totalDeductions)}
                </div>
                <div className="space-y-3">
                  {Object.entries(reliefBreakdown).length > 0 ? (
                    Object.entries(reliefBreakdown).map(([category, amount]) => {
                      const percentage = summary.totalDeductions > 0 
                        ? ((amount / summary.totalDeductions) * 100).toFixed(0)
                        : '0';
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">{category}</span>
                            <span className="font-semibold text-deduction">{formatNaira(amount)}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-deduction rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No reliefs this period</p>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        ) : (
          <>
            {/* Yearly Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            >
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Average Monthly Income</span>
                </div>
                <p className="text-2xl font-bold text-inflow">{formatNaira(yearlyTotals.inflow / 12)}</p>
              </div>
              
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-5 h-5 text-outflow" />
                  <span className="text-sm text-muted-foreground">Average Monthly Expenses</span>
                </div>
                <p className="text-2xl font-bold text-outflow">{formatNaira((yearlyTotals.outflow + yearlyTotals.deductions) / 12)}</p>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Average Monthly Savings</span>
                </div>
                <p className="text-2xl font-bold text-primary">{formatNaira(yearlyTotals.net / 12)}</p>
              </div>
            </motion.div>

            {/* Yearly Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-2xl shadow-card overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Monthly Comparison</h3>
                  <p className="text-sm text-muted-foreground mt-1">Track your progress throughout the year</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Month</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-inflow">Inflow</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-outflow">Outflow</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-deduction">Reliefs</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">Net Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedMonthlyData.map((row, i) => (
                      <tr key={row.month} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                        <td className="py-4 px-6 text-sm font-medium text-foreground">{row.month}</td>
                        <td className="py-4 px-6 text-sm text-right text-inflow">{formatNaira(row.inflow)}</td>
                        <td className="py-4 px-6 text-sm text-right text-outflow">{formatNaira(row.outflow)}</td>
                        <td className="py-4 px-6 text-sm text-right text-deduction">{formatNaira(row.deductions)}</td>
                        <td className="py-4 px-6 text-sm text-right font-semibold text-foreground">{formatNaira(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-secondary">
                    <tr>
                      <td className="py-4 px-6 text-sm font-bold text-foreground">Total</td>
                      <td className="py-4 px-6 text-sm text-right font-bold text-inflow">{formatNaira(yearlyTotals.inflow)}</td>
                      <td className="py-4 px-6 text-sm text-right font-bold text-outflow">{formatNaira(yearlyTotals.outflow)}</td>
                      <td className="py-4 px-6 text-sm text-right font-bold text-deduction">{formatNaira(yearlyTotals.deductions)}</td>
                      <td className="py-4 px-6 text-sm text-right font-bold text-foreground">{formatNaira(yearlyTotals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Reports;
