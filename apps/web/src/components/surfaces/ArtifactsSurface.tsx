/**
 * Artifacts Surface - Living Artifacts gallery and management
 */

import { useState } from 'react';
import { FileCode, FileText, Image, Download, History, ExternalLink, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface Artifact {
  id: string;
  name: string;
  type: 'code' | 'document' | 'diagram';
  version: number;
  updatedAt: Date;
  preview?: string;
}

interface ArtifactsSurfaceProps {
  projectName?: string;  // Used in header display
}

const mockArtifacts: Artifact[] = [
  {
    id: '1',
    name: 'API Schema',
    type: 'code',
    version: 3,
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    preview: 'interface User { id: string; name: string; ... }',
  },
  {
    id: '2',
    name: 'Architecture Diagram',
    type: 'diagram',
    version: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    name: 'Product Requirements',
    type: 'document',
    version: 5,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    preview: 'The system shall support real-time collaboration...',
  },
  {
    id: '4',
    name: 'Database Migration',
    type: 'code',
    version: 1,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    preview: 'ALTER TABLE users ADD COLUMN avatar_url TEXT;',
  },
];

const typeIcons = {
  code: FileCode,
  document: FileText,
  diagram: Image,
};

export function ArtifactsSurface({ projectName: _projectName }: ArtifactsSurfaceProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArtifacts = mockArtifacts.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex h-full bg-white dark:bg-claude-neutral-900">
      {/* Artifact List */}
      <div className="w-80 border-r border-claude-cream-300 dark:border-claude-neutral-800 flex flex-col">
        <div className="p-4 border-b border-claude-cream-300 dark:border-claude-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              Artifacts
            </h2>
            <button className="p-1.5 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 rounded-md transition-colors">
              <Plus className="w-4 h-4 text-claude-neutral-500" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400" />
            <input
              type="text"
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-claude-cream-100 dark:bg-claude-neutral-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-claude-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredArtifacts.map((artifact) => {
            const Icon = typeIcons[artifact.type];
            return (
              <button
                key={artifact.id}
                onClick={() => setSelectedArtifact(artifact.id)}
                className={clsx(
                  'w-full p-4 text-left border-b border-claude-cream-200 dark:border-claude-neutral-800 transition-colors',
                  selectedArtifact === artifact.id
                    ? 'bg-claude-primary-50 dark:bg-claude-primary-900/20'
                    : 'hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-800/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-claude-cream-100 dark:bg-claude-neutral-800">
                    <Icon className="w-4 h-4 text-claude-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100 truncate">
                        {artifact.name}
                      </span>
                      <span className="text-xs text-claude-neutral-400">
                        v{artifact.version}
                      </span>
                    </div>
                    {artifact.preview && (
                      <p className="mt-1 text-xs text-claude-neutral-500 dark:text-claude-neutral-400 truncate">
                        {artifact.preview}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-claude-neutral-400">
                      {formatDate(artifact.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Artifact Detail */}
      <div className="flex-1 flex flex-col">
        {selectedArtifact ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-claude-cream-300 dark:border-claude-neutral-800">
              <div>
                <h3 className="font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
                  {mockArtifacts.find((a) => a.id === selectedArtifact)?.name}
                </h3>
                <p className="text-sm text-claude-neutral-500">
                  Version {mockArtifacts.find((a) => a.id === selectedArtifact)?.version}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 rounded-md transition-colors">
                  <History className="w-4 h-4 text-claude-neutral-500" />
                </button>
                <button className="p-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 rounded-md transition-colors">
                  <Download className="w-4 h-4 text-claude-neutral-500" />
                </button>
                <button className="p-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 rounded-md transition-colors">
                  <ExternalLink className="w-4 h-4 text-claude-neutral-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-lg p-6">
                <pre className="text-sm text-claude-neutral-700 dark:text-claude-neutral-300 font-mono whitespace-pre-wrap">
                  {mockArtifacts.find((a) => a.id === selectedArtifact)?.preview ||
                    'Artifact content would appear here...'}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-claude-neutral-400">
            <div className="text-center">
              <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select an artifact to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
