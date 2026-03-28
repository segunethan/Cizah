import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { formatNaira } from '@/lib/format';
import { calculateTaxBreakdown, getRecordsForPeriod } from '@/lib/taxCalculations';
import { FinancialRecord } from '@/types/onyx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Shield,
  MapPin,
  Briefcase,
  Building2,
  Home,
  Car,
  CreditCard,
  IdCard,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getSignedUrl, extractFilePath } from '@/lib/storage';
import PAYEBreakdownDialog from '@/components/admin/PAYEBreakdownPopover';

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_record_number: string | null;
  created_at: string;
  updated_at: string;
  surname: string | null;
  first_name: string | null;
  other_name: string | null;
  preferred_name: string | null;
  prefix: string | null;
  date_of_birth: string | null;
  gender: string | null;
  occupation: string | null;
  state: string | null;
  lga: string | null;
  lcda: string | null;
  house_address: string | null;
  office_address: string | null;
  identity_type: string | null;
  identity_number: string | null;
  lassra_no: string | null;
  passport_photo_url: string | null;
  apartment_style: string | null;
  apartment_type: string | null;
  rent_amount: number | null;
  rent_agreement_url: string | null;
  rent_receipt_url: string | null;
  has_mortgage: boolean | null;
  num_banks: number | null;
  banks_list: string[] | null;
  num_cars: number | null;
  num_houses: number | null;
  onboarding_completed: boolean | null;
  bank_accounts_connected: boolean | null;
  selected_reliefs: string[] | null;
  tax_period_preference: string | null;
}

interface TaxCalcRow {
  id: string;
  user_id: string;
  period_type: string;
  period_month: number | null;
  period_year: number;
  total_inflow: number;
  total_outflow: number;
  net_inflow: number;
  voluntary_gift: number;
  other_expenses: number;
  assessable_income: number;
  total_reliefs: number;
  chargeable_income: number;
  tax_payable: number;
  status: string;
  rejection_reason: string | null;
  rejection_evidence_url: string | null;
  user_rejection_reason: string | null;
  payment_reference: string | null;
  payment_date: string | null;
  filed_at: string | null;
  filed_by: string | null;
  created_at: string;
  updated_at: string;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DetailRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
    {Icon && (
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground">Not provided</span>}</p>
    </div>
  </div>
);

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'monthly' | 'annually'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('details');
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [taxCalculations, setTaxCalculations] = useState<TaxCalcRow[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [revisitingCalc, setRevisitingCalc] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId, navigate]);

