import { useState } from 'react';
import { motion } from 'framer-motion';
import { FinancialRecord } from '@/types/claymoney';
import { getCategoriesForType } from '@/types/onyx';
import { formatNaira, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { 
  ArrowUpCircle, ArrowDownCircle, Settings, X, Calendar, Tag, FileText, Wallet, 
  Edit2, Save, Loader2, ExternalLink, Trash2 
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFinancialRecords } from '@/hooks/useFinancialRecords';
import { toast } from 'sonner';

interface RecordDetailModalProps {
  record: FinancialRecord | null;
  open: boolean;
  onClose: () => void;
}

const RecordDetailModal = ({ record, open, onClose }: RecordDetailModalProps) => {
  const { updateRecord, deleteRecord, isUpdating, isDeleting } = useFinancialRecords();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedDate, setEditedDate] = useState('');

  if (!record) return null;

  const categories = getCategoriesForType(record.type);

  const typeConfig = {
    inflow: {
      icon: ArrowUpCircle,
      color: 'text-inflow',
      bg: 'bg-inflow/10',
      gradient: 'from-inflow/20 to-inflow/5',
      border: 'border-inflow/20',
      label: 'Inflow',
      description: 'Money received',
    },
    outflow: {
      icon: ArrowDownCircle,
      color: 'text-outflow',
      bg: 'bg-outflow/10',
      gradient: 'from-outflow/20 to-outflow/5',
      border: 'border-outflow/20',
      label: 'Outflow',
      description: 'Money spent',
    },
    relief: {
      icon: Settings,
      color: 'text-deduction',
      bg: 'bg-deduction/10',
      gradient: 'from-deduction/20 to-deduction/5',
      border: 'border-deduction/20',
      label: 'Relief',
      description: 'Tax relief',
    },
  };

  const config = typeConfig[record.type];
  const Icon = config.icon;

  const handleEdit = () => {
    setEditedDescription(record.description || '');
    setEditedCategory(record.category);
    setEditedAmount(record.amount.toString());
    const d = new Date(record.date);
    setEditedDate(d.toISOString().split('T')[0]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(editedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await updateRecord({
        ...record,
        category: editedCategory,
        description: editedDescription.trim() || undefined,
        amount,
        date: new Date(editedDate),
      });
      toast.success('Record updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update record');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecord(record.id);
      toast.success('Record deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-card rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header with gradient */}
          <div className={cn('relative p-6 pb-12 bg-gradient-to-br', config.gradient)}>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Type badge */}
            <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', config.bg, config.color)}>
              <Icon className="w-4 h-4" />
              {config.label}
            </div>

            {/* Amount - Hero display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              {isEditing ? (
                <Input
                  type="number"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  className="text-2xl font-bold bg-background/60 border-0 rounded-xl"
                  min="0"
                  step="0.01"
                />
              ) : (
                <p className={cn('text-4xl font-bold tracking-tight', config.color)}>
                  {record.type === 'inflow' ? '+' : '-'}
                  {formatNaira(record.amount)}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            </motion.div>
          </div>

          {/* Floating icon */}
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className={cn(
                'absolute -top-8 right-6 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg',
                config.bg,
                'border-4 border-card'
              )}
            >
              <Icon className={cn('w-8 h-8', config.color)} />
            </motion.div>
          </div>

          {/* Details section */}
          <div className="p-6 pt-10 space-y-4">
            {/* Category - Editable */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Category</p>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={handleEdit} className="h-6 px-2">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Select value={editedCategory} onValueChange={setEditedCategory}>
                    <SelectTrigger className="mt-2 bg-secondary/50 border-0 rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground font-semibold mt-0.5">{record.category}</p>
                )}
              </div>
            </motion.div>

            {/* Date - Editable */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Date</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="mt-2 bg-secondary/50 border-0 rounded-xl"
                  />
                ) : (
                  <p className="text-foreground font-semibold mt-0.5">{formatShortDate(record.date)}</p>
                )}
              </div>
            </motion.div>

            {/* Description - Editable */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Description</p>
                  {!isEditing && !record.description && (
                    <Button variant="ghost" size="sm" onClick={handleEdit} className="h-6 px-2">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="mt-2 min-h-[80px] bg-secondary/50 border-0 rounded-xl resize-none"
                  />
                ) : (
                  <p className="text-foreground font-semibold mt-0.5">
                    {record.description || <span className="text-muted-foreground font-normal">No description</span>}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}

            {/* Evidence */}
            {record.evidenceUrl && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Evidence</p>
                  <a 
                    href={record.evidenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary font-semibold mt-0.5 flex items-center gap-1 hover:underline"
                  >
                    View Document
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Record ID */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-start gap-4 pt-2 border-t border-border"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Record ID</p>
                <p className="text-muted-foreground text-sm mt-0.5 font-mono">#{record.id.slice(-8)}</p>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this {record.type} record of {formatNaira(record.amount)}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordDetailModal;
