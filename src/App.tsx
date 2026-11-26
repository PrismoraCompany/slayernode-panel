import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useServers } from './context/ServerContext';
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
import { AdminServersManager } from './components/admin/AdminServersManager';
import { AppearanceStudio } from './components/admin/studio/AppearanceStudio';
import { AccountSettingsView } from './components/account/AccountSettingsView';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { GlassButton } from './components/ui/GlassButton';

export const App: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoadingAuth } = useAuth();
  const { accessDeniedError, clearAccessDeniedError, selectServer, servers, refreshServers } = useServers();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [serverSubTab, setServerSubTab] = useState('console');
  const [forgotNotice, setForgotNotice] = useState('');

  const syncFromHash = useCallback(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    const path = window.location.pathname;

    if (path === '/account' || path === '/accounts' || rawHash === 'account' || rawHash === 'accounts') {
      setIsAdminView(false);
      setCurrentTab('account');
      return;
    }

    if (rawHash.startsWith('server/')) {
      const parts = rawHash.split('/');
      const targetId = parts[1];
      const subTab = parts[2] || 'console';
      if (targetId) {
        setIsAdminView(false);
        selectServer(targetId);
        setServerSubTab(subTab);
        setCurrentTab('server-detail');
        return;
      }
    }

    if (path === '/admin' || path.startsWith('/admin/') || rawHash.startsWith('admin')) {
      if (isAdmin) {
        setIsAdminView(true);
        let targetTab = rawHash && rawHash !== 'admin' ? rawHash : 'admin-dashboard';
        if (targetTab === 'admin-activity') targetTab = 'admin-audit';
        setCurrentTab(targetTab);
      } else {
        setIsAdminView(false);
        setCurrentTab('dashboard');
      }
      return;
    }

    setIsAdminView(false);
    setCurrentTab(rawHash || 'dashboard');
  }, [isAdmin, selectServer]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [syncFromHash]);

  // Re-resolve #server/<id> once server list finishes hydrating
  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    if (rawHash.startsWith('server/') && servers.length > 0) {
      const targetId = rawHash.split('/')[1];
      if (targetId) selectServer(targetId);
    }
  }, [servers.length, selectServer]);

  const navigateToServer = async (serverId: string, subTab = 'console') => {
    clearAccessDeniedError();
    if (servers.length === 0) {
      await refreshServers();
    }
    selectServer(serverId);
    setIsAdminView(false);
    setServerSubTab(subTab);
    setCurrentTab('server-detail');
    window.location.hash = `server/${serverId}/${subTab}`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#111216] text-white/70 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs font-mono tracking-wider uppercase text-white/40">Initializing SlayerNode Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterView onNavigateLogin={() => { setForgotNotice(''); setAuthMode('login'); }} />;
    }
    return (
      <div>
        {forgotNotice && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs">
            {forgotNotice}
          </div>
        )}
        <LoginView
          onNavigateRegister={() => { setForgotNotice(''); setAuthMode('register'); }}
          onNavigateForgot={() => setForgotNotice('Contact your panel administrator or sign in with 2FA recovery.')}
        />
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    const normalized = tab === 'admin-activity' ? 'admin-audit' : tab;
    if (normalized.startsWith('admin-')) {
      if (!isAdmin) return;
      setIsAdminView(true);
      window.location.hash = normalized;
    } else {
      setIsAdminView(false);
      window.location.hash = normalized === 'dashboard' ? '' : normalized;
    }
    setCurrentTab(normalized);
    window.scrollTo({ top: 0, behavior: 'auto' });
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
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-sm text-white/60 leading-relaxed">{accessDeniedError}</p>
            <GlassButton
              variant="primary"
              onClick={() => {
                clearAccessDeniedError();
                setCurrentTab('dashboard');
                window.location.hash = '';
              }}
            >
              Return to Server Fleet
            </GlassButton>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  if (isAdminView && isAdmin) {
    return (
      <motion.div
        key="admin-workspace-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
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
          {currentTab === 'admin-dashboard' && <AdminDashboard onNavigateTab={handleTabChange} />}
          {currentTab === 'admin-settings' && <AdminSettings />}
          {currentTab === 'admin-api' && <AdminApiKeys />}
          {currentTab === 'admin-audit' && <ActivityLogsManager />}
          {currentTab === 'admin-locations' && <LocationsManager />}
          {currentTab === 'admin-nodes' && (
            <NodesManager onNavigateServer={serverId => navigateToServer(serverId, 'console')} />
          )}
          {currentTab === 'admin-servers' && (
            <AdminServersManager
              onSelectServerDetail={(serverId, subTab) => navigateToServer(serverId, subTab || 'console')}
            />
          )}
          {currentTab === 'admin-mounts' && <MountsManager />}
          {currentTab === 'admin-nests' && <NestsEggsManager />}
          {currentTab === 'admin-users' && <UsersManager />}
          {currentTab === 'admin-studio' && (
            <AppearanceStudio onExit={() => handleTabChange('admin-dashboard')} />
          )}
        </AdminLayout>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="client-workspace-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
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
            onSelectServerDetail={serverId => navigateToServer(serverId, 'console')}
            onNavigateAdminServer={() => {
              setIsAdminView(true);
              setCurrentTab('admin-servers');
              window.location.hash = 'admin-servers';
            }}
          />
        )}

        {currentTab === 'server-detail' && (
          <ServerDetailView
            initialSubTab={serverSubTab}
            onSubTabChange={tab => {
              setServerSubTab(tab);
              const rawHash = window.location.hash.replace(/^#\/?/, '');
              if (rawHash.startsWith('server/')) {
                const srvId = rawHash.split('/')[1];
                if (srvId) window.location.hash = `server/${srvId}/${tab}`;
              }
            }}
            onBackToDashboard={() => {
              selectServer('');
              setCurrentTab('dashboard');
              window.location.hash = '';
            }}
          />
        )}

        {(currentTab === 'account' || currentTab === 'accounts') && <AccountSettingsView />}
      </LayoutWrapper>
    </motion.div>
  );
};

export default App;
