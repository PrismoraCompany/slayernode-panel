import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useServer } from './context/ServerContext';
import { LayoutWrapper } from './components/layout/LayoutWrapper';
import { AdminLayout } from './components/admin/AdminLayout';
import { ServerDashboard } from './components/server/ServerDashboard';
import { ServerDetailView } from './components/server/ServerDetailView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminApiKeys } from './components/admin/AdminApiKeys';
import { LocationsManager } from './components/admin/LocationsManager';
import { NodesManager } from './components/admin/NodesManager';
import { MountsManager } from './components/admin/MountsManager';
import { NestsEggsManager } from './components/admin/NestsEggsManager';
import { UsersManager } from './components/admin/UsersManager';
import { ActivityLogsManager } from './components/admin/ActivityLogsManager';
import { AppearanceStudio } from './components/admin/studio/AppearanceStudio';
import { AdminServersManager } from './components/admin/AdminServersManager';
import { AccountSettingsView } from './components/account/AccountSettingsView';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { GlassButton } from './components/ui/GlassButton';

export const App: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { accessDeniedError, selectServer, visibleServers } = useServer();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Sync /account, /accounts, /admin pathname and URL hash
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash.replace('#', '');
      const path = window.location.pathname;

      if (path === '/account' || path === '/accounts' || hash === 'account' || hash === 'accounts') {
        setIsAdminView(false);
        setCurrentTab('account');
      } else if (path === '/admin' || path.startsWith('/admin/') || hash.startsWith('admin')) {
        if (isAdmin) {
          setIsAdminView(true);
          const targetTab = hash && hash !== 'admin' ? hash : 'admin-dashboard';
          setCurrentTab(targetTab);
        }
      } else {
        if (!hash.startsWith('admin')) {
          setIsAdminView(false);
          setCurrentTab(hash || 'dashboard');
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    return () => window.removeEventListener('hashchange', handleUrlRoute);
  }, [isAdmin]);

  // If not authenticated, render pure Auth Gateway
  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterView onNavigateLogin={() => setAuthMode('login')} />;
    }
    return (
      <LoginView
        onNavigateRegister={() => setAuthMode('register')}
        onNavigateForgot={() => alert('Password reset verification token sent to your registered email.')}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    if (tab.startsWith('admin-')) {
      if (!isAdmin) {
        alert('403 Forbidden: Administrator permissions required.');
        return;
      }
      setIsAdminView(true);
      window.location.hash = tab;
    } else {
      setIsAdminView(false);
      window.location.hash = tab === 'dashboard' ? '' : tab;
    }
    setCurrentTab(tab);
  };

  const handleToggleAdmin = () => {
    if (!isAdmin) return;
    if (!isAdminView) {
      setIsAdminView(true);
      setCurrentTab('admin-dashboard');
      window.location.hash = 'admin-dashboard';
    } else {
      setIsAdminView(false);
      setCurrentTab('dashboard');
      window.location.hash = '';
    }
  };

  // If user attempted to access a server container outside their tenant boundary
  if (accessDeniedError) {
    return (
      <LayoutWrapper
        currentTab="dashboard"
        onTabChange={handleTabChange}
        isAdminView={false}
        onToggleAdminView={handleToggleAdmin}
      >
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="glass-panel p-8 max-w-md w-full text-center flex flex-col items-center gap-4 border border-rose-500/30">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">403 Access Denied</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {accessDeniedError}
            </p>
            <GlassButton
              variant="accent"
              size="sm"
              onClick={() => {
                if (visibleServers.length > 0) {
                  selectServer(visibleServers[0].id);
                }
                setCurrentTab('dashboard');
              }}
            >
              Return to My Servers
            </GlassButton>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  // ========================================================
  // 1. DEDICATED APPEARANCE STUDIO FULL-SCREEN PAGE
  // ========================================================
  if (isAdmin && currentTab === 'admin-studio') {
    return (
      <AppearanceStudio
        onExit={() => {
          setCurrentTab('admin-dashboard');
          window.location.hash = 'admin-dashboard';
        }}
      />
    );
  }

  // ========================================================
  // 2. DEDICATED ADMIN MANAGEMENT SUITE PAGE
  // ========================================================
  if (isAdmin && isAdminView) {
    return (
      <motion.div
        key="admin-workspace-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full min-h-screen"
      >
        <AdminLayout
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onExitAdmin={() => {
            setIsAdminView(false);
            setCurrentTab('dashboard');
            window.location.hash = '';
          }}
        >
          {currentTab === 'admin-dashboard' && (
            <AdminDashboard onNavigateTab={handleTabChange} />
          )}

          {currentTab === 'admin-settings' && <AdminSettings />}

          {currentTab === 'admin-api' && <AdminApiKeys />}

          {currentTab === 'admin-audit' && <ActivityLogsManager />}

          {currentTab === 'admin-locations' && <LocationsManager />}

          {currentTab === 'admin-nodes' && (
            <NodesManager
              onNavigateServer={serverId => {
                selectServer(serverId);
                setIsAdminView(false);
                setCurrentTab('server-detail');
              }}
            />
          )}

          {currentTab === 'admin-servers' && (
            <AdminServersManager
              onSelectServerDetail={serverId => {
                selectServer(serverId);
                setIsAdminView(false);
                setCurrentTab('server-detail');
              }}
            />
          )}

          {currentTab === 'admin-mounts' && <MountsManager />}

          {currentTab === 'admin-nests' && <NestsEggsManager />}

          {currentTab === 'admin-users' && <UsersManager />}
        </AdminLayout>
      </motion.div>
    );
  }

  // ========================================================
  // 3. CLIENT GAME SERVER FLEET & DASHBOARD
  // ========================================================
  return (
    <motion.div
      key="client-workspace-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="w-full min-h-screen"
    >
      <LayoutWrapper
        currentTab={currentTab}
        onTabChange={handleTabChange}
        isAdminView={false}
        onToggleAdminView={handleToggleAdmin}
      >
        {currentTab === 'dashboard' && (
          <ServerDashboard
            onSelectServerDetail={() => setCurrentTab('server-detail')}
            onNavigateAdminServer={() => {
              setIsAdminView(true);
              setCurrentTab('admin-servers');
              window.location.hash = 'admin-servers';
            }}
          />
        )}

        {currentTab === 'server-detail' && (
          <ServerDetailView
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {(currentTab === 'account' || currentTab === 'accounts') && (
          <AccountSettingsView />
        )}
      </LayoutWrapper>
    </motion.div>
  );
};
