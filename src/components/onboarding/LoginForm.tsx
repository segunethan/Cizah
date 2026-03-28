import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onLoginSuccess: (userId: string, needsOnboarding: boolean) => void;
  onForgotPassword: () => void;
}

const LoginForm = ({ onSwitchToSignup, onLoginSuccess, onForgotPassword }: LoginFormProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Login successful - always navigate to dashboard
        // Users with incomplete onboarding will see a banner there
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
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

      <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
        Welcome Back!
      </h1>
      <p className="text-muted-foreground mb-8">
        Sign in to continue managing your finances
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-primary hover:underline font-medium"
            disabled={loading}
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-semibold rounded-xl gradient-primary hover:opacity-90 transition-opacity"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Sign In'
          )}
        </Button>

      </form>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-primary font-semibold hover:underline"
            disabled={loading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginForm;
