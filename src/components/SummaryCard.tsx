import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  amount: string;
  icon: ReactNode;
  variant?: 'default' | 'inflow' | 'outflow' | 'deduction' | 'primary';
  className?: string;
  delay?: number;
}

const SummaryCard = ({
  title,
  amount,
  icon,
  variant = 'default',
  className,
  delay = 0,
}: SummaryCardProps) => {
  const variants = {
    default: 'bg-card',
    inflow: 'bg-inflow-muted',
    outflow: 'bg-outflow-muted',
    deduction: 'bg-deduction-muted',
    primary: 'gradient-primary',
  };

  const textColors = {
    default: 'text-foreground',
    inflow: 'text-inflow',
    outflow: 'text-outflow',
    deduction: 'text-deduction',
    primary: 'text-primary-foreground',
  };

  const subtitleColors = {
    default: 'text-muted-foreground',
    inflow: 'text-inflow/80',
    outflow: 'text-outflow/80',
    deduction: 'text-deduction/80',
    primary: 'text-primary-foreground/80',
  };

  const iconBgColors = {
    default: 'bg-secondary',
    inflow: 'bg-inflow/20',
    outflow: 'bg-outflow/20',
    deduction: 'bg-deduction/20',
    primary: 'bg-primary-foreground/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'rounded-2xl p-5 shadow-card transition-shadow hover:shadow-card-hover',
        variants[variant],
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn('text-sm font-medium', subtitleColors[variant])}>
          {title}
        </span>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            iconBgColors[variant]
          )}
        >
          {icon}
        </div>
      </div>
      <p className={cn('text-2xl font-bold', textColors[variant])}>{amount}</p>
    </motion.div>
  );
};

export default SummaryCard;
