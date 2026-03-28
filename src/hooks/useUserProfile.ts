import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserProfile, TaxPeriodPreference } from '@/types/onyx';

interface DbUserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  onboarding_completed: boolean | null;
  tax_period_preference: string | null;
  created_at: string;
  updated_at: string;
}

// Transform database profile to app profile
const transformProfile = (dbProfile: DbUserProfile): UserProfile & { onboardingCompleted: boolean; taxPeriodPreference: TaxPeriodPreference } => ({
  name: dbProfile.name,
  email: dbProfile.email || undefined,
  phone: dbProfile.phone || undefined,
  onboardingCompleted: dbProfile.onboarding_completed ?? false,
  taxPeriodPreference: (dbProfile.tax_period_preference as TaxPeriodPreference) || 'monthly',
});

export const useUserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<(UserProfile & { onboardingCompleted: boolean; taxPeriodPreference: TaxPeriodPreference }) | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data ? transformProfile(data) : null;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const profile = profileData ? { name: profileData.name, email: profileData.email, phone: profileData.phone } : null;
  const onboardingCompleted = profileData?.onboardingCompleted ?? false;
  const taxPeriodPreference = profileData?.taxPeriodPreference ?? 'monthly';

  const createProfileMutation = useMutation({
    mutationFn: async (profileData: UserProfile) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          name: profileData.name,
          email: profileData.email || null,
          phone: profileData.phone || null,
        })
        .select()
        .single();

      if (error) throw error;
      return transformProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updates: Record<string, unknown> = {};
      if (profileData.name !== undefined) updates.name = profileData.name;
      if (profileData.email !== undefined) updates.email = profileData.email || null;
      if (profileData.phone !== undefined) updates.phone = profileData.phone || null;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return transformProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  // Ensure profile exists (create if not)
  const ensureProfile = async (name: string, email?: string) => {
    if (!profile) {
      await createProfileMutation.mutateAsync({
        name,
        email,
      });
    }
  };

  return {
    profile,
    onboardingCompleted,
    taxPeriodPreference,
    isLoading,
    error,
    refetch,
    createProfile: createProfileMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    ensureProfile,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
  };
};
