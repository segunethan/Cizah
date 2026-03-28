import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatNaira } from '@/lib/format';
import { TaxCalculation } from '@/types/onyx';
import { TaxBreakdown } from '@/lib/taxCalculations';
import { useTaxCalculations } from '@/hooks/useTaxCalculations';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { sendEmail, formatTaxPeriod } from '@/lib/email';
import {
  Calculator,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Loader2,
  Building2,
  Copy,
  CreditCard,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';

interface TaxPayableCardProps {
  taxPayable: number;
  taxBreakdown: TaxBreakdown;
  pendingCalculation?: TaxCalculation;
}

// Company payment details (placeholder for future integration)
const PAYMENT_DETAILS = {
  bankName: 'First Bank of Nigeria',
  accountName: 'Lagos State Internal Revenue Service',
  accountNumber: '2000000001',
  sortCode: '011',
};

const TaxPayableCard = ({ taxPayable, taxBreakdown, pendingCalculation }: TaxPayableCardProps) => {
  const { user } = useAuth();
  const { selectedMonth, selectedYear } = useApp();
  const { taxPeriodPreference } = useUserProfile();
  const { createTaxCalculation, isCreating, updateTaxStatus, isUpdating, getCalculationForPeriod } = useTaxCalculations();
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPaymentAdvice, setShowPaymentAdvice] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const periodType = taxPeriodPreference || 'monthly';

  // Find existing calculation for the selected period - ALWAYS match by month
  const existingCalculation = useMemo(() => {
    return getCalculationForPeriod(selectedMonth, selectedYear);
  }, [getCalculationForPeriod, selectedMonth, selectedYear]);

  // Use existing calculation or pending prop
  const activeCalculation = existingCalculation || pendingCalculation;

  const handleApprove = async () => {
    try {
      if (activeCalculation) {
        // If there's already a calculation, just update status
        updateTaxStatus({
          calculationId: activeCalculation.id,
          status: 'approved',
        });
      } else {
        // Create a new tax calculation - ALWAYS store with the specific month
        await createTaxCalculation({
          periodType,
          periodMonth: selectedMonth,
          periodYear: selectedYear,
          totalInflow: taxBreakdown.totalInflow,
          totalOutflow: taxBreakdown.totalOutflow,
          netInflow: taxBreakdown.netInflow,
          voluntaryGift: taxBreakdown.voluntaryGift,
          otherExpenses: taxBreakdown.otherExpenses,
          assessableIncome: taxBreakdown.assessableIncome,
          totalReliefs: taxBreakdown.totalReliefs,
          chargeableIncome: taxBreakdown.chargeableIncome,
          taxPayable: taxBreakdown.taxPayable,
          status: 'approved',
        });
      }
      toast.success('Tax calculation approved! View payment details.');
      setShowPaymentAdvice(true);
      // Send filing confirmation email
      if (user?.email) {
        sendEmail({
          type: 'tax_filing_confirmation',
          to: user.email,
          name: user.user_metadata?.name || user.email,
          period: formatTaxPeriod(selectedMonth, selectedYear, periodType),
          taxPayable: taxBreakdown.taxPayable,
          breakdown: {
            totalInflow: taxBreakdown.totalInflow,
            totalOutflow: taxBreakdown.totalOutflow,
            assessableIncome: taxBreakdown.assessableIncome,
            totalReliefs: taxBreakdown.totalReliefs,
            chargeableIncome: taxBreakdown.chargeableIncome,
          },
        });
      }
    } catch (error) {
      console.error('Error approving tax:', error);
      toast.error('Failed to approve tax calculation');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      if (activeCalculation) {
        updateTaxStatus({
          calculationId: activeCalculation.id,
          status: 'rejected',
          userRejectionReason: rejectionReason.trim(),
        });
      } else {
        // Create a rejected calculation - ALWAYS store with the specific month
        await createTaxCalculation({
          periodType,
          periodMonth: selectedMonth,
          periodYear: selectedYear,
          totalInflow: taxBreakdown.totalInflow,
          totalOutflow: taxBreakdown.totalOutflow,
          netInflow: taxBreakdown.netInflow,
          voluntaryGift: taxBreakdown.voluntaryGift,
          otherExpenses: taxBreakdown.otherExpenses,
          assessableIncome: taxBreakdown.assessableIncome,
          totalReliefs: taxBreakdown.totalReliefs,
          chargeableIncome: taxBreakdown.chargeableIncome,
          taxPayable: taxBreakdown.taxPayable,
          status: 'approved',
        });
      }
      toast.success('Tax calculation rejected. Admin will review your concerns.');
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting tax:', error);
      toast.error('Failed to reject tax calculation');
    }
  };

  const handleMarkAsPaid = () => {
    if (activeCalculation) {
      updateTaxStatus({
        calculationId: activeCalculation.id,
        status: 'paid',
      });
      toast.success('Payment marked! Admin will confirm your payment.');
      setShowPaymentAdvice(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusInfo = () => {
    if (!activeCalculation) {
      return { 
        icon: Calculator, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        label: 'Estimated Tax' 
      };
    }

    switch (activeCalculation.status) {
      case 'pending':
        return { 
          icon: Clock, 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          label: 'Pending Your Review' 
        };
      case 'approved':
        return { 
          icon: CheckCircle, 
          color: 'text-green-600', 
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          label: 'Estimate Accepted - Make Payment' 
        };
      case 'rejected':
        return { 
          icon: XCircle, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          label: 'Rejected - Under Review' 
        };
      case 'revisit':
        return { 
          icon: Calculator, 
          color: 'text-orange-600', 
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          label: 'Tax Calculation Revised — Please Review' 
        };
      case 'paid':
        return { 
          icon: CreditCard, 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          label: 'Payment Made - Awaiting Confirmation' 
        };
      case 'filed':
        return { 
          icon: BadgeCheck, 
          color: 'text-primary', 
          bgColor: 'bg-primary/10',
          label: 'Payment Confirmed ✓' 
        };
      default:
        return { 
          icon: Calculator, 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          label: 'Tax Payable' 
        };
    }
  };

  // Determine if the selected period is a past month (selectedMonth is 0-indexed)
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed to match selectedMonth
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isEndOfMonth = now.getDate() >= daysInMonth - 2; // Last 3 days of month

  const isCurrentPeriod = selectedMonth === currentMonth && selectedYear === currentYear;
  const isPastPeriod = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);

  // Buttons are enabled only for past periods OR current period at end of month
  const isApproveRejectEnabled = isPastPeriod || (isCurrentPeriod && isEndOfMonth);

  // Determine if buttons should be shown
  const isCompleted = activeCalculation && ['paid', 'filed'].includes(activeCalculation.status);
  const isRejected = activeCalculation?.status === 'rejected';
  const isRevisit = activeCalculation?.status === 'revisit';
  const showApproveReject = !isCompleted && (!activeCalculation || activeCalculation.status === 'pending' || isRejected || isRevisit);
  const showViewPayment = activeCalculation?.status === 'approved';
  const showPaymentMadeStatus = activeCalculation?.status === 'paid';

  const status = getStatusInfo();
  const StatusIcon = status.icon;
  const isProcessing = isUpdating || isCreating;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-4"
      >
        <Card className={`${status.bgColor} border-0 ${isCompleted ? 'opacity-75' : ''}`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${isCompleted ? 'bg-primary' : 'bg-amber-500'} flex items-center justify-center`}>
                  <StatusIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                  <p className={`text-3xl font-bold ${isCompleted ? 'text-primary line-through' : 'text-amber-600'}`}>
                    {formatNaira(activeCalculation?.taxPayable ?? taxPayable)}
                  </p>
                </div>
              </div>

              {/* Approve/Reject buttons */}
              {showApproveReject && (
                <div className="flex flex-col gap-2">
                  {isRevisit && (
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400 text-center">
                      Tax calculation has been revised.
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={isProcessing || !isApproveRejectEnabled || isRejected}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isProcessing || !isApproveRejectEnabled || isRejected}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                  {!isApproveRejectEnabled && isCurrentPeriod && !isRejected && (
                    <p className="text-xs text-muted-foreground text-center">
                      Available from end of month
                    </p>
                  )}
                  {isRejected && (
                    <p className="text-xs text-muted-foreground text-center">
                      Awaiting admin review
                    </p>
                  )}
                </div>
              )}

              {/* View Payment Advice button */}
              {showViewPayment && (
                <Button 
                  onClick={() => setShowPaymentAdvice(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  View Payment Advice
                </Button>
              )}

              {/* Payment made - awaiting confirmation */}
              {showPaymentMadeStatus && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Awaiting admin confirmation
                  </span>
                </div>
              )}

              {/* Filed/Confirmed */}
              {activeCalculation?.status === 'filed' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <BadgeCheck className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Payment Confirmed
                  </span>
                </div>
              )}

              {/* Rejected status - show reason inline */}
              {(activeCalculation?.status === 'rejected' || activeCalculation?.status === 'revisit') && activeCalculation.userRejectionReason && (
                <div className="text-sm text-red-600 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
                  <p className="font-medium">Your reason:</p>
                  <p>{activeCalculation.userRejectionReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this estimated tax of{' '}
              <span className="font-bold">{formatNaira(activeCalculation?.taxPayable ?? taxPayable)}</span>?
              You will be directed to make payment after approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Yes, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Estimated Tax</DialogTitle>
            <DialogDescription>
              Please explain why you believe the estimated tax is incorrect. The admin will review your concerns.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rejection *</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you're rejecting this estimated tax..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Submit Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Advice Dialog */}
      <Dialog open={showPaymentAdvice} onOpenChange={setShowPaymentAdvice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Advice
            </DialogTitle>
            <DialogDescription>
              Make payment to the account below. Click "I've Made Payment" once done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Amount */}
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
              <p className="text-3xl font-bold text-primary">
                {formatNaira(activeCalculation?.taxPayable ?? taxPayable)}
              </p>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bank Name</p>
                    <p className="font-medium text-foreground">{PAYMENT_DETAILS.bankName}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium text-foreground">{PAYMENT_DETAILS.accountName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono font-bold text-foreground text-lg">{PAYMENT_DETAILS.accountNumber}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(PAYMENT_DETAILS.accountNumber, 'Account number')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Sort Code</p>
                  <p className="font-medium text-foreground">{PAYMENT_DETAILS.sortCode}</p>
                </div>
              </div>
            </div>

            {/* Future Integration Note */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Coming Soon:</strong> Direct payment via Paystack, Flutterwave, and Remita.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPaymentAdvice(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                I've Made Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaxPayableCard;
