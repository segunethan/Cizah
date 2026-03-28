import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { RecordType, getCategoriesForType, FinancialRecord } from '@/types/claymoney';
import { useUserReliefs } from '@/hooks/useUserReliefs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { X, ArrowUpCircle, ArrowDownCircle, Settings, CalendarIcon, Check, Upload, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import StatementUploadWithPeriod from './StatementUploadWithPeriod';
import { supabase } from '@/integrations/supabase/client';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ModalMode;
}

type ModalMode = 'manual' | 'upload';

const AddRecordModal = ({ isOpen, onClose, initialMode = 'manual' }: AddRecordModalProps) => {
  const { addRecord, addRecords } = useApp();
  const { user } = useAuth();
  const { selectedReliefs } = useUserReliefs();
  const [mode, setMode] = useState<ModalMode>('manual');
  const [recordType, setRecordType] = useState<RecordType>('inflow');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get categories based on type, filtering reliefs based on user selection.
  // useUserReliefs fetches selected reliefs from the user profile.
  const categories = getCategoriesForType(recordType, selectedReliefs);

  // Sync mode when modal opens with initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleTypeChange = (type: RecordType) => {
    setRecordType(type);
    setCategory('');
    setEvidenceFile(null);
    setEvidenceUrl('');
  };

  const handleEvidenceUpload = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    setUploadingEvidence(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/evidence-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('statements')
        .createSignedUrl(filePath, 86400 * 365); // 1 year expiry

      if (signedError) throw signedError;

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Evidence upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload evidence file. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setEvidenceFile(file);
    const url = await handleEvidenceUpload(file);
    if (url) {
      setEvidenceUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !amount) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Relief records require evidence
    if (recordType === 'relief' && !evidenceUrl) {
      toast({
        title: 'Evidence Required',
        description: 'Please upload evidence document for relief records.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addRecord({
        type: recordType,
        category,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        date,
        evidenceUrl: evidenceUrl || undefined,
      });

      toast({
        title: 'Record added!',
        description: 'Your financial record has been saved successfully.',
      });

      resetAndClose();
    } catch (error: any) {
      console.error('Failed to add record:', {
        message: error?.message,
        details: error?.toString(),
        hint: error?.hint,
        code: error?.code,
      });
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save record. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordsExtracted = async (records: Omit<FinancialRecord, 'id'>[]) => {
    try {
      await addRecords(records);
      toast({
        title: 'Records Added',
        description: `${records.length} records imported. You can now add relief records from the Records page.`,
      });
      resetAndClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save records. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetAndClose = () => {
    setMode('manual');
    setRecordType('inflow');
    setCategory('');
    setAmount('');
    setDescription('');
    setDate(new Date());
    setEvidenceFile(null);
    setEvidenceUrl('');
    setIsSubmitting(false);
    onClose();
  };

  const typeOptions = [
    { type: 'inflow' as const, label: 'Inflow', icon: ArrowUpCircle, color: 'text-inflow', bg: 'bg-inflow', bgMuted: 'bg-inflow-muted' },
    { type: 'outflow' as const, label: 'Outflow', icon: ArrowDownCircle, color: 'text-outflow', bg: 'bg-outflow', bgMuted: 'bg-outflow-muted' },
    { type: 'relief' as const, label: 'Relief', icon: Settings, color: 'text-deduction', bg: 'bg-deduction', bgMuted: 'bg-deduction-muted' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50"
          >
            <div className="bg-card rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
              {/* Header */}
              <div className="sticky top-0 bg-card px-6 py-4 border-b border-border flex items-center justify-between rounded-t-3xl">
                <h2 className="text-xl font-bold text-foreground">Add New Record</h2>
                <button
                  onClick={resetAndClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {mode === 'upload' ? (
                  <StatementUploadWithPeriod
                    onRecordsExtracted={handleRecordsExtracted}
                    onBack={() => setMode('manual')}
                  />
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Record Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">Record Type</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {typeOptions.map(({ type, label, icon: Icon, color, bg, bgMuted }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTypeChange(type)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                              recordType === type
                                ? `border-current ${color} ${bgMuted}`
                                : 'border-transparent bg-secondary hover:bg-secondary/80'
                            )}
                          >
                            <Icon className={cn('w-6 h-6', recordType === type ? color : 'text-muted-foreground')} />
                            <span className={cn('text-sm font-medium', recordType === type ? color : 'text-muted-foreground')}>
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border rounded-xl z-[100]">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="rounded-lg">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Amount (₦)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          ₦
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-12 pl-8 bg-secondary/50 border-0 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 rounded-xl"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {format(date, 'PPP')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border border-border rounded-xl z-[100]" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && setDate(d)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Description <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-secondary/50 border-0 rounded-xl resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Evidence Upload - for outflow (optional) and relief (required) */}
                    {(recordType === 'outflow' || recordType === 'relief') && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Evidence Document {recordType === 'relief' ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
                        </Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="evidence-upload"
                            disabled={uploadingEvidence}
                          />
                          <label htmlFor="evidence-upload" className="flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={uploadingEvidence}
                              className={cn(
                                "w-full h-12 rounded-xl border-dashed",
                                evidenceUrl && "border-green-500 bg-green-50 dark:bg-green-900/20"
                              )}
                              asChild
                            >
                              <span>
                                {uploadingEvidence ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : evidenceUrl ? (
                                  <>
                                    <FileText className="w-4 h-4 mr-2 text-green-600" />
                                    <span className="text-green-600 truncate">{evidenceFile?.name || 'File uploaded'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Evidence (PDF, JPG, PNG)
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                        {recordType === 'relief' && !evidenceUrl && (
                          <p className="text-xs text-destructive">Evidence is required for relief records</p>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetAndClose}
                        className="flex-1 h-12 rounded-xl border-border"
                        disabled={isSubmitting || uploadingEvidence}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 rounded-xl gradient-primary hover:opacity-90 transition-opacity"
                        disabled={isSubmitting || uploadingEvidence || (recordType === 'relief' && !evidenceUrl)}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Record
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddRecordModal;
