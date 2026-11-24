import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useServer } from './context/ServerContext';
import { LayoutWrapper } from './components/layout/LayoutWrapper';
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
import { AdminSidebarNav } from './components/admin/AdminSidebarNav';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { GlassButton } from './components/ui/GlassButton';

export const App: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { accessDeniedError, selectServer, visibleServers } = useServer();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // If not authenticated, render pure Apple Liquid Glass Auth Gateway
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
    } else {
      setIsAdminView(false);
    }
    setCurrentTab(tab);
  };

  const handleToggleAdmin = () => {
    if (!isAdmin) return;
    if (!isAdminView) {
      setIsAdminView(true);
      setCurrentTab('admin-dashboard');
    } else {
      setIsAdminView(false);
      setCurrentTab('dashboard');
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

  return (
    <LayoutWrapper
      currentTab={currentTab}
      onTabChange={handleTabChange}
      isAdminView={isAdminView}
      onToggleAdminView={handleToggleAdmin}
    >
      {/* Client View Components */}
      {!isAdminView ? (
        <>
          {currentTab === 'dashboard' && (
            <ServerDashboard
              onSelectServerDetail={() => setCurrentTab('server-detail')}
            />
          )}

          {currentTab === 'server-detail' && (
            <ServerDetailView
              onBackToDashboard={() => setCurrentTab('dashboard')}
            />
          )}
        </>
      ) : (
        /* Full SlayerNode Admin Management Suite */
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <AdminSidebarNav
            currentTab={currentTab}
            onTabChange={handleTabChange}
            onExitAdmin={() => {
              setIsAdminView(false);
              setCurrentTab('dashboard');
            }}
          />

          <div className="flex-1 w-full min-w-0">
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

            {currentTab === 'admin-studio' && <AppearanceStudio />}
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
};
