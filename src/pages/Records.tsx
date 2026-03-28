import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import MainLayout from '@/components/MainLayout';
import RecordItem from '@/components/RecordItem';
import AddRecordModal from '@/components/AddRecordModal';
import AddRecordDropdown from '@/components/AddRecordDropdown';
import RecordDetailModal from '@/components/RecordDetailModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search } from 'lucide-react';
import { FinancialRecord } from '@/types/claymoney';

type FilterType = 'all' | 'inflow' | 'outflow' | 'relief';
type ModalMode = 'manual' | 'upload';

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const Records = () => {
  const { records, isLoadingRecords } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('manual');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Get unique years from records, always including 2025 as minimum
  const availableYears = useMemo(() => {
    const years = new Set<number>([2025]); // Always include 2025
    records.forEach((r) => {
      const date = new Date(r.date);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records;

    // Filter by type
    if (filter !== 'all') {
      result = result.filter((r) => r.type === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.category.toLowerCase().includes(query) ||
          (r.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // Filter by year
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear, 10);
      result = result.filter((r) => new Date(r.date).getFullYear() === year);
    }

    // Filter by month
    if (selectedMonth !== 'all') {
      const month = parseInt(selectedMonth, 10);
      result = result.filter((r) => new Date(r.date).getMonth() === month);
    }

    return result;
  }, [records, filter, searchQuery, selectedYear, selectedMonth]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRecords]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'inflow', label: 'Inflow' },
    { key: 'outflow', label: 'Outflow' },
    { key: 'relief', label: 'Reliefs' },
  ];

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
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Records</h1>
          </div>
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
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3 mb-4"
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by category or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Year and Month Filters */}
          <div className="flex gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-4 overflow-x-auto pb-2"
        >
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                filter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-secondary'
              )}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Record Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {sortedRecords.length} record{sortedRecords.length !== 1 ? 's' : ''} found
        </p>

        {/* Records List */}
        {sortedRecords.length > 0 ? (
          <div className="space-y-3">
            {sortedRecords.map((record, index) => (
              <RecordItem 
                key={record.id} 
                record={record} 
                index={index}
                onClick={() => setSelectedRecord(record)}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-card rounded-2xl"
          >
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No {filter !== 'all' ? filter : ''} records found
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gradient-primary"
            >
              Add your first record
            </Button>
          </motion.div>
        )}
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

export default Records;
