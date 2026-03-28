import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, MapPin, Briefcase, CreditCard, Building, 
  Car, Home, ChevronRight, Edit2, Camera, LogOut, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import { useApp } from '@/contexts/AppContext';
import ProfileEditModal from '@/components/profile/ProfileEditModal';

interface ProfileData {
  id: string;
  name: string;
  surname: string | null;
  first_name: string | null;
  other_name: string | null;
  preferred_name: string | null;
  prefix: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  house_address: string | null;
  office_address: string | null;
  state: string | null;
  lga: string | null;
  lcda: string | null;
  occupation: string | null;
  identity_type: string | null;
  identity_number: string | null;
  lassra_no: string | null;
  passport_photo_url: string | null;
  num_banks: number | null;
  banks_list: string[] | null;
  num_cars: number | null;
  num_houses: number | null;
  bank_accounts_connected: boolean | null;
  onboarding_completed: boolean | null;
  apartment_style: string | null;
  apartment_type: string | null;
  rent_amount: number | null;
  has_mortgage: boolean | null;
}

type EditSection = 'personal' | 'contact' | 'address' | 'identity' | 'housing' | 'assets';

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, signOut } = useAuth();
  // useApp available if needed for shared state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<EditSection | null>(null);

  const fetchProfile = async () => {
    if (!authUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [authUser?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const handleEditSection = (section: EditSection) => {
    setEditSection(section);
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.surname) {
      return `${profile.first_name[0]}${profile.surname[0]}`.toUpperCase();
    }
    if (profile?.name) {
      return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (profile?.prefix && profile?.first_name && profile?.surname) {
      return `${profile.prefix} ${profile.first_name} ${profile.surname}`;
    }
    return profile?.name || 'User';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-6 pb-20 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="lg:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">Profile</h1>
              <Button variant="ghost" size="icon" className="invisible lg:hidden">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-4 -mt-16 pb-8 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                        <AvatarImage src={profile?.passport_photo_url || undefined} />
                        <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      {getDisplayName()}
                    </h2>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    {profile?.occupation && (
                      <Badge variant="secondary" className="mt-2">
                        {profile.occupation}
                      </Badge>
                    )}

                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Personal Information
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('personal')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Full Name" value={getDisplayName()} />
                  <Separator />
                  <InfoRow label="Preferred Name" value={profile?.preferred_name} />
                  <Separator />
                  <InfoRow label="Date of Birth" value={profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                  <Separator />
                  <InfoRow label="Gender" value={profile?.gender} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Contact Information
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('contact')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Email" value={profile?.email} />
                  <Separator />
                  <InfoRow label="Phone" value={profile?.phone} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Address Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Address Information
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('address')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="House Address" value={profile?.house_address} />
                  <Separator />
                  <InfoRow label="Office Address" value={profile?.office_address} />
                  <Separator />
                  <InfoRow label="State" value={profile?.state} />
                  <Separator />
                  <InfoRow label="LGA" value={profile?.lga} />
                  <Separator />
                  <InfoRow label="LCDA" value={profile?.lcda} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Identity & Work */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Identity & Work
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('identity')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Occupation" value={profile?.occupation} />
                  <Separator />
                  <InfoRow label="Identity Type" value={profile?.identity_type} />
                  <Separator />
                  <InfoRow label="Identity Number" value={profile?.identity_number ? `****${profile.identity_number.slice(-4)}` : null} />
                  {profile?.lassra_no && (
                    <>
                      <Separator />
                      <InfoRow label="LASSRA No" value={profile.lassra_no} />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Housing Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Home className="w-4 h-4 text-primary" />
                      Housing Information
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('housing')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Apartment Style" value={profile?.apartment_style ? profile.apartment_style.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) : null} />
                  <Separator />
                  <InfoRow label="Ownership Type" value={profile?.apartment_type ? profile.apartment_type.replace(/^\w/, c => c.toUpperCase()) : null} />
                  {profile?.apartment_type === 'tenant' && (
                    <>
                      <Separator />
                      <InfoRow label="Annual Rent" value={profile?.rent_amount ? `₦${profile.rent_amount.toLocaleString()}` : null} />
                    </>
                  )}
                  {profile?.apartment_type === 'owner' && (
                    <>
                      <Separator />
                      <InfoRow label="Has Mortgage" value={profile?.has_mortgage ? 'Yes' : 'No'} />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Assets & Banking */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Assets & Banking
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditSection('assets')}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-secondary/50 rounded-xl">
                      <Building className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{profile?.num_banks || 0}</p>
                      <p className="text-xs text-muted-foreground">Banks</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/50 rounded-xl">
                      <Car className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{profile?.num_cars || 0}</p>
                      <p className="text-xs text-muted-foreground">Cars</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/50 rounded-xl">
                      <Home className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{profile?.num_houses || 0}</p>
                      <p className="text-xs text-muted-foreground">Houses</p>
                    </div>
                  </div>
                  
                  {profile?.banks_list && profile.banks_list.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Connected Banks</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.banks_list.map((bank, index) => (
                            <Badge key={index} variant="secondary">
                              {bank}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="shadow-card">
                <CardContent className="py-2">
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center justify-between py-3 text-foreground hover:text-primary transition-colors"
                  >
                    <span className="font-medium">Settings</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <Separator />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between py-3 text-outflow hover:text-outflow/80 transition-colors"
                  >
                    <span className="font-medium flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Edit Modal */}
      <ProfileEditModal
        isOpen={!!editSection}
        onClose={() => setEditSection(null)}
        section={editSection || 'personal'}
        profile={profile}
        onSave={fetchProfile}
      />
    </MainLayout>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">
      {value || <span className="text-muted-foreground/50">Not set</span>}
    </span>
  </div>
);

export default Profile;
