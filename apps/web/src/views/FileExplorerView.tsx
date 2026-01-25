/**
 * FileExplorerView - Browse Repository Files
 *
 * Browse repository file structure with dependency visualization.
 * Shows file tree, file details, and import graph.
 *
 * @prompt-id forge-v4.1:web:view:file-explorer:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useMemo } from 'react';
import {
  FileCode,
  Search,
  GitBranch,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  Code,
} from 'lucide-react';
import { FileTree } from '../components/codebase';
import { DependencyMiniGraph } from '../components/codebase';
import {
  listRepositories,
  listFiles,
  getFileDependencies,
  type Repository,
  type CodeFile,
  type DependencyNode,
  type FileType,
} from '../api/repositories';

const fileTypeLabels: Record<FileType, string> = {
  SOURCE: 'Source',
  TEST: 'Test',
  CONFIG: 'Config',
  DOCUMENTATION: 'Docs',
  GENERATED: 'Generated',
  OTHER: 'Other',
};

function FileDetailPanel({
  file,
  dependencies,
  onClose,
  onSelectFile,
}: {
  file: CodeFile;
  dependencies: DependencyNode | null;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
}) {
  const copyPath = () => {
    navigator.clipboard.writeText(file.path);
  };

  return (
    <div className="w-96 h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-white font-medium truncate">{file.filename}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Path */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Path</span>
            <button
              onClick={copyPath}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Copy path"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded block truncate">
            {file.path}
          </code>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Language</span>
            <span className="text-sm text-white font-medium">{file.language || 'Unknown'}</span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Type</span>
            <span className="text-sm text-white font-medium">{fileTypeLabels[file.fileType]}</span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Lines</span>
            <span className="text-sm text-white font-medium">{file.lineCount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Size</span>
            <span className="text-sm text-white font-medium">
              {(file.byteSize / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>

        {/* Last Modified */}
        <div>
          <span className="text-xs text-gray-500 block mb-1">Last Modified</span>
          <span className="text-sm text-gray-300">
            {new Date(file.lastModifiedAt).toLocaleString()}
          </span>
        </div>

        {/* Dependencies */}
        {dependencies && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">
              Dependencies
            </span>
            <DependencyMiniGraph
              node={dependencies}
              onSelectFile={onSelectFile}
              maxItems={5}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 border-t border-gray-700">
        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors">
          <Code className="w-4 h-4" />
          View Source
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          <ExternalLink className="w-4 h-4" />
          Open in Editor
        </button>
      </div>
    </div>
  );
}

export function FileExplorerView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [dependencies, setDependencies] = useState<DependencyNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<FileType | ''>('');
  const [loading, setLoading] = useState(true);

  // Load repositories
  useEffect(() => {
    async function loadRepos() {
      try {
        const result = await listRepositories({ status: 'ACTIVE' });
        setRepositories(result.data);
        if (result.data.length > 0 && !selectedRepoId) {
          setSelectedRepoId(result.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load repositories:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, []);

  // Load files when repository changes
  useEffect(() => {
    if (!selectedRepoId) {
      setFiles([]);
      return;
    }

    async function loadFiles() {
      try {
        const result = await listFiles(selectedRepoId!, { limit: 1000 });
        setFiles(result.data);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    }
    loadFiles();
  }, [selectedRepoId]);

  // Load dependencies when file is selected
  useEffect(() => {
    if (!selectedFile || !selectedRepoId) {
      setDependencies(null);
      return;
    }

    async function loadDependencies() {
      try {
        const deps = await getFileDependencies(selectedRepoId!, selectedFile!.id, {
          direction: 'both',
          depth: 1,
        });
        setDependencies(deps);
      } catch (error) {
        console.error('Failed to load dependencies:', error);
      }
    }
    loadDependencies();
  }, [selectedFile, selectedRepoId]);

  // Get unique languages for filter
  const languages = useMemo(() => {
    const langs = new Set(files.map(f => f.language).filter(Boolean));
    return Array.from(langs).sort();
  }, [files]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      if (languageFilter && file.language !== languageFilter) return false;
      if (typeFilter && file.fileType !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return file.path.toLowerCase().includes(query);
      }
      return true;
    });
  }, [files, languageFilter, typeFilter, searchQuery]);

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  const handleSelectFile = (file: CodeFile) => {
    setSelectedFile(file);
  };

  const handleSelectFileById = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - File Tree */}
      <div className="w-80 flex flex-col border-r border-gray-700 bg-gray-900/50">
        {/* Repository Selector */}
        <div className="p-3 border-b border-gray-700">
          <select
            value={selectedRepoId || ''}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          >
            <option value="">Select repository...</option>
            {repositories.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b border-gray-700 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
            >
              <option value="">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FileType | '')}
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
            >
              <option value="">All Types</option>
              {Object.entries(fileTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-hidden">
          {selectedRepoId ? (
            <FileTree
              files={filteredFiles}
              selectedFileId={selectedFile?.id}
              onSelectFile={handleSelectFile}
              showStats
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a repository
            </div>
          )}
        </div>
      </div>

      {/* Center - Main Content */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 text-sm">
          <GitBranch className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500">{selectedRepo?.name || 'No repository'}</span>
          {selectedFile && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <span className="text-gray-300">{selectedFile.path}</span>
            </>
          )}
        </div>

        {/* Stats Bar */}
        {selectedRepoId && (
          <div className="flex items-center gap-6 px-4 py-3 border-b border-gray-700 bg-gray-800/30">
            <div className="text-sm">
              <span className="text-gray-500">Files: </span>
              <span className="text-white font-medium">{filteredFiles.length}</span>
              {filteredFiles.length !== files.length && (
                <span className="text-gray-500"> / {files.length}</span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Lines: </span>
              <span className="text-white font-medium">
                {filteredFiles.reduce((acc, f) => acc + f.lineCount, 0).toLocaleString()}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Size: </span>
              <span className="text-white font-medium">
                {(filteredFiles.reduce((acc, f) => acc + f.byteSize, 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center">
          {!selectedRepoId ? (
            <div className="text-center">
              <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Repository</h3>
              <p className="text-gray-500">Choose a repository to explore its file structure</p>
            </div>
          ) : !selectedFile ? (
            <div className="text-center">
              <FileCode className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Select a File</h3>
              <p className="text-gray-500">Click on a file in the tree to view its details</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400">File content preview coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - File Details */}
      {selectedFile && (
        <FileDetailPanel
          file={selectedFile}
          dependencies={dependencies}
          onClose={() => setSelectedFile(null)}
          onSelectFile={handleSelectFileById}
        />
      )}
    </div>
  );
}

export default FileExplorerView;
