import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Shield, Calculator, FileText, CheckCircle, Zap, Users, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Logo, LogoIcon } from '@/components/Logo';

const features = [
  {
    icon: Calculator,
    title: 'Auto-calculates PAYE',
    desc: 'Nigerian PAYE tax bands applied correctly every time. Monthly or annual.',
  },
  {
    icon: FileText,
    title: 'Statement uploads',
    desc: 'Upload your bank statement as PDF or Excel — we extract and classify the records.',
  },
  {
    icon: Shield,
    title: 'Secure & compliant',
    desc: 'Your financial data is encrypted and protected with row-level security.',
  },
  {
    icon: Zap,
    title: 'One-click filing',
    desc: 'Review your breakdown, approve your tax calculation, and submit instantly.',
  },
  {
    icon: CheckCircle,
    title: 'Relief tracking',
    desc: 'NHF, Pension, NHIS, Mortgage — all your reliefs tracked in one place.',
  },
  {
    icon: Users,
    title: 'Admin oversight',
    desc: 'Every submission is reviewed and confirmed by your tax officer.',
  },
];

const steps = [
  { n: '01', title: 'Create your account', desc: 'Sign up with your email, verify, and complete your tax profile in minutes.' },
  { n: '02', title: 'Add your records', desc: 'Enter income, expenses and reliefs manually or upload your bank statement.' },
  { n: '03', title: 'Review & file', desc: 'See your full tax breakdown, approve the figures, and submit for review.' },
  { n: '04', title: 'Pay & done', desc: 'Once approved, pay through the official channel and your records are sealed.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans',system-ui,sans-serif]">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth?view=login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/auth?view=signup')}
            className="text-sm font-semibold gradient-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-20">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-8">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Nigerian PAYE tax, handled simply
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-foreground">
            File your taxes
            <br />
            <span className="text-primary">with confidence.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Cizah auto-calculates your PAYE tax, tracks all your reliefs, and submits your filing — so you focus on your work, not the paperwork.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/auth?view=signup')}
              className="group flex items-center gap-2 gradient-primary text-primary-foreground font-bold px-8 py-4 rounded-xl text-base hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start filing free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth?view=login')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-8 py-4 text-base"
            >
              Already have an account →
            </button>
          </div>

          {/* Floating card preview */}
          <div ref={heroRef} className="mt-16 transition-transform duration-300 ease-out will-change-transform">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md mx-auto text-left shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <LogoIcon size="sm" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">March 2026 · Monthly</p>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Approved</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-background rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Inflow</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">₦850,000</p>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">Outflow</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">₦320,000</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm border-t border-border pt-3">
                {[
                  ['Assessable Income', '₦530,000'],
                  ['Total Reliefs', '₦45,000'],
                  ['Chargeable Income', '₦485,000'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-muted-foreground">
                    <span>{label}</span><span>{val}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Tax Payable</span><span className="text-primary">₦63,200</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-foreground">Everything you need to file right</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built specifically for Nigerian taxpayers. No generic tax tools.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group bg-card hover:shadow-card border border-border rounded-2xl p-6 transition-all duration-300">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-base mb-2 text-foreground">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 md:px-12 bg-primary/5 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-foreground">How it works</h2>
            <p className="text-muted-foreground text-lg">From signup to filed — in four steps.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-5 p-6 bg-card border border-border rounded-2xl shadow-card">
                <span className="text-3xl font-black text-primary/30 leading-none flex-shrink-0">{n}</span>
                <div>
                  <h3 className="font-bold text-base mb-1 text-foreground">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-foreground">
          Ready to file the <span className="text-primary">right way?</span>
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">Join taxpayers who've made PAYE filing simple, accurate, and stress-free.</p>
        <button
          onClick={() => navigate('/auth?view=signup')}
          className="group inline-flex items-center gap-2 gradient-primary text-primary-foreground font-bold px-10 py-5 rounded-xl text-lg hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Create free account
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-muted-foreground text-sm">
        <Logo size="xs" />
        <p>© {new Date().getFullYear()} Cizah. Lagos State Tax Management Platform.</p>
        <button
          onClick={() => navigate('/admin')}
          className="hover:text-foreground transition-colors"
        >
          Admin portal →
        </button>
      </footer>
    </div>
  );
}
