import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { FinancialRecord, UserProfile } from '@/types/onyx';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialRecords } from '@/hooks/useFinancialRecords';
import { useUserProfile } from '@/hooks/useUserProfile';

interface AppContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  records: FinancialRecord[];
  addRecord: (record: Omit<FinancialRecord, 'id'>) => Promise<void>;
  addRecords: (records: Omit<FinancialRecord, 'id'>[]) => Promise<void>;
  isOnboarded: boolean;
  completeOnboarding: (user: UserProfile) => Promise<void>;
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  isLoadingRecords: boolean;
  isDemoMode: false;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user: authUser } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    records,
    addRecord: addDbRecord,
    addRecords: addDbRecords,
    isLoading: isLoadingRecords,
  } = useFinancialRecords();

  const { profile, ensureProfile } = useUserProfile();

  const user: UserProfile | null = profile
    ? profile
    : authUser
    ? { name: authUser.user_metadata?.name || 'User', email: authUser.email }
    : null;

  const addRecord = useCallback(
    async (record: Omit<FinancialRecord, 'id'>) => {
      if (isAuthenticated) await addDbRecord(record);
    },
    [isAuthenticated, addDbRecord]
  );

  const addRecords = useCallback(
    async (recordsToAdd: Omit<FinancialRecord, 'id'>[]) => {
      if (isAuthenticated) await addDbRecords(recordsToAdd);
    },
    [isAuthenticated, addDbRecords]
  );

  const completeOnboarding = useCallback(
    async (userData: UserProfile) => {
      if (isAuthenticated && authUser) {
        try {
          await ensureProfile(userData.name, authUser.email || undefined);
        } catch (error) {
          console.error('Failed to create profile:', error);
        }
      }
    },
    [isAuthenticated, authUser, ensureProfile]
  );

  const setUser = useCallback((_userData: UserProfile | null) => {}, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        records,
        addRecord,
        addRecords,
        isOnboarded: !!profile,
        completeOnboarding,
        selectedMonth,
        selectedYear,
        setSelectedMonth,
        setSelectedYear,
        isLoadingRecords,
        isDemoMode: false,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
