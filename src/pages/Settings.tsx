import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import { RELIEF_CATEGORIES } from '@/types/onyx';
import { useQueryClient } from '@tanstack/react-query';

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [selectedReliefs, setSelectedReliefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalReliefs, setOriginalReliefs] = useState<string[]>([]);

  useEffect(() => {
    const fetchReliefs = async () => {
      if (!authUser?.id) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('selected_reliefs')
          .eq('id', authUser.id)
          .single();
        if (error) throw error;
        const reliefs = data?.selected_reliefs || [];
        setSelectedReliefs(reliefs);
        setOriginalReliefs(reliefs);
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchReliefs();
  }, [authUser?.id]);

  useEffect(() => {
    const changed = JSON.stringify([...selectedReliefs].sort()) !== JSON.stringify([...originalReliefs].sort());
    setHasChanges(changed);
  }, [selectedReliefs, originalReliefs]);

  const handleReliefToggle = (relief: string, checked: boolean) => {
    setSelectedReliefs(prev => checked ? [...prev, relief] : prev.filter(r => r !== relief));
  };

  const handleSave = async () => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ selected_reliefs: selectedReliefs })
        .eq('id', authUser.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-reliefs', authUser.id] });
      toast.success('Relief preferences updated');
      setOriginalReliefs(selectedReliefs);
      setHasChanges(false);
    } catch (error) {
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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

                  {hasChanges && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                      <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl gradient-primary hover:opacity-90 transition-opacity">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Save Changes</>}
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="shadow-card border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> The reliefs you select here determine which categories appear when adding a Relief record — so you only see what applies to your situation.
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
