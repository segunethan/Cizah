import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTaxCalculations } from '@/hooks/useTaxCalculations';
import MainLayout from '@/components/MainLayout';
import SummaryCard from '@/components/SummaryCard';
import RecordItem from '@/components/RecordItem';
import AddRecordModal from '@/components/AddRecordModal';
import AddRecordDropdown from '@/components/AddRecordDropdown';
import RecordDetailModal from '@/components/RecordDetailModal';
import TaxPayableCard from '@/components/TaxPayableCard';
import OnboardingIncompleteBanner from '@/components/OnboardingIncompleteBanner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNaira } from '@/lib/format';
import { calculateSummary } from '@/lib/recordUtils';
import { calculateTaxBreakdown } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import {
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FinancialRecord } from '@/types/claymoney';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Dashboard = () => {
  const { user, records, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, isLoadingRecords } = useApp();
  const { user: authUser, isAuthenticated } = useAuth();
  const { onboardingCompleted, taxPeriodPreference } = useUserProfile();
  const { pendingTaxCalculation } = useTaxCalculations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'manual' | 'upload'>('manual');
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  // Show incomplete onboarding banner for authenticated users who haven't completed onboarding
  const showOnboardingBanner = isAuthenticated && !onboardingCompleted;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const recordDate = new Date(r.date);
      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    });
  }, [records, selectedMonth, selectedYear]);

  const summary = useMemo(() => calculateSummary(filteredRecords), [filteredRecords]);
  const taxBreakdown = useMemo(() => calculateTaxBreakdown(filteredRecords, taxPeriodPreference), [filteredRecords, taxPeriodPreference]);
  const recentRecords = filteredRecords.slice(0, 5);

  const displayName = user?.name || authUser?.user_metadata?.name || 'User';

  // Check if the selected month has a confirmed/filed tax calculation
  const { getCalculationForPeriod } = useTaxCalculations();
  const activeCalc = getCalculationForPeriod(selectedMonth, selectedYear);
  const isMonthLocked = activeCalc?.status === 'paid' || activeCalc?.status === 'filed';

  if (isLoadingRecords) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Welcome back, {displayName.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your ministry finances
            </p>
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </motion.div>

        {/* Onboarding Incomplete Banner */}
        {showOnboardingBanner && <OnboardingIncompleteBanner />}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <SummaryCard
            title="Total Inflow"
            amount={formatNaira(summary.totalInflow)}
            icon={<ArrowUpCircle className="w-5 h-5 text-inflow" />}
            variant="inflow"
            delay={0.1}
          />
          <SummaryCard
            title="Total Outflow"
            amount={formatNaira(summary.totalOutflow)}
            icon={<ArrowDownCircle className="w-5 h-5 text-outflow" />}
            variant="outflow"
            delay={0.2}
          />
          <SummaryCard
            title="Reliefs"
            amount={formatNaira(summary.totalDeductions)}
            icon={<Settings className="w-5 h-5 text-deduction" />}
            variant="deduction"
            delay={0.3}
          />
          <SummaryCard
            title="Net Earnings"
            amount={formatNaira(summary.actualEarnings)}
            icon={<Wallet className="w-5 h-5 text-primary-foreground" />}
            variant="primary"
            delay={0.4}
          />
        </div>

        {/* Tax Payable Card */}
        <TaxPayableCard 
          taxPayable={taxBreakdown.taxPayable} 
          taxBreakdown={taxBreakdown}
          pendingCalculation={pendingTaxCalculation}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {showOnboardingBanner ? (
            <Button
              disabled
              className="flex-1 h-14 text-lg font-medium rounded-xl opacity-50 cursor-not-allowed"
            >
              Complete registration to add records
            </Button>
          ) : isMonthLocked ? (
            <Button
              disabled
              className="flex-1 h-14 text-lg font-medium rounded-xl opacity-50 cursor-not-allowed"
            >
              Records locked — payment confirmed for {months[selectedMonth]}
            </Button>
          ) : (
            <AddRecordDropdown
              onAddManually={() => {
                setModalMode('manual');
                setIsModalOpen(true);
              }}
              onAddFromStatement={() => {
                setModalMode('upload');
                setIsModalOpen(true);
              }}
            />
          )}
          <Button
            asChild
            variant="outline"
            className="flex-1 h-14 text-lg font-medium rounded-xl border-border hover:bg-secondary"
          >
            <Link to="/reports">
              <BarChart3 className="w-5 h-5 mr-2" />
              View Reports
            </Link>
          </Button>
        </div>

        {/* Recent Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Recent Records</h2>
            <Link
              to="/records"
              className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.map((record, index) => (
                <RecordItem 
                  key={record.id} 
                  record={record} 
                  index={index}
                  onClick={() => setSelectedRecord(record)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No records for this month</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 gradient-primary"
              >
                Add your first record
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      <AddRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialMode={modalMode} />
      <RecordDetailModal 
        record={selectedRecord} 
        open={!!selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
      />
    </MainLayout>
  );
};

export default Dashboard;
