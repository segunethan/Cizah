import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatNaira } from '@/lib/format';
import { TAX_BANDS_ANNUAL, TAX_BANDS_MONTHLY, TAX_EXEMPTION } from '@/types/onyx';
import { Info, ChevronRight, Minus, Equal } from 'lucide-react';

interface PAYEBreakdownDialogProps {
  chargeableIncome: number;
  taxPayable: number;
  periodType?: 'monthly' | 'annually';
}

interface BandBreakdown {
  bandMin: number;
  bandMax: number;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

const calculateBandBreakdown = (
  chargeableIncome: number,
  periodType: 'monthly' | 'annually'
): { breakdown: BandBreakdown[]; taxableIncome: number; exemption: number } => {
  const exemption = periodType === 'annually' ? TAX_EXEMPTION.annual : TAX_EXEMPTION.monthly;
  const bands = periodType === 'annually' ? TAX_BANDS_ANNUAL : TAX_BANDS_MONTHLY;
  
  // Subtract exemption
  const taxableIncome = Math.max(0, chargeableIncome - exemption);
  
  if (taxableIncome <= 0) {
    return { breakdown: [], taxableIncome: 0, exemption };
  }
  
  const breakdown: BandBreakdown[] = [];
  let remainingIncome = taxableIncome;
  
  for (const band of bands) {
    if (remainingIncome <= 0) break;
    
    const bandWidth = band.max === Infinity ? remainingIncome : band.max - band.min;
    const taxableInBand = Math.min(remainingIncome, bandWidth);
    const taxInBand = taxableInBand * band.rate;
    
    breakdown.push({
      bandMin: band.min,
      bandMax: band.max,
      rate: band.rate,
      taxableAmount: taxableInBand,
      taxAmount: Math.round(taxInBand * 100) / 100,
    });
    
    remainingIncome -= taxableInBand;
  }
  
  return { breakdown, taxableIncome, exemption };
};

const formatBandRange = (min: number, max: number): string => {
  if (max === Infinity) {
    return `Above ${formatNaira(min)}`;
  }
  return `${formatNaira(min)} - ${formatNaira(max)}`;
};

const PAYEBreakdownDialog = ({ 
  chargeableIncome, 
  taxPayable,
  periodType = 'annually'
}: PAYEBreakdownDialogProps) => {
  const [open, setOpen] = useState(false);
  const { breakdown, taxableIncome, exemption } = calculateBandBreakdown(chargeableIncome, periodType);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Info className="w-3.5 h-3.5" />
        View details
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              PAYE Tax Calculation
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown based on Nigerian PAYE tax bands ({periodType === 'monthly' ? 'Monthly' : 'Annual'})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Step 1: Chargeable Income */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 1: Calculate Taxable Income</p>
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Chargeable Income</span>
                  <span className="font-semibold">{formatNaira(chargeableIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    Tax Exemption ({periodType === 'monthly' ? 'Monthly' : 'Annual'})
                  </span>
                  <span className="font-semibold">- {formatNaira(exemption)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Equal className="w-3 h-3" />
                    Taxable Income
                  </span>
                  <span className="font-bold text-primary">{formatNaira(taxableIncome)}</span>
                </div>
              </div>
            </div>
            
            {/* Step 2: Tax Bands Breakdown */}
            {breakdown.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 2: Apply Tax Bands</p>
                <div className="space-y-2">
                  {breakdown.map((band, index) => (
                    <div key={index} className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Band {index + 1}: {formatBandRange(band.bandMin, band.bandMax)}
                        </span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {(band.rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground">{formatNaira(band.taxableAmount)}</span>
                        <span className="mx-2 text-muted-foreground">×</span>
                        <span className="text-muted-foreground">{(band.rate * 100).toFixed(0)}%</span>
                        <ChevronRight className="w-3 h-3 mx-2 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{formatNaira(band.taxAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : chargeableIncome > 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Income is below the tax exemption threshold. No tax is payable.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tax applicable (income is zero or negative)
              </p>
            )}
            
            {/* Total Tax */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Tax Payable</p>
              <div className="flex justify-between items-center bg-primary/10 px-4 py-3 rounded-lg">
                <span className="font-semibold">
                  {breakdown.length > 0 && (
                    <span className="text-sm text-muted-foreground mr-2">
                      ({breakdown.map(b => formatNaira(b.taxAmount)).join(' + ')})
                    </span>
                  )}
                </span>
                <span className="font-bold text-lg text-primary">{formatNaira(taxPayable)}</span>
              </div>
            </div>

            {/* Summary Note */}
            <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Calculation Summary:</p>
              <p>1. Subtract {periodType === 'monthly' ? '₦66,666.67 (monthly)' : '₦800,000 (annual)'} exemption from chargeable income</p>
              <p>2. Apply progressive tax rates to the remaining taxable income</p>
              <p>3. Sum all band taxes to get total PAYE tax payable</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PAYEBreakdownDialog;
