import { motion } from 'framer-motion';
import { FinancialRecord } from '@/types/claymoney';
import { formatNaira, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Settings, ChevronRight } from 'lucide-react';

interface RecordItemProps {
  record: FinancialRecord;
  index?: number;
  showDate?: boolean;
  onClick?: () => void;
}

const RecordItem = ({ record, index = 0, showDate = true, onClick }: RecordItemProps) => {
  const typeConfig = {
    inflow: {
      icon: ArrowUpCircle,
      color: 'text-inflow',
      bg: 'bg-inflow-muted',
      badge: 'bg-inflow/10 text-inflow',
      label: 'Inflow',
    },
    outflow: {
      icon: ArrowDownCircle,
      color: 'text-outflow',
      bg: 'bg-outflow-muted',
      badge: 'bg-outflow/10 text-outflow',
      label: 'Outflow',
    },
    relief: {
      icon: Settings,
      color: 'text-deduction',
      bg: 'bg-deduction-muted',
      badge: 'bg-deduction/10 text-deduction',
      label: 'Relief',
    },
  };

  const config = typeConfig[record.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', config.bg)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground truncate">{record.category}</h4>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.badge)}>
            {config.label}
          </span>
        </div>
        {record.description && (
          <p className="text-sm text-muted-foreground truncate">{record.description}</p>
        )}
        {showDate && (
          <p className="text-xs text-muted-foreground mt-1">{formatShortDate(record.date)}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={cn('font-bold', config.color)}>
            {record.type === 'inflow' ? '+' : '-'}
            {formatNaira(record.amount)}
          </p>
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
};

export default RecordItem;
