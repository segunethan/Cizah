import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Check, X, ArrowLeft, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { RecordType, FinancialRecord, INFLOW_CATEGORIES, OUTFLOW_CATEGORIES } from '@/types/claymoney';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { parseStatementClientSide, ParsedTransaction, getValidCategories } from '@/lib/clientStatementParser';

function getErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Unknown error';
  if (typeof err === 'object') {
    const anyErr = err as any;
    if (typeof anyErr.message === 'string' && anyErr.message) return anyErr.message;
    if (typeof anyErr.error === 'string' && anyErr.error) return anyErr.error;
    try { return JSON.stringify(anyErr); } catch { return 'Unknown error'; }
  }
  return 'Unknown error';
}

interface StatementUploadProps {
  onRecordsExtracted: (records: Omit<FinancialRecord, 'id'>[]) => void;
  onBack: () => void;
  overrideMonth?: number;
  overrideYear?: number;
  existingRecords?: Array<{ date: Date; amount: number; description?: string }>;
}

const StatementUpload = ({ onRecordsExtracted, onBack, overrideMonth, overrideYear, existingRecords = [] }: StatementUploadProps) => {
  const { selectedMonth: appMonth, selectedYear: appYear } = useApp();
  const selectedMonth = overrideMonth ?? appMonth;
  const selectedYear = overrideYear ?? appYear;
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedRecords, setExtractedRecords] = useState<ParsedTransaction[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Duplicate detection from existing records
  const existingRecordKeys = new Set(
    existingRecords.map(r => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      return `${dateStr}|${r.amount}|${(r.description || '').substring(0, 30)}`;
    })
  );

  const isDuplicate = (record: ParsedTransaction): boolean => {
    const dateStr = record.date.split('T')[0];
    const key = `${dateStr}|${record.amount}|${(record.description || '').substring(0, 30)}`;
    return existingRecordKeys.has(key);
  };

  // ─── Drag & Drop ──────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  // ─── Process file (client-side) ───────────────────────
  const processFile = async (file: File) => {
    const allowedExtensions = ['.pdf', '.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Please upload a PDF, Excel (.xls, .xlsx), or CSV file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setIsProcessing(true);
    setExtractionProgress(10);
    setExtractedRecords([]);
    setDuplicatesSkipped(0);
    setParseError(null);
    setEditingIndex(null);

    try {
      setExtractionProgress(30);

      const result = await parseStatementClientSide(file, selectedMonth, selectedYear);

      setExtractionProgress(80);

      if (result.error && result.transactions.length === 0) {
        setParseError(result.error);
        setExtractionProgress(0);
        return;
      }

      // Filter out duplicates
      const newRecords: ParsedTransaction[] = [];
      let dupeCount = 0;
      for (const record of result.transactions) {
        if (isDuplicate(record)) {
          dupeCount++;
        } else {
          newRecords.push(record);
        }
      }

      setDuplicatesSkipped(dupeCount);
      setExtractedRecords(newRecords);
      setSelectedRecords(new Set(newRecords.map((_, i) => i)));
      setExtractionProgress(100);

      const dupeInfo = dupeCount > 0 ? `, ${dupeCount} duplicate(s) skipped` : '';
      toast.success(`Found ${newRecords.length} transaction(s)${dupeInfo} for ${monthNames[selectedMonth]} ${selectedYear}!`);
    } catch (err) {
      console.error('Error processing file:', err);
      setParseError('Failed to process file. Please try again.');
      setExtractionProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Record actions ───────────────────────────────────
  const toggleRecord = (index: number) => {
    if (editingIndex !== null) return;
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedRecords(newSelected);
  };

  const deleteRecord = (index: number) => {
    setExtractedRecords(prev => prev.filter((_, i) => i !== index));
    setSelectedRecords(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
    setEditingIndex(null);
  };

  const updateRecord = (index: number, updates: Partial<ParsedTransaction>) => {
    setExtractedRecords(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const handleAddSelected = () => {
    const recordsToAdd = extractedRecords
      .filter((_, i) => selectedRecords.has(i))
      .map((record) => ({
        type: record.type,
        category: record.category,
        amount: record.amount,
        description: record.description,
        date: new Date(record.date),
      }));

    if (recordsToAdd.length === 0) {
      toast.error('Please select at least one record');
      return;
    }

    onRecordsExtracted(recordsToAdd);
    toast.success(`Added ${recordsToAdd.length} record(s)!`);
  };

  const getTypeColor = (type: RecordType) => {
    switch (type) {
      case 'inflow': return 'text-inflow bg-inflow-muted';
      case 'outflow': return 'text-outflow bg-outflow-muted';
      case 'relief': return 'text-deduction bg-deduction-muted';
    }
  };

  // ─── Upload zone ──────────────────────────────────────
  if (extractedRecords.length === 0 && !parseError) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to manual entry
        </button>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {Math.round(extractionProgress)}%
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">Extracting transactions...</p>
                <p className="text-sm text-muted-foreground mt-1">Processing locally in your browser</p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={extractionProgress} className="h-2" />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold text-foreground mb-2">Drop your statement here</p>
              <p className="text-sm text-muted-foreground mb-1">Supports PDF, Excel (.xls, .xlsx), and CSV files</p>
              <p className="text-xs text-muted-foreground mb-4">Processed entirely in your browser — no AI credits used</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl"
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────
  if (parseError) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to manual entry
        </button>

        <div className="border-2 border-dashed border-destructive/50 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="font-semibold text-foreground mb-2">Parsing Failed</p>
          <p className="text-sm text-muted-foreground mb-4">{parseError}</p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setParseError(null);
                setExtractionProgress(0);
              }}
              className="rounded-xl"
            >
              Try Another File
            </Button>
            <Button
              onClick={onBack}
              className="rounded-xl gradient-primary"
            >
              Add Manually
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Preview table with edit ──────────────────────────
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to manual entry
      </button>

      {duplicatesSkipped > 0 && (
        <div className="p-3 bg-muted border border-border rounded-xl">
          <p className="text-sm text-foreground font-medium">
            {duplicatesSkipped} duplicate record(s) were skipped (already imported).
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedRecords.size} of {extractedRecords.length} selected
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (selectedRecords.size === extractedRecords.length) {
              setSelectedRecords(new Set());
            } else {
              setSelectedRecords(new Set(extractedRecords.map((_, i) => i)));
            }
          }}
          className="text-xs"
        >
          {selectedRecords.size === extractedRecords.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
        <AnimatePresence>
          {extractedRecords.map((record, index) => (
            <motion.div
              key={`${record.date}-${record.amount}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ delay: Math.min(index * 0.03, 0.5) }}
              className={cn(
                'rounded-xl transition-all border',
                editingIndex === index
                  ? 'bg-secondary border-primary ring-1 ring-primary/20'
                  : selectedRecords.has(index)
                    ? 'bg-primary/5 border-primary'
                    : 'bg-card border-border hover:border-primary/50'
              )}
            >
              {editingIndex === index ? (
                /* ─── Inline Edit Form ─── */
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                      <Input
                        type="date"
                        value={record.date.split('T')[0]}
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) updateRecord(index, { date: d.toISOString() });
                        }}
                        className="h-9 text-sm bg-background rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Amount (₦)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={record.amount}
                        onChange={(e) => updateRecord(index, { amount: parseFloat(e.target.value) || 0 })}
                        className="h-9 text-sm bg-background rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <Input
                      value={record.description}
                      onChange={(e) => updateRecord(index, { description: e.target.value })}
                      className="h-9 text-sm bg-background rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                      <Select
                        value={record.type}
                        onValueChange={(v: RecordType) => {
                          const cats = getValidCategories(v);
                          updateRecord(index, { type: v, category: cats[cats.length - 1] as string });
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm bg-background rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border rounded-xl z-[100]">
                          <SelectItem value="inflow">Inflow</SelectItem>
                          <SelectItem value="outflow">Outflow</SelectItem>
                          <SelectItem value="relief">Relief</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                      <Select
                        value={record.category}
                        onValueChange={(v) => updateRecord(index, { category: v })}
                      >
                        <SelectTrigger className="h-9 text-sm bg-background rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border rounded-xl z-[100]">
                          {getValidCategories(record.type).map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRecord(index)}
                      className="text-destructive hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setEditingIndex(null)}
                      className="ml-auto rounded-lg gradient-primary"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ) : (
                /* ─── Display Row ─── */
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => toggleRecord(index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                        selectedRecords.has(index)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      )}
                    >
                      {selectedRecords.has(index) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', getTypeColor(record.type))}>
                          {record.type}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{record.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {record.description || 'No description'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('font-semibold', record.type === 'inflow' ? 'text-inflow' : record.type === 'outflow' ? 'text-outflow' : 'text-deduction')}>
                        {formatNaira(record.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingIndex(index); }}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setExtractedRecords([]);
            setSelectedRecords(new Set());
            setEditingIndex(null);
          }}
          className="flex-1 rounded-xl"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleAddSelected}
          disabled={selectedRecords.size === 0 || editingIndex !== null}
          className="flex-1 gradient-primary rounded-xl"
        >
          <Check className="w-4 h-4 mr-2" />
          Add {selectedRecords.size} Record{selectedRecords.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};

export default StatementUpload;
