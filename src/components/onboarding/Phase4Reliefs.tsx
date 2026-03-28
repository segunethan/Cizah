import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, ArrowLeft, FileText, Loader2, Calendar, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { RELIEF_CATEGORIES, TaxPeriodPreference } from '@/types/onyx';

interface Phase4ReliefsProps {
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

const Phase4Reliefs = ({ userId, onComplete, onBack }: Phase4ReliefsProps) => {
  const queryClient = useQueryClient();
  const [selectedReliefs, setSelectedReliefs] = useState<string[]>([]);
  const [taxPeriodPreference, setTaxPeriodPreference] = useState<TaxPeriodPreference>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReliefToggle = (relief: string) => {
    setSelectedReliefs(prev => 
      prev.includes(relief)
        ? prev.filter(r => r !== relief)
        : [...prev, relief]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          selected_reliefs: selectedReliefs,
          tax_period_preference: taxPeriodPreference,
          onboarding_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;

      // Invalidate profile cache so dashboard doesn't show the incomplete banner
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      toast({
        title: 'Setup Complete!',
        description: 'Your relief preferences have been saved.',
      });

      onComplete();
    } catch (error: any) {
      console.error('Error saving reliefs:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mobile Logo */}
      <div className="flex items-center gap-3 mb-6 lg:hidden">
        <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
          <Wallet className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-foreground">Ciza</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tax Preferences</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Select your tax payment frequency and the reliefs that apply to you.
      </p>

      {/* Tax Period Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Tax Payment Frequency</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose whether you want to pay your taxes monthly or annually.
        </p>
        <RadioGroup
          value={taxPeriodPreference}
          onValueChange={(value) => setTaxPeriodPreference(value as TaxPeriodPreference)}
          className="grid grid-cols-2 gap-4"
        >
          <div
            onClick={() => setTaxPeriodPreference('monthly')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxPeriodPreference === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-secondary/30 hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              taxPeriodPreference === 'monthly' ? 'gradient-primary' : 'bg-secondary'
            }`}>
              <Calendar className={`w-6 h-6 ${taxPeriodPreference === 'monthly' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <Label htmlFor="monthly" className="cursor-pointer text-sm font-semibold text-foreground">
                Monthly
              </Label>
              <p className="text-xs text-muted-foreground">Pay taxes each month</p>
            </div>
          </div>

          <div
            onClick={() => setTaxPeriodPreference('annually')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxPeriodPreference === 'annually'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-secondary/30 hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value="annually" id="annually" className="sr-only" />
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              taxPeriodPreference === 'annually' ? 'gradient-primary' : 'bg-secondary'
            }`}>
              <CalendarDays className={`w-6 h-6 ${taxPeriodPreference === 'annually' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <Label htmlFor="annually" className="cursor-pointer text-sm font-semibold text-foreground">
                Annually
              </Label>
              <p className="text-xs text-muted-foreground">Pay taxes once a year</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Reliefs Section */}
      <h2 className="text-lg font-semibold text-foreground mb-3">Tax Reliefs</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Select the tax reliefs that apply to you. These will appear as categories when adding relief records.
      </p>

      <div className="space-y-3 mb-8">
        {RELIEF_CATEGORIES.map((relief) => (
          <div
            key={relief}
            onClick={() => handleReliefToggle(relief)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedReliefs.includes(relief)
                ? 'border-primary bg-primary/5'
                : 'border-border bg-secondary/30 hover:border-primary/50'
            }`}
          >
            <Checkbox
              id={relief}
              checked={selectedReliefs.includes(relief)}
              onCheckedChange={() => handleReliefToggle(relief)}
              className="h-5 w-5"
            />
            <Label
              htmlFor={relief}
              className="flex-1 cursor-pointer text-sm font-medium text-foreground"
            >
              {relief}
            </Label>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {selectedReliefs.length === 0 
          ? 'You can skip this step and add reliefs later from settings.'
          : `${selectedReliefs.length} relief${selectedReliefs.length > 1 ? 's' : ''} selected`
        }
      </p>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12 rounded-xl"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl gradient-primary hover:opacity-90 transition-opacity"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            selectedReliefs.length === 0 ? 'Skip & Finish' : 'Complete Setup'
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default Phase4Reliefs;
