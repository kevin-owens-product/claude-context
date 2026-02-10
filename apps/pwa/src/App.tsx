import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { EditorPage } from './pages/EditorPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppShell } from './components/layout/AppShell';
import { AiPanel } from './components/ai/AiPanel';
import { Terminal } from './components/terminal/Terminal';
import { FileExplorer } from './components/files/FileExplorer';

function AppContent() {
  const { state } = useApp();
  const [currentPage, setCurrentPage] = useState<string>('editor');

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  // Show auth screen if not authenticated
  if (!state.auth.isAuthenticated) {
    return <AuthScreen />;
  }

  // Show onboarding if not completed
  if (!state.onboardingComplete) {
    return <OnboardingScreen />;
  }

  // Main app
  switch (currentPage) {
    case 'projects':
      return (
        <AppShell
          currentPage={currentPage}
          onNavigate={handleNavigate}
          editorSlot={<ProjectsPage onNavigate={handleNavigate} />}
          aiPanelSlot={<AiPanel />}
          terminalSlot={<Terminal />}
          fileExplorerSlot={<FileExplorer />}
        />
      );

    case 'settings':
      return (
        <AppShell
          currentPage={currentPage}
          onNavigate={handleNavigate}
          editorSlot={<SettingsPage onNavigate={handleNavigate} />}
          aiPanelSlot={<AiPanel />}
          terminalSlot={<Terminal />}
          fileExplorerSlot={<FileExplorer />}
        />
      );

    case 'editor':
    default:
      return (
        <EditorPage
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      );
  }
}

function AppUpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShowUpdate(true);
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-indigo-600 text-white text-sm text-center py-2 px-4">
      <span>A new version is available. </span>
      <button
        onClick={() => window.location.reload()}
        className="underline font-medium hover:opacity-80"
      >
        Refresh to update
      </button>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppUpdateBanner />
      <AppContent />
    </AppProvider>
  );
}
