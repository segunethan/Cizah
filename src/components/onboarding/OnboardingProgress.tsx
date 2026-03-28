import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentPhase: 1 | 2 | 3 | 4;
  phases: { number: number; title: string }[];
}

const OnboardingProgress = ({ currentPhase, phases }: OnboardingProgressProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {phases.map((phase, index) => (
        <div key={phase.number} className="flex items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
              currentPhase > phase.number
                ? "gradient-primary text-primary-foreground"
                : currentPhase === phase.number
                ? "gradient-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {currentPhase > phase.number ? (
              <Check className="w-5 h-5" />
            ) : (
              phase.number
            )}
          </motion.div>
          
          {index < phases.length - 1 && (
            <div
              className={cn(
                "w-12 h-1 mx-2 rounded-full transition-all duration-300",
                currentPhase > phase.number
                  ? "bg-primary"
                  : "bg-secondary"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default OnboardingProgress;
