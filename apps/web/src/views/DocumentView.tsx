/**
 * DocumentView - Rich text editor for context documents
 * Knowledge editing with markdown support
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Search,
  Plus,
  ChevronRight,
  Star,
  Clock,
  User,
  Link2,
  Target,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Save,
  Edit3,
  MoreHorizontal,
} from 'lucide-react';
import type { ContextDoc, Intent } from '../data/enterprise-data';

interface DocumentViewProps {
  context: ContextDoc[];
  intents: Intent[];
  onContextClick?: (doc: ContextDoc) => void;
  onCreateContext?: () => void;
  onSaveContext?: (doc: ContextDoc) => void;
}

export function DocumentView({
  context,
  intents,
  onContextClick,
  onCreateContext,
  onSaveContext,
}: DocumentViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<ContextDoc | null>(
    context.length > 0 ? context[0] : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Group docs by type
  const groupedDocs = useMemo(() => {
    const groups: Record<string, ContextDoc[]> = {};

    context.forEach(doc => {
      const category = doc.type || 'document';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(doc);
    });

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      Object.keys(groups).forEach(category => {
        groups[category] = groups[category].filter(
          doc =>
            doc.name.toLowerCase().includes(query) ||
            doc.content?.toLowerCase().includes(query)
        );
        if (groups[category].length === 0) {
          delete groups[category];
        }
      });
    }

    return groups;
  }, [context, searchQuery]);

  const handleDocSelect = (doc: ContextDoc) => {
    setSelectedDoc(doc);
    setIsEditing(false);
    setEditContent(doc.content || '');
    onContextClick?.(doc);
  };

  const handleStartEdit = () => {
    if (selectedDoc) {
      setEditContent(selectedDoc.content || '');
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (selectedDoc && onSaveContext) {
      onSaveContext({
        ...selectedDoc,
        content: editContent,
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-claude-neutral-900">
      {/* Sidebar - Document Tree */}
      <div className="w-72 flex-shrink-0 border-r border-claude-neutral-800 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-claude-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
            />
          </div>
        </div>

        {/* Document Tree */}
        <div className="flex-1 overflow-auto p-2">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <div key={category} className="mb-4">
              <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-claude-neutral-500 uppercase tracking-wider">
                <ChevronRight className="w-3 h-3" />
                {category.replace('-', ' ')}
                <span className="ml-auto text-claude-neutral-600">{docs.length}</span>
              </div>
              <div className="space-y-0.5">
                {docs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocSelect(doc)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors',
                      selectedDoc?.id === doc.id
                        ? 'bg-claude-primary-500/20 text-claude-primary-400'
                        : 'text-claude-neutral-300 hover:bg-claude-neutral-800'
                    )}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{doc.name}</span>
                    {doc.freshness === 'current' && (
                      <Star className="w-3 h-3 text-yellow-400 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedDocs).length === 0 && (
            <div className="text-center text-claude-neutral-500 py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents found</p>
            </div>
          )}
        </div>

        {/* Add Document */}
        <div className="p-3 border-t border-claude-neutral-800">
          <button
            onClick={onCreateContext}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-claude-neutral-800 hover:bg-claude-neutral-700 text-claude-neutral-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Document</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {selectedDoc ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Document Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
            <div>
              <h1 className="text-xl font-semibold text-claude-neutral-100">
                {selectedDoc.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-xs text-claude-neutral-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {selectedDoc.author || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Verified {selectedDoc.lastVerified ? new Date(selectedDoc.lastVerified).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-neutral-800 text-claude-neutral-300 rounded-lg text-sm hover:bg-claude-neutral-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Editor Toolbar */}
          {isEditing && (
            <div className="flex items-center gap-1 px-6 py-2 border-b border-claude-neutral-800 bg-claude-neutral-850">
              {[
                { icon: Bold, title: 'Bold' },
                { icon: Italic, title: 'Italic' },
                { icon: Code, title: 'Code' },
                'divider',
                { icon: Heading1, title: 'Heading 1' },
                { icon: Heading2, title: 'Heading 2' },
                { icon: Heading3, title: 'Heading 3' },
                'divider',
                { icon: List, title: 'Bullet List' },
                { icon: ListOrdered, title: 'Numbered List' },
                { icon: Quote, title: 'Quote' },
                'divider',
                { icon: Link2, title: 'Link' },
                { icon: Image, title: 'Image' },
                { icon: Table, title: 'Table' },
              ].map((item, i) =>
                item === 'divider' ? (
                  <div key={i} className="w-px h-5 bg-claude-neutral-700 mx-1" />
                ) : (
                  <button
                    key={i}
                    className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded transition-colors"
                    title={(item as { title: string }).title}
                  >
                    {(() => {
                      const Icon = (item as { icon: typeof Bold }).icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </button>
                )
              )}
            </div>
          )}

          {/* Document Content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto px-6 py-6">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[500px] bg-transparent text-claude-neutral-200 text-base leading-relaxed resize-none focus:outline-none font-mono"
                  placeholder="Start writing..."
                />
              ) : (
                <div className="prose prose-invert prose-claude max-w-none">
                  {/* Render markdown content */}
                  <div className="whitespace-pre-wrap text-claude-neutral-200 leading-relaxed">
                    {selectedDoc.content || (
                      <span className="text-claude-neutral-500 italic">
                        No content yet. Click Edit to start writing.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Related Intents */}
              {!isEditing && intents.length > 0 && (
                <div className="mt-8 pt-6 border-t border-claude-neutral-800">
                  <h3 className="text-sm font-medium text-claude-neutral-400 mb-3">
                    Related Intents
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {intents.slice(0, 5).map(intent => (
                      <div
                        key={intent.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm"
                      >
                        <Target className="w-3 h-3" />
                        {intent.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-claude-neutral-500">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg mb-1">No document selected</p>
            <p className="text-sm">Select a document from the sidebar or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
