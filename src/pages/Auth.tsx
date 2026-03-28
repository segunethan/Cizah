import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import Phase1Signup from '@/components/onboarding/Phase1Signup';
import Phase2Profile from '@/components/onboarding/Phase2Profile';
import Phase3BankConnection from '@/components/onboarding/Phase3BankConnection';
import Phase4Reliefs from '@/components/onboarding/Phase4Reliefs';
import LoginForm from '@/components/onboarding/LoginForm';
import ForgotPasswordForm from '@/components/onboarding/ForgotPasswordForm';
import ResetPasswordForm from '@/components/onboarding/ResetPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';
type OnboardingPhase = 1 | 2 | 3 | 4;

const PHASES = [
  { number: 1, title: 'Account' },
  { number: 2, title: 'Profile' },
  { number: 3, title: 'Banks' },
  { number: 4, title: 'Reliefs' },
];

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, loading } = useAuth();
  // Read ?view=login or ?view=signup from the landing page CTAs
  const viewParam = searchParams.get('view') as AuthView | null;
  const [view, setView] = useState<AuthView>(viewParam === 'login' ? 'login' : 'signup');
  const [phase, setPhase] = useState<OnboardingPhase>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Check if user is resuming onboarding from dashboard banner
  const isResuming = searchParams.get('resume') === 'true';
  const isPasswordReset = searchParams.get('reset') === 'true';

  // If returning from password reset link, show reset form
  useEffect(() => {
    if (isPasswordReset && isAuthenticated) {
      setView('reset-password');
      setCheckingOnboarding(false);
    }
  }, [isPasswordReset, isAuthenticated]);

  // Check if user returned after email verification or needs to resume onboarding
  useEffect(() => {
    const checkUserStatus = async () => {
      if (loading) return;
      
      if (isAuthenticated && user && !isPasswordReset) {
        // User is authenticated, check if email is verified
        if (user.email_confirmed_at) {
          // Check if they're resuming onboarding
          if (isResuming) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('onboarding_completed, surname, first_name, occupation, identity_type, apartment_style, num_banks, selected_reliefs')
              .eq('id', user.id)
              .maybeSingle();
            
            if (profile?.onboarding_completed) {
              navigate('/dashboard');
            } else {
              setUserId(user.id);
              
              if (!profile || !profile.surname || !profile.first_name || !profile.occupation || !profile.identity_type || !profile.apartment_style) {
                setPhase(2);
              } else if (profile.num_banks === null || profile.num_banks === undefined) {
                setPhase(3);
              } else if (!profile.selected_reliefs || profile.selected_reliefs.length === 0) {
                setPhase(4);
              } else {
                setPhase(4);
              }
            }
          } else {
            navigate('/dashboard');
          }
        }
      }
      setCheckingOnboarding(false);
    };

    checkUserStatus();
  }, [isAuthenticated, user, loading, navigate, isResuming, isPasswordReset]);

  // Show loading while checking
  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handlePhase1Complete = (newUserId: string) => {
    setUserId(newUserId);
    setPhase(2);
  };

  const handlePhase2Complete = () => {
    setPhase(3);
  };

  const handlePhase3Complete = () => {
    setPhase(4);
  };

  const handlePhase3Skip = () => {
    setPhase(4);
  };

  const handlePhase4Complete = () => {
    navigate('/dashboard');
  };

  const handlePhase4Back = () => {
    setPhase(3);
  };

  const handleLoginSuccess = (loginUserId: string, needsOnboarding: boolean) => {
    if (needsOnboarding) {
      setUserId(loginUserId);
      setPhase(2);
    } else {
      navigate('/dashboard');
    }
  };

  const handleBackToPhase1 = () => {
    setPhase(1);
    setUserId(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 lg:p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-inflow/10 rounded-full blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Ciza</span>
          </div>

          {/* Preview Cards */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 shadow-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground text-sm uppercase tracking-wide">Current Balance</span>
              </div>
              <p className="text-3xl font-bold text-primary">₦125,500</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="w-5 h-5 text-inflow" />
                  <span className="text-xs text-muted-foreground">Inflow</span>
                </div>
                <p className="text-lg font-semibold text-foreground">₦180,000</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="w-5 h-5 text-outflow" />
                  <span className="text-xs text-muted-foreground">Outflow</span>
                </div>
                <p className="text-lg font-semibold text-foreground">₦45,200</p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4"
            >
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Track your ministry finances</p>
                <p className="font-semibold text-foreground">Simple & Intuitive</p>
              </div>
            </motion.div>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Income Tracking', 'Expense Management', 'Bank Connection'].map((feature, i) => (
              <motion.span
                key={feature}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="px-4 py-2 bg-card rounded-full text-sm text-muted-foreground shadow-card"
              >
                {feature}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Show progress indicator for signup flow */}
          {view === 'signup' && userId && (
            <OnboardingProgress currentPhase={phase} phases={PHASES} />
          )}

          <AnimatePresence mode="wait">
            {view === 'forgot-password' ? (
              <ForgotPasswordForm
                key="forgot"
                onBack={() => setView('login')}
              />
            ) : view === 'reset-password' ? (
              <ResetPasswordForm
                key="reset"
                onComplete={() => {
                  setView('login');
                  navigate('/auth', { replace: true });
                }}
              />
            ) : view === 'login' ? (
              <LoginForm
                key="login"
                onSwitchToSignup={() => setView('signup')}
                onLoginSuccess={handleLoginSuccess}
                onForgotPassword={() => setView('forgot-password')}
              />
            ) : phase === 1 ? (
              <Phase1Signup
                key="phase1"
                onComplete={handlePhase1Complete}
                onSwitchToLogin={() => setView('login')}
              />
            ) : phase === 2 && userId ? (
              <Phase2Profile
                key="phase2"
                userId={userId}
                onComplete={handlePhase2Complete}
                onBack={handleBackToPhase1}
              />
            ) : phase === 3 && userId ? (
              <Phase3BankConnection
                key="phase3"
                userId={userId}
                onComplete={handlePhase3Complete}
                onSkip={handlePhase3Skip}
              />
            ) : phase === 4 && userId ? (
              <Phase4Reliefs
                key="phase4"
                userId={userId}
                onComplete={handlePhase4Complete}
                onBack={handlePhase4Back}
              />
            ) : null}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-8">
            © 2025 Ciza. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