  useEffect(() => {
    // Get signed URL for passport photo
    const getSignedPhoto = async () => {
      if (user?.passport_photo_url) {
        const filePath = extractFilePath(user.passport_photo_url, 'statements');
        if (filePath) {
          const signedUrl = await getSignedUrl('statements', filePath);
          setSignedPhotoUrl(signedUrl);
        } else {
          // If not a storage URL, use as-is
          setSignedPhotoUrl(user.passport_photo_url);
        }
      }
    };
    getSignedPhoto();
  }, [user?.passport_photo_url]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get_user_details', userId },
      });

      if (profileError) throw profileError;
      if (profileData.error) throw new Error(profileData.error);
      
      setUser(profileData.profile);

      // Fetch user's financial records
      const { data: recordsData, error: recordsError } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get_user_records', userId },
      });

      if (recordsError) throw recordsError;
      if (recordsData.error) throw new Error(recordsData.error);
      
      // Transform records to match FinancialRecord type
      const transformedRecords: FinancialRecord[] = (recordsData.records || []).map((r: any) => ({
        id: r.id,
        type: r.type as 'inflow' | 'outflow' | 'relief',
        category: r.category,
        amount: Number(r.amount),
        description: r.description || undefined,
        date: new Date(r.date),
        evidenceUrl: r.evidence_url || undefined,
      }));
      
      setRecords(transformedRecords);

      // Fetch user's tax calculations
      const { data: taxData, error: taxError } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get_user_tax_calculations', userId },
      });

      if (!taxError && !taxData?.error) {
        setTaxCalculations(taxData.calculations || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
      
      // Refresh tax calculations
      setTaxCalculations(prev => 
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

      toast.success('Revisit sent! The user will be notified to review their tax calculation.');
      
      setTaxCalculations(prev => 
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

  const filteredRecords = useMemo(() => {
    return getRecordsForPeriod(records, periodType, selectedYear, periodType === 'monthly' ? selectedMonth : undefined);
  }, [records, periodType, selectedYear, selectedMonth]);

  const taxBreakdown = useMemo(() => {
    return calculateTaxBreakdown(filteredRecords, periodType);
  }, [filteredRecords, periodType]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getApartmentTypeLabel = (type: string | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      tenant: 'Tenant',
      owner: 'Owner',
      mission: 'Mission',
      gift: 'Gift',
      family: 'Family',
    };
    return labels[type] || type;
  };

  const getApartmentStyleLabel = (style: string | null) => {
    if (!style) return null;
    const labels: Record<string, string> = {
      flat: 'Flat',
      bungalow: 'Bungalow',
      duplex: 'Duplex',
      studio: 'Studio',
      mini_flat: 'Mini Flat',
    };
    return labels[style] || style;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => navigate('/admin/users')}>Back to Users</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar currentPage="users" />
      
      {/* Main content with left margin for fixed sidebar on desktop */}
      <main className="lg:ml-64 pt-16 lg:pt-0 p-6 lg:p-8 min-h-screen overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>

          {/* User Header */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden border-2 border-white/30">
                  {signedPhotoUrl ? (
                    <img src={signedPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">
                      {user.prefix && `${user.prefix} `}{user.name}
                    </h1>
                    {user.onboarding_completed ? (
                      <Badge className="bg-white/20 text-white border-0">Onboarding Complete</Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/30 text-white">Onboarding Incomplete</Badge>
                    )}
                  </div>
                  <p className="text-lg font-mono text-amber-100 mt-1">{user.tax_record_number || 'No Tax ID'}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-amber-100">
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" /> {user.email}
                      </span>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" /> {user.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Joined {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{records.length}</p>
                    <p className="text-xs text-amber-100">Records</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{user.num_banks || 0}</p>
                    <p className="text-xs text-amber-100">Banks</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border border-border p-1 h-auto">
              <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 py-2.5">
                <User className="w-4 h-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="tax" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 py-2.5">
                <Calculator className="w-4 h-4 mr-2" />
                Tax Details
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label="Surname" value={user.surname} />
                    <DetailRow label="First Name" value={user.first_name} />
                    <DetailRow label="Other Names" value={user.other_name} />
                    <DetailRow label="Preferred Name" value={user.preferred_name} />
                    <DetailRow label="Prefix" value={user.prefix} />
                    <DetailRow label="Date of Birth" value={formatDate(user.date_of_birth)} />
                    <DetailRow label="Gender" value={user.gender} />
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Contact & Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label="Email" value={user.email} icon={Mail} />
                    <DetailRow label="Phone" value={user.phone} icon={Phone} />
                    <DetailRow label="House Address" value={user.house_address} />
                    <DetailRow label="Office Address" value={user.office_address} />
                    <DetailRow label="State" value={user.state} />
                    <DetailRow label="LGA" value={user.lga} />
                    <DetailRow label="LCDA" value={user.lcda} />
                  </CardContent>
                </Card>

                {/* Identity & Work */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <IdCard className="w-5 h-5 text-primary" />
                      Identity & Work
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label="Occupation" value={user.occupation} icon={Briefcase} />
                    <DetailRow label="Identity Type" value={user.identity_type} />
                    <DetailRow 
                      label={user.identity_type ? `${user.identity_type} Number` : 'Identity Number'} 
                      value={user.identity_number ? `****${user.identity_number.slice(-4)}` : null} 
                    />
                    <DetailRow label="LASSRA No" value={user.lassra_no} />
                    <DetailRow label="Tax Record Number" value={user.tax_record_number} />
                  </CardContent>
                </Card>

                {/* Housing Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="w-5 h-5 text-primary" />
                      Housing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label="Apartment Style" value={getApartmentStyleLabel(user.apartment_style)} />
                    <DetailRow label="Ownership Type" value={getApartmentTypeLabel(user.apartment_type)} />
                    {user.apartment_type === 'tenant' && (
                      <>
                        <DetailRow label="Annual Rent" value={user.rent_amount ? formatNaira(user.rent_amount) : null} />
                        <DetailRow label="Rent Agreement" value={user.rent_agreement_url ? '✓ Uploaded' : 'Not uploaded'} />
                        <DetailRow label="Rent Receipt" value={user.rent_receipt_url ? '✓ Uploaded' : 'Not uploaded'} />
                      </>
                    )}
                    {user.apartment_type === 'owner' && (
                      <DetailRow label="Has Mortgage" value={user.has_mortgage ? 'Yes' : 'No'} />
                    )}
                  </CardContent>
                </Card>

                {/* Financial & Assets */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Financial & Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow label="Number of Banks" value={user.num_banks?.toString()} icon={CreditCard} />
                    {user.banks_list && user.banks_list.length > 0 && (
                      <div className="py-3 border-b border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Banks Used</p>
                        <div className="flex flex-wrap gap-2">
                          {user.banks_list.map((bank) => (
                            <Badge key={bank} variant="secondary" className="text-xs">{bank}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <DetailRow label="Number of Cars" value={user.num_cars?.toString()} icon={Car} />
                    <DetailRow label="Number of Houses" value={user.num_houses?.toString()} icon={Home} />
                    <DetailRow label="Bank Accounts Connected" value={user.bank_accounts_connected ? 'Yes' : 'No'} />
                  </CardContent>
                </Card>

                {/* Tax Preferences */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      Tax Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DetailRow 
                      label="Payment Frequency" 
                      value={user.tax_period_preference === 'annually' ? 'Annual' : 'Monthly'} 
                    />
                    {user.selected_reliefs && user.selected_reliefs.length > 0 ? (
                      <div className="py-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Selected Reliefs</p>
                        <div className="flex flex-wrap gap-2">
                          {user.selected_reliefs.map((relief) => (
                            <Badge key={relief} className="bg-primary/10 text-primary border-0">{relief}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <DetailRow label="Selected Reliefs" value="None selected" />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tax Details Tab */}
            <TabsContent value="tax" className="space-y-6">
              {/* Tax Calculations Status - moved to top */}
              {taxCalculations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Tax Calculation History
                    </CardTitle>
                    <CardDescription>
                      User's tax calculations and payment status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {taxCalculations.map((calc) => (
                        <div
                          key={calc.id}
                          className="p-4 border border-border rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {calc.period_type === 'monthly' 
                                  ? `${months[calc.period_month ?? 0]} ${calc.period_year}`
                                  : `Year ${calc.period_year}`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created {new Date(calc.created_at).toLocaleDateString('en-NG')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(calc.status)}
                              <span className="font-bold text-amber-600">
                                {formatNaira(Number(calc.tax_payable))}
                              </span>
                            </div>
                          </div>

                          {/* Rejection reason */}
                          {calc.status === 'rejected' && calc.user_rejection_reason && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                              <p className="font-medium text-red-700 dark:text-red-300">User's rejection reason:</p>
                              <p className="text-red-600 dark:text-red-400">{calc.user_rejection_reason}</p>
                            </div>
                          )}

                          {/* Payment date */}
                          {calc.payment_date && (
                            <p className="text-xs text-muted-foreground">
                              Payment marked on: {new Date(calc.payment_date).toLocaleDateString('en-NG')}
                            </p>
                          )}

                          {/* Filed info */}
                          {calc.filed_at && (
                            <p className="text-xs text-muted-foreground">
                              Confirmed on: {new Date(calc.filed_at).toLocaleDateString('en-NG')}
                            </p>
                          )}

                          {/* Confirm Payment Button */}
                          {calc.status === 'paid' && (
                            <Button
                              onClick={() => handleConfirmPayment(calc.id)}
                              disabled={confirmingPayment === calc.id}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              {confirmingPayment === calc.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Confirm Payment Received
                            </Button>
                          )}

                          {/* Revisit Button for rejected calculations */}
                          {calc.status === 'rejected' && (
                            <Button
                              onClick={() => handleRevisit(calc.id)}
                              disabled={revisitingCalc === calc.id}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              {revisitingCalc === calc.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Clock className="w-4 h-4 mr-2" />
                              )}
                              Revisit
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Period Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Period Selection</CardTitle>
                  <CardDescription>Select the period to view financial records and tax calculations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'monthly' | 'annually')}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>

                    {periodType === 'monthly' && (
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, i) => (
                            <SelectItem key={month} value={i.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Inflow</p>
                        <p className="text-lg font-bold text-green-600">{formatNaira(taxBreakdown.totalInflow)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Outflow</p>
                        <p className="text-lg font-bold text-red-600">{formatNaira(taxBreakdown.totalOutflow)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Reliefs</p>
                        <p className="text-lg font-bold text-blue-600">{formatNaira(taxBreakdown.totalReliefs)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-100">Tax Payable</p>
                        <p className="text-lg font-bold">{formatNaira(taxBreakdown.taxPayable)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tax Calculation Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Tax Calculation Breakdown
                  </CardTitle>
                  <CardDescription>
                    {periodType === 'monthly' ? `${months[selectedMonth]} ${selectedYear}` : `Year ${selectedYear}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Total Inflow</span>
                      <span className="font-semibold text-green-600">{formatNaira(taxBreakdown.totalInflow)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Less: Total Outflow</span>
                      <span className="font-semibold text-red-600">({formatNaira(taxBreakdown.totalOutflow)})</span>
                    </div>
                    <div className="flex justify-between py-3 border-b bg-slate-50 dark:bg-slate-800/50 px-3 rounded-lg">
                      <span className="font-medium">Net Inflow</span>
                      <span className="font-semibold">{formatNaira(taxBreakdown.netInflow)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Add: Voluntary Gifts</span>
                      <span className="font-semibold text-green-600">{formatNaira(taxBreakdown.voluntaryGift)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Less: Other Expenses</span>
                      <span className="font-semibold text-red-600">({formatNaira(taxBreakdown.otherExpenses)})</span>
                    </div>
                    <div className="flex justify-between py-3 border-b bg-slate-50 dark:bg-slate-800/50 px-3 rounded-lg">
                      <span className="font-medium">Assessable Income</span>
                      <span className="font-semibold">{formatNaira(taxBreakdown.assessableIncome)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b">
                      <span className="text-muted-foreground">Less: Applicable Reliefs</span>
                      <span className="font-semibold text-blue-600">({formatNaira(taxBreakdown.totalReliefs)})</span>
                    </div>
                    <div className="flex justify-between py-3 border-b bg-slate-50 dark:bg-slate-800/50 px-3 rounded-lg">
                      <span className="font-medium">Chargeable Income</span>
                      <span className="font-semibold">{formatNaira(taxBreakdown.chargeableIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 bg-amber-50 dark:bg-amber-900/20 px-4 rounded-xl">
                      <span className="font-bold text-lg">Tax Payable (PAYE)</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-amber-600">{formatNaira(taxBreakdown.taxPayable)}</span>
                        <PAYEBreakdownDialog 
                          chargeableIncome={taxBreakdown.chargeableIncome} 
                          taxPayable={taxBreakdown.taxPayable}
                          periodType={periodType}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Records */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Records
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredRecords.length} records for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredRecords.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredRecords.slice(0, 20).map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${
                              record.type === 'inflow' ? 'bg-inflow' :
                              record.type === 'outflow' ? 'bg-outflow' : 'bg-deduction'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{record.category}</p>
                                {record.evidenceUrl && (
                                  <a 
                                    href={record.evidenceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Evidence
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(record.date).toLocaleDateString('en-NG')}
                                {record.description && ` • ${record.description}`}
                              </p>
                            </div>
                          </div>
                          <span className={`font-semibold ${
                            record.type === 'inflow' ? 'text-inflow' :
                            record.type === 'outflow' ? 'text-outflow' : 'text-deduction'
                          }`}>
                            {record.type === 'outflow' ? '-' : '+'}{formatNaira(record.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No records for the selected period</p>
                  )}
                </CardContent>
              </Card>

              {/* Tax Calculations section moved to top of tab */}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminUserDetail;
