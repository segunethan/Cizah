import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TaxCalculation } from '@/types/onyx';

export const useTaxCalculations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: taxCalculations = [], isLoading } = useQuery({
    queryKey: ['tax-calculations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tax_calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(calc => ({
        id: calc.id,
        userId: calc.user_id,
        periodType: calc.period_type as 'monthly' | 'annually',
        periodMonth: calc.period_month ?? undefined,
        periodYear: calc.period_year,
        totalInflow: Number(calc.total_inflow),
        totalOutflow: Number(calc.total_outflow),
        netInflow: Number(calc.net_inflow),
        voluntaryGift: Number(calc.voluntary_gift),
        otherExpenses: Number(calc.other_expenses),
        assessableIncome: Number(calc.assessable_income),
        totalReliefs: Number(calc.total_reliefs),
        chargeableIncome: Number(calc.chargeable_income),
        taxPayable: Number(calc.tax_payable),
        status: calc.status as TaxCalculation['status'],
        rejectionReason: calc.rejection_reason ?? undefined,
        rejectionEvidenceUrl: calc.rejection_evidence_url ?? undefined,
        userRejectionReason: (calc as any).user_rejection_reason ?? undefined,
        paymentReference: calc.payment_reference ?? undefined,
        paymentDate: calc.payment_date ? new Date(calc.payment_date) : undefined,
        filedAt: calc.filed_at ? new Date(calc.filed_at) : undefined,
        filedBy: calc.filed_by ?? undefined,
        createdAt: new Date(calc.created_at),
        updatedAt: new Date(calc.updated_at),
      })) as TaxCalculation[];
    },
    enabled: !!user?.id,
  });

  const createTaxCalculation = useMutation({
    mutationFn: async (params: {
      periodType: 'monthly' | 'annually';
      periodMonth?: number;
      periodYear: number;
      totalInflow: number;
      totalOutflow: number;
      netInflow: number;
      voluntaryGift: number;
      otherExpenses: number;
      assessableIncome: number;
      totalReliefs: number;
      chargeableIncome: number;
      taxPayable: number;
      status: 'approved';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tax_calculations')
        .insert({
          user_id: user.id,
          period_type: params.periodType,
          period_month: params.periodMonth ?? null,
          period_year: params.periodYear,
          total_inflow: params.totalInflow,
          total_outflow: params.totalOutflow,
          net_inflow: params.netInflow,
          voluntary_gift: params.voluntaryGift,
          other_expenses: params.otherExpenses,
          assessable_income: params.assessableIncome,
          total_reliefs: params.totalReliefs,
          chargeable_income: params.chargeableIncome,
          tax_payable: params.taxPayable,
          status: params.status,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-calculations', user?.id] });
    },
  });

  const updateTaxStatus = useMutation({
    mutationFn: async ({ 
      calculationId, 
      status, 
      rejectionReason,
      rejectionEvidenceUrl,
      userRejectionReason,
    }: { 
      calculationId: string; 
      status: 'approved' | 'rejected' | 'paid' | 'revisit';
      rejectionReason?: string;
      rejectionEvidenceUrl?: string;
      userRejectionReason?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === 'rejected') {
        if (userRejectionReason) {
          updateData.user_rejection_reason = userRejectionReason;
        } else {
          updateData.rejection_reason = rejectionReason;
          updateData.rejection_evidence_url = rejectionEvidenceUrl;
        }
      }
      
      if (status === 'paid') {
        updateData.payment_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('tax_calculations')
        .update(updateData)
        .eq('id', calculationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-calculations', user?.id] });
    },
  });

  // Get the active calculation for a specific month+year - always match by month
  const getCalculationForPeriod = (month: number, year: number) => {
    return taxCalculations.find(calc => {
      return calc.periodMonth === month && calc.periodYear === year;
    });
  };

  // Get the most recent pending tax calculation
  const pendingTaxCalculation = taxCalculations.find(calc => calc.status === 'pending');

  return {
    taxCalculations,
    pendingTaxCalculation,
    getCalculationForPeriod,
    isLoading,
    createTaxCalculation: createTaxCalculation.mutateAsync,
    isCreating: createTaxCalculation.isPending,
    updateTaxStatus: updateTaxStatus.mutate,
    isUpdating: updateTaxStatus.isPending,
  };
};
