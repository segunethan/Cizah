import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatNaira } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { toast } from 'sonner';

interface DashboardMetrics {
  totalUsers: number;
  totalRecords: number;
  totalInflow: number;
  totalOutflow: number;
  totalTaxPayable: number;
  pendingApprovals: number;
  approvedCalculations: number;
  rejectedCalculations: number;
}

interface TaxActivity {
  id: string;
  user_id: string;
  period_type: string;
  period_month: number | null;
  period_year: number;
  tax_payable: number;
  status: string;
  user_rejection_reason: string | null;
  rejection_reason: string | null;
  payment_date: string | null;
  filed_at: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string | null;
  user_tax_record: string | null;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    totalRecords: 0,
    totalInflow: 0,
    totalOutflow: 0,
    totalTaxPayable: 0,
    pendingApprovals: 0,
    approvedCalculations: 0,
    rejectedCalculations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [taxActivity, setTaxActivity] = useState<TaxActivity[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [revisitingCalc, setRevisitingCalc] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [navigate]);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, usersRes, activityRes] = await Promise.all([
        supabase.functions.invoke('admin-api', {
          body: { action: 'get_metrics' },
        }),
        supabase.functions.invoke('admin-api', {
          body: { action: 'get_users' },
        }),
        supabase.functions.invoke('admin-api', {
          body: { action: 'get_tax_activity' },
        }),
      ]);

      if (!metricsRes.error && !metricsRes.data?.error) {
        setMetrics(metricsRes.data);
      }
      if (!usersRes.error && !usersRes.data?.error) {
        setRecentUsers(usersRes.data.users?.slice(0, 5) || []);
      }
      if (!activityRes.error && !activityRes.data?.error) {
        setTaxActivity(activityRes.data.activity || []);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (calculationId: string) => {
    try {
      setConfirmingPayment(calculationId);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'confirm_payment', calculationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Payment confirmed successfully!');
      
      setTaxActivity(prev => 
        prev.map(calc => 
          calc.id === calculationId 
            ? { ...calc, status: 'filed', filed_at: new Date().toISOString() } 
            : calc
        )
      );
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment');
    } finally {
      setConfirmingPayment(null);
    }
  };

  const handleRevisit = async (calculationId: string) => {
    try {
      setRevisitingCalc(calculationId);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'revisit_rejection', calculationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Revisit sent! User will be notified.');
      
      setTaxActivity(prev => 
        prev.map(calc => 
          calc.id === calculationId 
            ? { ...calc, status: 'revisit' } 
            : calc
        )
      );
    } catch (error) {
      console.error('Error sending revisit:', error);
      toast.error('Failed to send revisit');
    } finally {
      setRevisitingCalc(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminInfo');
    navigate('/admin');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'revisit': return <Badge className="bg-orange-100 text-orange-700 border-0"><Clock className="w-3 h-3 mr-1" />Revisit Sent</Badge>;
      case 'paid': return <Badge className="bg-blue-100 text-blue-700 border-0"><CreditCard className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'filed': return <Badge className="bg-primary/10 text-primary border-0"><BadgeCheck className="w-3 h-3 mr-1" />Confirmed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const paidActivity = taxActivity.filter(a => a.status === 'paid');
  const rejectedActivity = taxActivity.filter(a => a.status === 'rejected');
  const approvedActivity = taxActivity.filter(a => a.status === 'approved');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar currentPage="dashboard" />
      
      <main className="lg:ml-64 pt-16 lg:pt-0 p-6 lg:p-8 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Overview of tax management and user activity
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="hidden lg:flex"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Users</p>
                      <p className="text-3xl font-bold mt-1">{metrics.totalUsers}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">Total Records</p>
                      <p className="text-3xl font-bold mt-1">{metrics.totalRecords}</p>
                    </div>
                    <FileText className="w-10 h-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm">Total Inflow</p>
                      <p className="text-2xl font-bold mt-1">{formatNaira(metrics.totalInflow)}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-violet-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Total Tax Payable</p>
                      <p className="text-2xl font-bold mt-1">{formatNaira(metrics.totalTaxPayable)}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    <p className="text-2xl font-bold">{metrics.pendingApprovals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">{metrics.approvedCalculations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{metrics.rejectedCalculations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tax Activity - Payments Awaiting Confirmation */}
          {paidActivity.length > 0 && (
            <Card className="mb-8 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <CreditCard className="w-5 h-5" />
                  Payments Awaiting Confirmation ({paidActivity.length})
                </CardTitle>
                <CardDescription>Users who have marked their tax as paid — confirm once payment is received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paidActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 gap-3"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{item.user_name}</p>
                            {item.user_tax_record && (
                              <span className="font-mono text-xs text-amber-600">{item.user_tax_record}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.period_type === 'monthly'
                              ? `${months[item.period_month ?? 0]} ${item.period_year}`
                              : `Year ${item.period_year}`}
                            {item.payment_date && ` • Paid on ${new Date(item.payment_date).toLocaleDateString('en-NG')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-amber-600">{formatNaira(Number(item.tax_payable))}</span>
                        <Button
                          size="sm"
                          onClick={() => handleConfirmPayment(item.id)}
                          disabled={confirmingPayment === item.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {confirmingPayment === item.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/users/${item.user_id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Activity - Rejections */}
          {rejectedActivity.length > 0 && (
            <Card className="mb-8 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="w-5 h-5" />
                  User Rejections ({rejectedActivity.length})
                </CardTitle>
                <CardDescription>Users who have rejected their estimated tax calculation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rejectedActivity.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{item.user_name}</p>
                              {item.user_tax_record && (
                                <span className="font-mono text-xs text-amber-600">{item.user_tax_record}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.period_type === 'monthly'
                                ? `${months[item.period_month ?? 0]} ${item.period_year}`
                                : `Year ${item.period_year}`}
                              {' • '}{formatNaira(Number(item.tax_payable))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRevisit(item.id)}
                            disabled={revisitingCalc === item.id || item.status === 'revisit'}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            {revisitingCalc === item.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4 mr-1" />
                            )}
                            {item.status === 'revisit' ? 'Revisit Sent' : 'Revisit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/users/${item.user_id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                      {item.user_rejection_reason && (
                        <div className="ml-14 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-sm">
                          <p className="font-medium text-red-700 dark:text-red-300 text-xs">Reason:</p>
                          <p className="text-red-600 dark:text-red-400">{item.user_rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Activity - Recently Approved (awaiting user payment) */}
          {approvedActivity.length > 0 && (
            <Card className="mb-8 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  Approved — Awaiting Payment ({approvedActivity.length})
                </CardTitle>
                <CardDescription>Users who approved their estimate but haven't paid yet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {approvedActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 gap-3"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{item.user_name}</p>
                            {item.user_tax_record && (
                              <span className="font-mono text-xs text-amber-600">{item.user_tax_record}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.period_type === 'monthly'
                              ? `${months[item.period_month ?? 0]} ${item.period_year}`
                              : `Year ${item.period_year}`}
                            {' • '}{formatNaira(Number(item.tax_payable))}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/users/${item.user_id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Registrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-amber-600">
                          {user.tax_record_number || 'No ID'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users registered yet</p>
                </div>
              )}
              
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/admin/users')}
              >
                View All Users
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
