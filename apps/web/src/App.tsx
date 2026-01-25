/**
 * Claude Context - Enterprise Software & Knowledge Management Platform
 * Main application entry point with WorkspaceProvider and WorkspaceLayout
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceProvider } from './contexts';
import { WorkspaceLayout } from './layouts';
import { CreateForm } from './components/detail';
import {
  organization as initialOrg,
  teams as initialTeams,
  projects as initialProjects,
  slices as initialSlices,
  currentUser,
  type Organization,
  type Team,
  type Project,
  type Slice,
  type Intent,
  type ContextDoc,
  type Artifact,
} from './data/enterprise-data';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

type CreateType = 'project' | 'intent' | 'slice' | 'context' | null;

export function App() {
  // Data state (mutable copies)
  const [organization, setOrganization] = useState<Organization>(initialOrg);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [slices, setSlices] = useState<Slice[]>(initialSlices);

  // Create modal state
  const [createType, setCreateType] = useState<CreateType>(null);
  const [createStatus, setCreateStatus] = useState<Slice['status'] | undefined>(undefined);

  // CRUD handlers
  const handleSliceStatusChange = (sliceId: string, newStatus: Slice['status']) => {
    setSlices(prev =>
      prev.map(s =>
        s.id === sliceId
          ? { ...s, status: newStatus, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleSaveItem = (item: Project | Intent | Slice | ContextDoc | Artifact) => {
    // Determine item type and update accordingly
    if ('teamId' in item && 'status' in item && !('shortId' in item)) {
      // Project
      setProjects(prev => prev.map(p => p.id === item.id ? item as Project : p));
    } else if ('shortId' in item) {
      // Slice
      setSlices(prev => prev.map(s => s.id === item.id ? item as Slice : s));
    } else if ('source' in item && 'type' in item && 'priority' in item) {
      // Intent - update in appropriate location
      const intent = item as Intent;
      if (intent.source === 'org') {
        setOrganization(prev => ({
          ...prev,
          intents: prev.intents.map(i => i.id === intent.id ? intent : i),
        }));
      } else if (intent.source === 'team') {
        setTeams(prev => prev.map(t => ({
          ...t,
          intents: t.intents.map(i => i.id === intent.id ? intent : i),
        })));
      } else {
        setProjects(prev => prev.map(p => ({
          ...p,
          intents: p.intents.map(i => i.id === intent.id ? intent : i),
        })));
      }
    } else if ('freshness' in item) {
      // Context doc - update in appropriate location
      const ctx = item as ContextDoc;
      if (ctx.inheritedFrom === 'org') {
        setOrganization(prev => ({
          ...prev,
          context: prev.context.map(c => c.id === ctx.id ? ctx : c),
        }));
      } else if (ctx.inheritedFrom === 'team') {
        setTeams(prev => prev.map(t => ({
          ...t,
          context: t.context.map(c => c.id === ctx.id ? ctx : c),
        })));
      } else {
        setProjects(prev => prev.map(p => ({
          ...p,
          context: p.context.map(c => c.id === ctx.id ? ctx : c),
        })));
      }
    }
  };

  const handleDeleteItem = (id: string) => {
    // Try to delete from all possible locations
    setSlices(prev => prev.filter(s => s.id !== id));
    setProjects(prev => prev.filter(p => p.id !== id).map(p => ({
      ...p,
      intents: p.intents.filter(i => i.id !== id),
      context: p.context.filter(c => c.id !== id),
      artifacts: p.artifacts.filter(a => a.id !== id),
    })));
    setTeams(prev => prev.map(t => ({
      ...t,
      intents: t.intents.filter(i => i.id !== id),
      context: t.context.filter(c => c.id !== id),
    })));
    setOrganization(prev => ({
      ...prev,
      intents: prev.intents.filter(i => i.id !== id),
      context: prev.context.filter(c => c.id !== id),
    }));
  };

  const handleCreateItem = (item: unknown) => {
    switch (createType) {
      case 'project':
        setProjects(prev => [...prev, item as Project]);
        break;
      case 'slice':
        const newSlice = {
          ...(item as Partial<Slice>),
          status: createStatus || 'backlog',
          assignee: currentUser,
        } as Slice;
        setSlices(prev => [...prev, newSlice]);
        break;
      case 'intent':
        // For now, add to first project - could be improved
        setProjects(prev => {
          const [first, ...rest] = prev;
          if (first) {
            return [{ ...first, intents: [...first.intents, item as Intent] }, ...rest];
          }
          return prev;
        });
        break;
      case 'context':
        // For now, add to first project - could be improved
        setProjects(prev => {
          const [first, ...rest] = prev;
          if (first) {
            return [{ ...first, context: [...first.context, item as ContextDoc] }, ...rest];
          }
          return prev;
        });
        break;
    }
    setCreateType(null);
    setCreateStatus(undefined);
  };

  const handleCreateSlice = (status?: Slice['status']) => {
    setCreateStatus(status);
    setCreateType('slice');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider
        organization={organization}
        teams={teams}
        projects={projects}
        slices={slices}
        initialSpaceId="team-platform"
        initialProjectId="proj-api-gateway"
      >
        <WorkspaceLayout
          organization={organization}
          teams={teams}
          projects={projects}
          currentUser={currentUser}
          onSliceStatusChange={handleSliceStatusChange}
          onCreateProject={() => setCreateType('project')}
          onCreateSlice={handleCreateSlice}
          onSaveItem={handleSaveItem}
          onDeleteItem={handleDeleteItem}
        />

        {/* Create Modal */}
        {createType && (
          <CreateForm
            type={createType}
            projectId="proj-api-gateway"
            teamId="team-platform"
            onClose={() => {
              setCreateType(null);
              setCreateStatus(undefined);
            }}
            onCreate={handleCreateItem}
          />
        )}
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

export default App;
