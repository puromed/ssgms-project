import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  Database,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const baseNavigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Grants', path: '/grants', icon: FileText },
    { name: 'Disbursements', path: '/disbursements', icon: DollarSign },
  ];

  const navigation = [...baseNavigation];

  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    navigation.push({
      name: 'Grant Sources',
      path: '/grant-sources',
      icon: Database,
    });
  }

  if (profile?.role === 'super_admin') {
    navigation.push({ name: 'Team', path: '/team', icon: User });
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-20 px-4 py-3 flex items-center justify-between">
        <img src="/7.png" alt="SSGMS Logo" className="h-20 w-auto max-w-full object-contain" />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`fixed top-0 left-0 h-full w-64 text-white transform transition-transform duration-200 ease-in-out z-30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        style={{ backgroundColor: '#219ebc' }}
      >
        <div className="p-4 border-b flex justify-center" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <img src="/7.png" alt="SSGMS Logo" className="h-20 w-auto max-w-full object-contain" />
        </div>

        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-black/10 text-white shadow-sm'
                  : 'text-white/80 hover:bg-black/5 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="mb-4 px-4">
            <p className="text-sm text-white/70">Logged in as</p>
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="text-sm font-medium text-white truncate hover:underline"
            >
              {profile?.email}
            </Link>
            <span
              className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${profile?.role === 'admin' || profile?.role === 'super_admin'
                ? 'bg-emerald-500 text-white'
                : 'bg-black/10 text-white'
                }`}
            >
              {profile?.role === 'super_admin'
                ? 'Super Admin'
                : profile?.role === 'admin'
                  ? 'Admin'
                  : 'Staff'}
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-black/10 text-white hover:bg-black/20 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-white/90 hover:bg-black/10 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
