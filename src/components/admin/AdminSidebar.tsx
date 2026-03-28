import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, LogOut, Menu, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminSidebarProps {
  currentPage: 'dashboard' | 'users' | 'team';
}

const AdminSidebar = ({ currentPage }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const isSuperAdmin = adminInfo.role === 'super_admin';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminInfo');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    ...(isSuperAdmin ? [{ id: 'team', label: 'Team', icon: Shield, path: '/admin/team' }] : []),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div>
            <Logo size="md" />
            <span className="text-xs block text-muted-foreground mt-0.5">Tax Admin</span>
          </div>
        </div>
        {adminInfo.name && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium truncate">{adminInfo.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {adminInfo.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { navigate(item.path); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
              currentPage === item.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="lg:hidden h-16" />
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col fixed top-0 left-0 h-screen z-40">
        <SidebarContent />
      </aside>
    </>
  );
};

export default AdminSidebar;
