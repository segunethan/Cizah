import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle, ArrowDownCircle, Settings, TrendingUp, PieChart } from 'lucide-react';
import { Logo, LogoIcon } from '@/components/Logo';

const Onboarding = () => {
  const { completeOnboarding } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      completeOnboarding({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 lg:p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-inflow/10 rounded-full blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <Logo size="lg" />
          </div>

          {/* Preview Cards */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 shadow-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <LogoIcon size="sm" />
                <span className="text-muted-foreground text-sm uppercase tracking-wide">Current Balance</span>
              </div>
              <p className="text-3xl font-bold text-primary">₦125,500</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="w-5 h-5 text-inflow" />
                  <span className="text-xs text-muted-foreground">Inflow</span>
                </div>
                <p className="text-lg font-semibold text-foreground">₦180,000</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="w-5 h-5 text-outflow" />
                  <span className="text-xs text-muted-foreground">Outflow</span>
                </div>
                <p className="text-lg font-semibold text-foreground">₦45,200</p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-2xl p-5 shadow-card flex items-center gap-4"
            >
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Track your ministry finances</p>
                <p className="font-semibold text-foreground">Simple & Intuitive</p>
              </div>
            </motion.div>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Income Tracking', 'Expense Management', 'Monthly Reports'].map((feature, i) => (
              <motion.span
                key={feature}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="px-4 py-2 bg-card rounded-full text-sm text-muted-foreground shadow-card"
              >
                {feature}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Welcome!</h1>
          <p className="text-muted-foreground mb-8">
            Start managing your ministry finances faster and better
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold rounded-xl gradient-primary hover:opacity-90 transition-opacity"
              disabled={!name.trim()}
            >
              Get Started
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            © 2025 Ciza. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
