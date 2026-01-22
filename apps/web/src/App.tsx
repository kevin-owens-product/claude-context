/**
 * @prompt-id forge-v4.1:web:app:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContextPanel } from './components/context/ContextPanel';
import { SliceList } from './components/slice/SliceList';
import { SliceDetail } from './components/slice/SliceDetail';
import { AnalyticsDashboard } from './components/feedback/AnalyticsDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

type View = 'slices' | 'context' | 'analytics';

export function App() {
  const [currentView, setCurrentView] = useState<View>('slices');
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);

  // Demo IDs - in real app these come from auth context
  const workspaceId = 'demo-workspace-id';
  const graphId = 'demo-graph-id';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Claude Context</h1>
              </div>

              {/* Navigation */}
              <nav className="flex space-x-4">
                <NavButton
                  active={currentView === 'slices'}
                  onClick={() => {
                    setCurrentView('slices');
                    setSelectedSliceId(null);
                  }}
                >
                  Slices
                </NavButton>
                <NavButton
                  active={currentView === 'context'}
                  onClick={() => setCurrentView('context')}
                >
                  Context
                </NavButton>
                <NavButton
                  active={currentView === 'analytics'}
                  onClick={() => setCurrentView('analytics')}
                >
                  Analytics
                </NavButton>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'slices' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)]">
              {selectedSliceId ? (
                <SliceDetail
                  sliceId={selectedSliceId}
                  onBack={() => setSelectedSliceId(null)}
                />
              ) : (
                <SliceList
                  workspaceId={workspaceId}
                  onSelectSlice={setSelectedSliceId}
                  onCreateSlice={() => {
                    // Open create slice modal
                    console.log('Create slice');
                  }}
                />
              )}
            </div>
          )}

          {currentView === 'context' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)]">
              <ContextPanel
                graphId={graphId}
                workspaceId={workspaceId}
                onCompile={(text, ids) => {
                  console.log('Compiled context:', { text, ids });
                }}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <AnalyticsDashboard workspaceId={workspaceId} />
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

interface NavButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function NavButton({ children, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export default App;
