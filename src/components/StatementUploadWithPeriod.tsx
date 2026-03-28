import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Calendar } from 'lucide-react';
import StatementUpload from './StatementUpload';
import { FinancialRecord } from '@/types/claymoney';
import { useFinancialRecords } from '@/hooks/useFinancialRecords';

interface StatementUploadWithPeriodProps {
  onRecordsExtracted: (records: Omit<FinancialRecord, 'id'>[]) => void;
  onBack: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const StatementUploadWithPeriod = ({ onRecordsExtracted, onBack }: StatementUploadWithPeriodProps) => {
  const [step, setStep] = useState<'select-period' | 'upload'>('select-period');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { records } = useFinancialRecords();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleContinue = () => {
    setStep('upload');
  };

  // Filter existing records for the selected period to pass for duplicate detection
  const existingRecordsForPeriod = records.filter(r => {
    const recordDate = r.date instanceof Date ? r.date : new Date(r.date);
    return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
  }).map(r => ({
    date: r.date instanceof Date ? r.date : new Date(r.date),
    amount: r.amount,
    description: r.description,
  }));

  if (step === 'upload') {
    return (
      <StatementUpload
        onRecordsExtracted={onRecordsExtracted}
        onBack={() => setStep('select-period')}
        overrideMonth={selectedMonth}
        overrideYear={selectedYear}
        existingRecords={existingRecordsForPeriod}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Select Statement Period</h2>
          <p className="text-sm text-muted-foreground">Which month is this statement for?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Month</Label>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border rounded-xl z-[200]">
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Year</Label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border rounded-xl z-[200]">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 bg-secondary/30 rounded-xl">
        <p className="text-sm text-muted-foreground">
          Extracting records for: <span className="font-medium text-foreground">{MONTHS[selectedMonth]} {selectedYear}</span>
        </p>
      </div>

      <Button
        onClick={handleContinue}
        className="w-full h-12 rounded-xl gradient-primary hover:opacity-90"
      >
        Continue to Upload
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
};

export default StatementUploadWithPeriod;
