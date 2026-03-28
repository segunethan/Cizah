import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/admin', { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'verify_admin' },
        });

        if (error || data?.error || !data?.admin) {
          await supabase.auth.signOut();
          navigate('/admin', { replace: true });
          return;
        }

        localStorage.setItem('adminInfo', JSON.stringify(data.admin));
        setAuthorized(true);
      } catch {
        navigate('/admin', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    verify();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
};

export default AdminProtectedRoute;
