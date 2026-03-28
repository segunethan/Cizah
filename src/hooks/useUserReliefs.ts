import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserReliefs = () => {
  const { user, isAuthenticated } = useAuth();

  const { data: selectedReliefs = [], isLoading } = useQuery({
    queryKey: ['user-reliefs', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('selected_reliefs')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user reliefs:', error);
        return [];
      }

      return data?.selected_reliefs || [];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return { selectedReliefs, isLoading };
};
