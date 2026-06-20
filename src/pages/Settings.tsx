import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Check, Loader2, User, Briefcase, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import { RELIEF_CATEGORIES, TaxpayerProfile, TAXPAYER_PROFILES } from '@/types/onyx';
import { useQueryClient } from '@tanstack/react-query';

const PROFILE_ICONS: Record<TaxpayerProfile, React.ComponentType<{ className?: string }>> = {
  clergy: Users,
  salary: Briefcase,
  salary_hustle: Building2,
  entrepreneur: User,
};

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  const [selectedReliefs, setSelectedReliefs] = useState<string[]>([]);
  const [taxpayerProfile, setTaxpayerProfile] = useState<TaxpayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalReliefs, setOriginalReliefs] = useState<string[]>([]);
  const [originalProfile, setOriginalProfile] = useState<TaxpayerProfile | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!authUser?.id) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('selected_reliefs, taxpayer_profile')
          .eq('id', authUser.id)
          .single();
        if (error) throw error;
        const reliefs = data?.selected_reliefs || [];
        const profile = (data?.taxpayer_profile as TaxpayerProfile) || null;
        setSelectedReliefs(reliefs);
        setOriginalReliefs(reliefs);
        setTaxpayerProfile(profile);
        setOriginalProfile(profile);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [authUser?.id]);

  useEffect(() => {
    const reliefsChanged =
      JSON.stringify([...selectedReliefs].sort()) !== JSON.stringify([...originalReliefs].sort());
    const profileChanged = taxpayerProfile !== originalProfile;
    setHasChanges(reliefsChanged || profileChanged);
  }, [selectedReliefs, originalReliefs, taxpayerProfile, originalProfile]);

  const handleReliefToggle = (relief: string, checked: boolean) => {
    setSelectedReliefs(prev => checked ? [...prev, relief] : prev.filter(r => r !== relief));
  };

  const handleSave = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          selected_reliefs: selectedReliefs,
          taxpayer_profile: taxpayerProfile,
        })
        .eq('id', authUser.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-reliefs', authUser.id] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', authUser.id] });
      toast.success('Settings updated');
      setOriginalReliefs(selectedReliefs);
      setOriginalProfile(taxpayerProfile);
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 pt-6 pb-8 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ── Taxpayer Profile ──────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Taxpayer Profile</CardTitle>
                  <CardDescription>
                    Your profile determines which income and expense categories are available and how your tax is calculated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TAXPAYER_PROFILES.map(({ value, label, description }) => {
                    const Icon = PROFILE_ICONS[value];
                    const isSelected = taxpayerProfile === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTaxpayerProfile(value)}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-secondary/30 hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'gradient-primary' : 'bg-secondary'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Tax Relief Preferences ────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Tax Relief Preferences</CardTitle>
                  </div>
                  <CardDescription>
                    Select the tax reliefs that apply to you. These will appear as options when adding relief records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {RELIEF_CATEGORIES.map((relief) => (
                    <div key={relief} className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <Checkbox
                        id={relief}
                        checked={selectedReliefs.includes(relief)}
                        onCheckedChange={(checked) => handleReliefToggle(relief, checked as boolean)}
                      />
                      <Label htmlFor={relief} className="flex-1 cursor-pointer font-medium text-foreground">{relief}</Label>
                      {selectedReliefs.includes(relief) && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            {hasChanges && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-12 rounded-xl gradient-primary hover:opacity-90 transition-opacity"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    : <><Check className="w-4 h-4 mr-2" />Save Changes</>
                  }
                </Button>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="shadow-card border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> Your taxpayer profile and reliefs affect the categories shown when adding records and how your tax is calculated.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
