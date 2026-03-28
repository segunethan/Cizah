import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, CheckCircle2, Circle, Wallet, ArrowRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { bvnSchema, bankAccountSchema, validateInput } from '@/lib/validation';

interface Phase3BankConnectionProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface MockBank {
  id: string;
  name: string;
  accountNumber: string;
  accountType: string;
  selected: boolean;
}

const Phase3BankConnection = ({ userId, onComplete, onSkip }: Phase3BankConnectionProps) => {
  const [step, setStep] = useState<'intro' | 'bvn' | 'banks' | 'connecting'>('intro');
  const [bvn, setBvn] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [banks, setBanks] = useState<MockBank[]>([]);

  // Mock BVN verification and bank fetching
  const handleVerifyBVN = async () => {
    // Validate BVN format
    const bvnValidation = validateInput(bvnSchema, bvn);
    if (!bvnValidation.success) {
      toast.error('error' in bvnValidation ? bvnValidation.error : 'Invalid BVN');
      return;
    }

    setVerifying(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock banks data based on BVN
    const mockBanks: MockBank[] = [
      { id: '1', name: 'Access Bank', accountNumber: '0012345678', accountType: 'Savings', selected: true },
      { id: '2', name: 'GTBank', accountNumber: '0234567890', accountType: 'Current', selected: true },
      { id: '3', name: 'Zenith Bank', accountNumber: '2098765432', accountType: 'Savings', selected: false },
      { id: '4', name: 'UBA', accountNumber: '1234567890', accountType: 'Savings', selected: true },
    ];

    setBanks(mockBanks);
    setVerifying(false);
    setStep('banks');
    toast.success('BVN verified! We found your linked bank accounts.');
  };

  const MAX_SELECTED_BANKS = 4;

  const toggleBankSelection = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    
    // If trying to select and already at max, show toast
    if (!bank.selected) {
      const currentlySelected = banks.filter(b => b.selected).length;
      if (currentlySelected >= MAX_SELECTED_BANKS) {
        toast.error(`You can select a maximum of ${MAX_SELECTED_BANKS} banks`);
        return;
      }
    }
    
    setBanks(banks.map(b => 
      b.id === bankId ? { ...b, selected: !b.selected } : b
    ));
  };

  const selectAll = () => {
    // Only select up to MAX_SELECTED_BANKS
    let count = 0;
    setBanks(banks.map(bank => {
      if (count < MAX_SELECTED_BANKS) {
        count++;
        return { ...bank, selected: true };
      }
      return { ...bank, selected: false };
    }));
  };

  const handleConnectBanks = async () => {
    const selectedBanks = banks.filter(b => b.selected);
    if (selectedBanks.length === 0) {
      toast.error('Please select at least one bank');
      return;
    }

    setStep('connecting');
    setLoading(true);

    try {
      // Simulate connecting to banks
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate and prepare bank records
      const bankRecords = selectedBanks.map(bank => {
        // Validate each bank account
        const validation = validateInput(bankAccountSchema, {
          bank_name: bank.name,
          account_number: bank.accountNumber,
          account_type: bank.accountType,
        });
        
        if (!validation.success) {
          const errorMsg = 'error' in validation ? validation.error : 'Invalid bank data';
          throw new Error(`Invalid bank data: ${errorMsg}`);
        }
        
        return {
          user_id: userId,
          bank_name: validation.data.bank_name!,
          account_number: validation.data.account_number!,
          account_type: validation.data.account_type!,
          is_selected: true,
        };
      });

      const { error } = await supabase
        .from('connected_bank_accounts')
        .insert(bankRecords);

      if (error) throw error;

      // Update user profile
      await supabase
        .from('user_profiles')
        .update({ bank_accounts_connected: true })
        .eq('id', userId);

      toast.success(`${selectedBanks.length} bank account(s) connected successfully!`);
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect banks');
      setStep('banks');
    } finally {
      setLoading(false);
    }
  };

  const renderIntro = () => (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Building2 className="w-10 h-10 text-primary-foreground" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-3">
        Connect Your Bank Accounts
      </h2>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
        Securely connect your bank accounts using your BVN for faster verification and financial insights.
      </p>

      <div className="bg-secondary/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4 text-left">
          <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Your data is safe</h3>
            <p className="text-sm text-muted-foreground">
              We use bank-grade encryption to protect your information. We never store your login credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => setStep('bvn')}
          className="w-full h-14 text-lg font-semibold rounded-xl gradient-primary hover:opacity-90"
        >
          Connect with BVN
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full h-12 text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  const renderBVNInput = () => (
    <motion.div
      key="bvn"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Enter Your BVN</h2>
          <p className="text-sm text-muted-foreground">We'll fetch your linked banks</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Bank Verification Number (BVN)</Label>
          <Input
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="Enter 11-digit BVN"
            className="h-14 bg-secondary/50 border-0 rounded-xl text-center text-xl tracking-widest font-mono"
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground text-center">
            Your BVN is never stored and is only used for verification
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep('intro')}
            className="flex-1 h-14 rounded-xl"
            disabled={verifying}
          >
            Back
          </Button>
          <Button
            onClick={handleVerifyBVN}
            className="flex-1 h-14 rounded-xl gradient-primary hover:opacity-90"
            disabled={bvn.length !== 11 || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify BVN'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderBankSelection = () => (
    <motion.div
      key="banks"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Select Banks to Connect</h2>
          <p className="text-sm text-muted-foreground">
            {banks.filter(b => b.selected).length} of {banks.length} selected (max {MAX_SELECTED_BANKS})
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={selectAll} className="text-primary">
          Select All
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {banks.map((bank) => (
          <motion.button
            key={bank.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => toggleBankSelection(bank.id)}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all duration-200",
              bank.selected
                ? "bg-primary/10 border-2 border-primary"
                : "bg-secondary/50 border-2 border-transparent hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                bank.selected ? "gradient-primary" : "bg-secondary"
              )}>
                <Building2 className={cn(
                  "w-6 h-6",
                  bank.selected ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{bank.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {bank.accountType} • ****{bank.accountNumber.slice(-4)}
                </p>
              </div>
              
              {bank.selected ? (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('bvn')}
          className="flex-1 h-14 rounded-xl"
        >
          Back
        </Button>
        <Button
          onClick={handleConnectBanks}
          className="flex-1 h-14 rounded-xl gradient-primary hover:opacity-90"
          disabled={banks.filter(b => b.selected).length === 0}
        >
          Connect {banks.filter(b => b.selected).length} Bank(s)
        </Button>
      </div>
    </motion.div>
  );

  const renderConnecting = () => (
    <motion.div
      key="connecting"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
        <Building2 className="w-10 h-10 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Connecting your banks...</h2>
      <p className="text-muted-foreground">This may take a few moments</p>
      <Loader2 className="w-8 h-8 animate-spin mx-auto mt-6 text-primary" />
    </motion.div>
  );

  return (
    <div className="w-full">
      {step === 'intro' && renderIntro()}
      {step === 'bvn' && renderBVNInput()}
      {step === 'banks' && renderBankSelection()}
      {step === 'connecting' && renderConnecting()}
    </div>
  );
};

export default Phase3BankConnection;
