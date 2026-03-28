import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { FinancialRecord, RecordType } from '@/types/claymoney';

interface DbFinancialRecord {
  id: string;
  user_id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  evidence_url: string | null;
}

// Transform database record to app record
const transformRecord = (dbRecord: DbFinancialRecord): FinancialRecord => ({
  id: dbRecord.id,
  type: dbRecord.type as RecordType,
  category: dbRecord.category,
  amount: Number(dbRecord.amount),
  description: dbRecord.description || undefined,
  date: new Date(dbRecord.date),
  evidenceUrl: dbRecord.evidence_url || undefined,
});

export const useFinancialRecords = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: records = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['financial-records', user?.id],
    queryFn: async (): Promise<FinancialRecord[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        throw error;
      }

      return (data || []).map(transformRecord);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addRecordMutation = useMutation({
    mutationFn: async (record: Omit<FinancialRecord, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const insertData = {
        user_id: user.id,
        type: record.type,
        category: record.category,
        amount: record.amount,
        description: record.description || null,
        date: record.date instanceof Date ? record.date.toISOString() : record.date,
        evidence_url: record.evidenceUrl || null,
      };

      console.log('Inserting financial record:', insertData);

      const { data, error } = await supabase
        .from('financial_records')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(error.message || 'Failed to insert record');
      }
      
      return transformRecord(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
    },
  });

  const addRecordsMutation = useMutation({
    mutationFn: async (recordsToAdd: Omit<FinancialRecord, 'id'>[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dbRecords = recordsToAdd.map((record) => ({
        user_id: user.id,
        type: record.type,
        category: record.category,
        amount: record.amount,
        description: record.description || null,
        date: record.date.toISOString(),
        evidence_url: record.evidenceUrl || null,
      }));

      const { data, error } = await supabase
        .from('financial_records')
        .insert(dbRecords)
        .select();

      if (error) throw error;
      return (data || []).map(transformRecord);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: async (record: FinancialRecord) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('financial_records')
        .update({
          type: record.type,
          category: record.category,
          amount: record.amount,
          description: record.description || null,
          date: record.date.toISOString(),
          evidence_url: record.evidenceUrl || null,
        })
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;
      return transformRecord(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
    },
  });

  return {
    records,
    isLoading,
    error,
    refetch,
    addRecord: addRecordMutation.mutateAsync,
    addRecords: addRecordsMutation.mutateAsync,
    deleteRecord: deleteRecordMutation.mutateAsync,
    updateRecord: updateRecordMutation.mutateAsync,
    isAdding: addRecordMutation.isPending || addRecordsMutation.isPending,
    isDeleting: deleteRecordMutation.isPending,
    isUpdating: updateRecordMutation.isPending,
  };
};
