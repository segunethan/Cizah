import { useState, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, RefreshCw, CheckCircle2, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailVerificationPendingProps {
  email: string;
  onVerified: (userId: string) => void;
  onBack: () => void;
}

const EmailVerificationPending = forwardRef<HTMLDivElement, EmailVerificationPendingProps>(
  ({ email, onVerified, onBack }, ref) => {
    const [resending, setResending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Cooldown timer for resend
    useEffect(() => {
      if (cooldown > 0) {
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => clearTimeout(timer);
      }
    }, [cooldown]);

    // Listen for auth state changes (when user clicks email link)
    useEffect(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth event in verification:', event, session?.user?.email_confirmed_at);
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.email_confirmed_at) {
            toast.success('Email verified successfully!');
            onVerified(session.user.id);
          }
        }
      );

      return () => subscription.unsubscribe();
    }, [onVerified]);

    const handleResendEmail = async () => {
      if (cooldown > 0) return;
      
      setResending(true);
      try {
        const redirectUrl = `${window.location.origin}/auth`;
        
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Verification email resent!');
          setCooldown(60); // 60 second cooldown
        }
      } catch (error: any) {
        toast.error('Failed to resend email');
      } finally {
        setResending(false);
      }
    };

    const handleCheckVerification = async () => {
      setChecking(true);
      try {
        // Force a session refresh from the server
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('Refresh error, trying getSession:', refreshError);
          // If refresh fails, try getting session directly
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            toast.error('Failed to check verification status');
            return;
          }

          if (currentSession?.user?.email_confirmed_at) {
            toast.success('Email verified!');
            onVerified(currentSession.user.id);
          } else {
            toast.info('Email not yet verified. Please check your inbox and click the verification link.');
          }
          return;
        }

        if (session?.user?.email_confirmed_at) {
          toast.success('Email verified!');
          onVerified(session.user.id);
        } else {
          toast.info('Email not yet verified. Please check your inbox and click the verification link.');
        }
      } catch (error) {
        console.error('Check verification error:', error);
        toast.error('Failed to check verification status');
      } finally {
        setChecking(false);
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full"
      >
        {/* Mobile Logo */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Ciza</span>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Check Your Email
          </h1>
          <p className="text-muted-foreground">
            We've sent a verification link to
          </p>
          <p className="font-semibold text-foreground mt-1">
            {email}
          </p>
        </div>

        <div className="bg-secondary/30 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Click the link in your email to verify your account and continue with onboarding.</p>
              <p>If you don't see the email, check your spam folder.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCheckVerification}
            className="w-full h-14 text-lg font-semibold rounded-xl gradient-primary hover:opacity-90 transition-opacity"
            disabled={checking}
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              "I've Verified My Email"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleResendEmail}
            className="w-full h-12 rounded-xl"
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Use a different email
          </button>
        </div>
      </motion.div>
    );
  }
);

EmailVerificationPending.displayName = 'EmailVerificationPending';

export default EmailVerificationPending;
