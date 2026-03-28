import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

export default function AdminLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already have a valid Supabase session, check if admin
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.functions.invoke('admin-api', {
        body: { action: 'verify_admin' },
      });
      if (data?.admin) navigate('/admin/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Sign in with Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('Invalid email or password');
        return;
      }

      // Verify admin role
      const { data, error: fnError } = await supabase.functions.invoke('admin-api', {
        body: { action: 'verify_admin' },
      });

      if (fnError || data?.error || !data?.admin) {
        // Not an admin — sign out
        await supabase.auth.signOut();
        setError('Access denied. This account does not have admin privileges.');
        return;
      }

      // Store admin info for UI use
      localStorage.setItem('adminInfo', JSON.stringify(data.admin));
      toast.success(`Welcome, ${data.admin.name || 'Admin'}`);
      navigate('/admin/dashboard');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <Logo size="md" />
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">Admin</span>
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-4">
            Tax officer<br />administration
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-10">
            Review tax filings, verify submissions, manage users, and confirm payments from one secure dashboard.
          </p>
          <div className="space-y-3">
            {[
              'Review submitted tax calculations',
              'Approve or flag filings for revisit',
              'Confirm payment and seal records',
              'Monitor all registered taxpayers',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                <span className="text-muted-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground/60 text-xs relative z-10">
          This portal is restricted to authorised tax officers only.
        </p>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Logo size="sm" />
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Admin sign in</h1>
          <p className="text-muted-foreground text-sm mb-8">Enter your credentials to access the admin panel.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
                autoComplete="email"
                className="w-full bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm transition-all h-12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 pr-11 text-sm transition-all h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary disabled:opacity-50 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition-all mt-2 flex items-center justify-center gap-2 hover:opacity-90 h-14"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in to admin panel'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-xs transition-colors">
              ← Back to user portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
