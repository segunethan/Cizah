import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Plus, Loader2, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { toast } from 'sonner';

interface AdminProfile {
  id: string;
  name: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export default function AdminTeam() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin');
  const [sending, setSending] = useState(false);

  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const isSuperAdmin = adminInfo.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminsRes, invitesRes] = await Promise.all([
        supabase.functions.invoke('admin-api', { body: { action: 'get_admins' } }),
        supabase.functions.invoke('admin-api', { body: { action: 'get_invitations' } }),
      ]);

      if (!adminsRes.error) setAdmins(adminsRes.data.admins || []);
      if (!invitesRes.error) setInvitations(invitesRes.data.invitations || []);
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'invite_admin', email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole },
      });

      if (error || data?.error) throw new Error(data?.error || 'Failed to send invite');

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar currentPage="team" />
      <main className="lg:ml-64 pt-16 lg:pt-0 p-6 lg:p-8 min-h-screen overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Team</h1>
            <p className="text-muted-foreground mt-1">Manage admin users and send invitations</p>
          </div>

          {/* Invite Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Invite Admin
              </CardTitle>
              <CardDescription>Send an invitation email to add a new admin user</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <Input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Full name (optional)"
                      disabled={sending}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="admin@example.com"
                      disabled={sending}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <div className="flex gap-3">
                    {(['admin', 'super_admin'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors ${
                          inviteRole === r
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {r === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  {sending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Admins */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Admins ({admins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {admin.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{admin.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={admin.role === 'super_admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const expired = new Date(inv.expires_at) < new Date();
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                        <div>
                          <p className="font-medium text-sm">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.name && `${inv.name} · `}
                            {inv.role === 'super_admin' ? 'Super Admin' : 'Admin'} ·
                            Invited {new Date(inv.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {inv.accepted_at ? (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <CheckCircle className="w-3 h-3 mr-1" />Accepted
                          </Badge>
                        ) : expired ? (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            <Clock className="w-3 h-3 mr-1" />Pending
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
