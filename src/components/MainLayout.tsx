import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Main content with left margin for fixed sidebar on desktop */}
      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-0 overflow-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
