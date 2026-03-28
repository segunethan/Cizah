import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-api', {
        body: { action: 'accept_invite', token, password, name: name.trim() },
      });

      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }

      setSuccess(true);
      toast.success('Account created! You can now sign in.');
      setTimeout(() => navigate('/admin'), 3000);
    } catch {
      setError('Failed to set up your account. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Cizah</span>
          <span className="ml-1 text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">Admin</span>
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-4">
            Join the admin<br />team
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
            You've been invited to help manage the Cizah tax platform. Set up your account to get started.
          </p>
        </div>

        <p className="text-muted-foreground/60 text-xs relative z-10">
          This portal is restricted to authorised tax officers only.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Cizah Admin</span>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Account created!</h1>
              <p className="text-muted-foreground text-sm">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Set up your account</h1>
              <p className="text-muted-foreground text-sm mb-8">Create a password to activate your admin account.</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    disabled={loading || !token}
                    className="w-full bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      disabled={loading || !token}
                      className="w-full bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 pr-11 text-sm h-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    disabled={loading || !token}
                    className="w-full bg-secondary/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm h-12"
                  />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="w-full gradient-primary disabled:opacity-50 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 h-14 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
