/**
 * Detail Panel - Enterprise-grade detail views for all entity types
 * Shows rich data including OKRs, ADRs, metrics, PRs, and full content
 */

import { useState, useEffect } from 'react';
import {
  X, Edit2, Trash2, Save, ExternalLink, GitPullRequest,
  TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertTriangle, FileText, GitBranch, Tag,
  Calendar, Link2, ChevronDown, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import type {
  Project, Intent, Slice, ContextDoc, Artifact,
  SuccessMetric, PullRequest
} from '../../data/enterprise-data';

type DetailType = 'project' | 'intent' | 'slice' | 'context' | 'artifact';

interface DetailPanelProps {
  type: DetailType;
  item: Project | Intent | Slice | ContextDoc | Artifact | null;
  onClose: () => void;
  onSave: (item: Project | Intent | Slice | ContextDoc | Artifact) => void;
  onDelete: (id: string) => void;
}

export function DetailPanel({ type, item, onClose, onSave, onDelete }: DetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true,
    metrics: true,
    keyResults: true,
    decision: true,
    criteria: true,
    prs: true,
    lineage: false,
  });

  useEffect(() => {
    setEditedItem(item);
    setIsEditing(false);
  }, [item, type]);

  if (!item) return null;

  const handleSave = () => {
    if (editedItem) {
      onSave(editedItem);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      onDelete(item.id);
      onClose();
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ==========================================================================
  // PROJECT DETAIL
  // ==========================================================================
  const renderProjectDetail = () => {
    const project = (isEditing ? editedItem : item) as Project;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          {isEditing ? (
            <input
              type="text"
              value={project.name}
              onChange={(e) => setEditedItem({ ...project, name: e.target.value })}
              className="w-full text-lg font-semibold px-2 py-1 rounded border border-claude-primary-300 bg-white dark:bg-claude-neutral-800"
            />
          ) : (
            <h2 className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {project.name}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={project.status} />
            {project.jiraProject && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                {project.jiraProject}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label>Description</Label>
          {isEditing ? (
            <textarea
              value={project.description}
              onChange={(e) => setEditedItem({ ...project, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-claude-cream-300 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800 text-sm"
            />
          ) : (
            <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{project.description}</p>
          )}
        </div>

        {/* Repositories */}
        {project.repositories && project.repositories.length > 0 && (
          <div>
            <Label>Repositories</Label>
            <div className="space-y-2">
              {project.repositories.map(repo => (
                <div key={repo.id} className="flex items-center justify-between p-2 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-claude-neutral-400" />
                    <span className="text-sm font-mono">{repo.name}</span>
                    <span className="text-xs text-claude-neutral-400">{repo.language}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {repo.openPRs !== undefined && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        {repo.openPRs} PRs
                      </span>
                    )}
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-claude-primary-500 hover:text-claude-primary-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intents Summary */}
        {project.intents && project.intents.length > 0 && (
          <div>
            <Label>Project Intents ({project.intents.length})</Label>
            <div className="space-y-1">
              {project.intents.map(intent => (
                <div key={intent.id} className="flex items-center gap-2 p-2 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded text-sm">
                  <IntentTypeBadge type={intent.type} />
                  <span className="flex-1 truncate">{intent.name}</span>
                  <PriorityBadge priority={intent.priority} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artifacts Summary */}
        {project.artifacts && project.artifacts.length > 0 && (
          <div>
            <Label>Artifacts ({project.artifacts.length})</Label>
            <div className="space-y-1">
              {project.artifacts.map(artifact => (
                <div key={artifact.id} className="flex items-center gap-2 p-2 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded text-sm">
                  <FileText className="w-4 h-4 text-claude-neutral-400" />
                  <span className="flex-1 truncate">{artifact.name}</span>
                  <ArtifactStatusBadge status={artifact.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-claude-cream-200 dark:border-claude-neutral-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-claude-neutral-400">Created</span>
              <p className="text-claude-neutral-600 dark:text-claude-neutral-300">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-claude-neutral-400">Updated</span>
              <p className="text-claude-neutral-600 dark:text-claude-neutral-300">
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // INTENT DETAIL
  // ==========================================================================
  const renderIntentDetail = () => {
    const intent = (isEditing ? editedItem : item) as Intent;
    const isOKR = intent.type === 'okr';
    const isADR = intent.type === 'adr';

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          {isEditing ? (
            <input
              type="text"
              value={intent.name}
              onChange={(e) => setEditedItem({ ...intent, name: e.target.value })}
              className="w-full text-lg font-semibold px-2 py-1 rounded border border-claude-primary-300 bg-white dark:bg-claude-neutral-800"
            />
          ) : (
            <h2 className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {intent.name}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <IntentTypeBadge type={intent.type} />
            <PriorityBadge priority={intent.priority} />
            <IntentStatusBadge status={intent.status} />
            {intent.source && (
              <span className="text-xs text-claude-neutral-400">from {intent.source}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {intent.description && (
          <div>
            <Label>Description</Label>
            {isEditing ? (
              <textarea
                value={intent.description}
                onChange={(e) => setEditedItem({ ...intent, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-claude-cream-300 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800 text-sm"
              />
            ) : (
              <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{intent.description}</p>
            )}
          </div>
        )}

        {/* OKR Progress */}
        {isOKR && intent.progress !== undefined && (
          <div>
            <Label>Progress</Label>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-claude-neutral-600 dark:text-claude-neutral-300">Overall</span>
                <span className="font-medium">{intent.progress}%</span>
              </div>
              <div className="w-full bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full h-2">
                <div
                  className="bg-claude-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${intent.progress}%` }}
                />
              </div>
            </div>
            {intent.dueDate && (
              <div className="flex items-center gap-2 mt-2 text-sm text-claude-neutral-500">
                <Calendar className="w-4 h-4" />
                <span>Due {new Date(intent.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Key Results */}
        {isOKR && intent.keyResults && intent.keyResults.length > 0 && (
          <div>
            <SectionHeader
              title="Key Results"
              expanded={expandedSections.keyResults}
              onToggle={() => toggleSection('keyResults')}
            />
            {expandedSections.keyResults && (
              <div className="space-y-3 mt-2">
                {intent.keyResults.map((kr, idx) => (
                  <div key={kr.id} className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-claude-neutral-400">KR{idx + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-claude-neutral-700 dark:text-claude-neutral-200">{kr.description}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{kr.current} / {kr.target} {kr.unit}</span>
                            <span>{Math.round((kr.current / kr.target) * 100)}%</span>
                          </div>
                          <div className="w-full bg-claude-cream-200 dark:bg-claude-neutral-600 rounded-full h-1.5">
                            <div
                              className={clsx(
                                'h-1.5 rounded-full',
                                kr.current >= kr.target ? 'bg-green-500' : 'bg-claude-primary-500'
                              )}
                              style={{ width: `${Math.min((kr.current / kr.target) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success Metrics */}
        {intent.successMetrics && intent.successMetrics.length > 0 && (
          <div>
            <SectionHeader
              title="Success Metrics"
              expanded={expandedSections.metrics}
              onToggle={() => toggleSection('metrics')}
            />
            {expandedSections.metrics && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {intent.successMetrics.map(metric => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADR Details */}
        {isADR && intent.decisionDetails && (
          <div>
            <SectionHeader
              title="Decision Record"
              expanded={expandedSections.decision}
              onToggle={() => toggleSection('decision')}
            />
            {expandedSections.decision && (
              <div className="mt-2 space-y-4">
                <ADRStatusBadge status={intent.decisionDetails.status} />

                <div>
                  <Label>Context</Label>
                  <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300 bg-claude-cream-50 dark:bg-claude-neutral-800 p-3 rounded-md">
                    {intent.decisionDetails.context}
                  </p>
                </div>

                <div>
                  <Label>Decision</Label>
                  <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300 bg-claude-cream-50 dark:bg-claude-neutral-800 p-3 rounded-md">
                    {intent.decisionDetails.decision}
                  </p>
                </div>

                {intent.decisionDetails.consequences.length > 0 && (
                  <div>
                    <Label>Consequences</Label>
                    <ul className="list-disc list-inside space-y-1 text-sm text-claude-neutral-600 dark:text-claude-neutral-300">
                      {intent.decisionDetails.consequences.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {intent.decisionDetails.alternatives.length > 0 && (
                  <div>
                    <Label>Alternatives Considered</Label>
                    <div className="space-y-3">
                      {intent.decisionDetails.alternatives.map((alt, i) => (
                        <div key={i} className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
                          <p className="font-medium text-sm mb-2">{alt.option}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-green-600 dark:text-green-400 font-medium">Pros</span>
                              <ul className="list-disc list-inside mt-1 text-claude-neutral-500">
                                {alt.pros.map((p, j) => <li key={j}>{p}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="text-red-600 dark:text-red-400 font-medium">Cons</span>
                              <ul className="list-disc list-inside mt-1 text-claude-neutral-500">
                                {alt.cons.map((c, j) => <li key={j}>{c}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // SLICE DETAIL
  // ==========================================================================
  const renderSliceDetail = () => {
    const slice = (isEditing ? editedItem : item) as Slice;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-claude-primary-600 dark:text-claude-primary-400">{slice.shortId}</span>
            {slice.jiraKey && (
              <a href={`https://jira.salesforce.com/browse/${slice.jiraKey}`} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                {slice.jiraKey} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={slice.name}
              onChange={(e) => setEditedItem({ ...slice, name: e.target.value })}
              className="w-full text-lg font-semibold px-2 py-1 rounded border border-claude-primary-300 bg-white dark:bg-claude-neutral-800"
            />
          ) : (
            <h2 className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {slice.name}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <SliceStatusBadge status={slice.status} />
            <PriorityBadge priority={slice.priority} />
            {slice.storyPoints && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                {slice.storyPoints} pts
              </span>
            )}
          </div>
        </div>

        {/* Blocked Warning */}
        {slice.status === 'blocked' && slice.blockedReason && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium text-sm">Blocked</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{slice.blockedReason}</p>
          </div>
        )}

        {/* Description */}
        <div>
          <Label>Description</Label>
          {isEditing ? (
            <textarea
              value={slice.description}
              onChange={(e) => setEditedItem({ ...slice, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-claude-cream-300 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800 text-sm"
            />
          ) : (
            <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{slice.description}</p>
          )}
        </div>

        {/* Assignee */}
        <div>
          <Label>Assignee</Label>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center text-white text-xs font-medium">
              {slice.assignee.avatar}
            </div>
            <div>
              <p className="text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200">{slice.assignee.name}</p>
              <p className="text-xs text-claude-neutral-400">{slice.assignee.title}</p>
            </div>
          </div>
        </div>

        {/* Due Date */}
        {slice.dueDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-claude-neutral-400" />
            <span className="text-claude-neutral-600 dark:text-claude-neutral-300">
              Due {new Date(slice.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Labels */}
        {slice.labels && slice.labels.length > 0 && (
          <div>
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {slice.labels.map(label => (
                <span key={label} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded">
                  <Tag className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Criteria */}
        {slice.acceptanceCriteria && slice.acceptanceCriteria.length > 0 && (
          <div>
            <SectionHeader
              title="Acceptance Criteria"
              expanded={expandedSections.criteria}
              onToggle={() => toggleSection('criteria')}
            />
            {expandedSections.criteria && (
              <ul className="mt-2 space-y-2">
                {slice.acceptanceCriteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-claude-neutral-400 mt-0.5 flex-shrink-0" />
                    <span className="text-claude-neutral-600 dark:text-claude-neutral-300">{criterion}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Pull Requests */}
        {slice.pullRequests && slice.pullRequests.length > 0 && (
          <div>
            <SectionHeader
              title="Pull Requests"
              expanded={expandedSections.prs}
              onToggle={() => toggleSection('prs')}
            />
            {expandedSections.prs && (
              <div className="space-y-2 mt-2">
                {slice.pullRequests.map(pr => (
                  <PRCard key={pr.id} pr={pr} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // CONTEXT DOC DETAIL
  // ==========================================================================
  const renderContextDetail = () => {
    const doc = (isEditing ? editedItem : item) as ContextDoc;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          {isEditing ? (
            <input
              type="text"
              value={doc.name}
              onChange={(e) => setEditedItem({ ...doc, name: e.target.value })}
              className="w-full text-lg font-semibold px-2 py-1 rounded border border-claude-primary-300 bg-white dark:bg-claude-neutral-800"
            />
          ) : (
            <h2 className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {doc.name}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <DocTypeBadge type={doc.type} />
            <FreshnessBadge freshness={doc.freshness} />
            <span className="text-xs text-claude-neutral-400">from {doc.source}</span>
          </div>
        </div>

        {/* External Link */}
        {doc.externalUrl && (
          <a href={doc.externalUrl} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 text-sm text-claude-primary-500 hover:text-claude-primary-600">
            <Link2 className="w-4 h-4" />
            Open in {doc.source}
          </a>
        )}

        {/* Summary */}
        {doc.summary && (
          <div>
            <Label>Summary</Label>
            <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{doc.summary}</p>
          </div>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {doc.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {doc.content && (
          <div>
            <SectionHeader
              title="Content"
              expanded={expandedSections.content}
              onToggle={() => toggleSection('content')}
            />
            {expandedSections.content && (
              <div className="mt-2 p-4 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md overflow-auto max-h-96">
                <pre className="text-xs text-claude-neutral-700 dark:text-claude-neutral-300 whitespace-pre-wrap font-mono">
                  {doc.content}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
            <p className="text-xs text-claude-neutral-400">Usage Count</p>
            <p className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {doc.usageCount.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
            <p className="text-xs text-claude-neutral-400">Effectiveness</p>
            <p className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {(doc.effectivenessScore * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-claude-cream-200 dark:border-claude-neutral-700 space-y-2 text-xs">
          {doc.version && (
            <div className="flex justify-between">
              <span className="text-claude-neutral-400">Version</span>
              <span className="text-claude-neutral-600 dark:text-claude-neutral-300">{doc.version}</span>
            </div>
          )}
          {doc.author && (
            <div className="flex justify-between">
              <span className="text-claude-neutral-400">Author</span>
              <span className="text-claude-neutral-600 dark:text-claude-neutral-300">{doc.author}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-claude-neutral-400">Last Verified</span>
            <span className="text-claude-neutral-600 dark:text-claude-neutral-300">
              {new Date(doc.lastVerified).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // ARTIFACT DETAIL
  // ==========================================================================
  const renderArtifactDetail = () => {
    const artifact = (isEditing ? editedItem : item) as Artifact;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          {isEditing ? (
            <input
              type="text"
              value={artifact.name}
              onChange={(e) => setEditedItem({ ...artifact, name: e.target.value })}
              className="w-full text-lg font-semibold px-2 py-1 rounded border border-claude-primary-300 bg-white dark:bg-claude-neutral-800"
            />
          ) : (
            <h2 className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {artifact.name}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ArtifactTypeBadge type={artifact.type} />
            <ArtifactStatusBadge status={artifact.status} />
            <span className="text-xs text-claude-neutral-400">v{artifact.version}</span>
          </div>
        </div>

        {/* Tags */}
        {artifact.tags && artifact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {artifact.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Preview or Content */}
        {artifact.content ? (
          <div>
            <SectionHeader
              title="Content"
              expanded={expandedSections.content}
              onToggle={() => toggleSection('content')}
            />
            {expandedSections.content && (
              <div className="mt-2 p-4 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md overflow-auto max-h-96">
                <pre className="text-xs text-claude-neutral-700 dark:text-claude-neutral-300 whitespace-pre-wrap font-mono">
                  {artifact.content}
                </pre>
              </div>
            )}
          </div>
        ) : artifact.preview ? (
          <div>
            <Label>Preview</Label>
            <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{artifact.preview}</p>
          </div>
        ) : null}

        {/* Reviews */}
        {artifact.reviews && artifact.reviews.length > 0 && (
          <div>
            <Label>Reviews</Label>
            <div className="space-y-2 mt-1">
              {artifact.reviews.map(review => (
                <div key={review.id} className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{review.reviewer}</span>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  <p className="text-sm text-claude-neutral-600 dark:text-claude-neutral-300">{review.comments}</p>
                  <p className="text-xs text-claude-neutral-400 mt-2">
                    {new Date(review.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lineage */}
        {artifact.lineage && artifact.lineage.length > 0 && (
          <div>
            <SectionHeader
              title="History"
              expanded={expandedSections.lineage}
              onToggle={() => toggleSection('lineage')}
            />
            {expandedSections.lineage && (
              <div className="mt-2 space-y-2">
                {artifact.lineage.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-claude-primary-400 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-claude-neutral-700 dark:text-claude-neutral-200">
                        <span className="font-medium">{entry.user}</span> {entry.action}
                        {entry.details && <span className="text-claude-neutral-400"> - {entry.details}</span>}
                      </p>
                      <p className="text-xs text-claude-neutral-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-claude-cream-200 dark:border-claude-neutral-700 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-claude-neutral-400">Created by</span>
            <span className="text-claude-neutral-600 dark:text-claude-neutral-300">{artifact.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-claude-neutral-400">Created</span>
            <span className="text-claude-neutral-600 dark:text-claude-neutral-300">
              {new Date(artifact.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-claude-neutral-400">Updated</span>
            <span className="text-claude-neutral-600 dark:text-claude-neutral-300">
              {new Date(artifact.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    switch (type) {
      case 'project': return renderProjectDetail();
      case 'intent': return renderIntentDetail();
      case 'slice': return renderSliceDetail();
      case 'context': return renderContextDetail();
      case 'artifact': return renderArtifactDetail();
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'project': return 'Project';
      case 'intent': return 'Intent';
      case 'slice': return 'Work Item';
      case 'context': return 'Context Document';
      case 'artifact': return 'Artifact';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-claude-neutral-900 border-l border-claude-cream-300 dark:border-claude-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-800 bg-claude-cream-50 dark:bg-claude-neutral-800/50">
        <h3 className="font-medium text-sm text-claude-neutral-500 dark:text-claude-neutral-400 uppercase tracking-wide">
          {getTitle()}
        </h3>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md bg-claude-primary-500 text-white hover:bg-claude-primary-600 transition-colors"
              title="Save changes"
            >
              <Save className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md text-claude-neutral-500 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-claude-neutral-500 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderDetail()}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-claude-neutral-500 dark:text-claude-neutral-400 uppercase tracking-wide mb-1">
      {children}
    </p>
  );
}

function SectionHeader({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200 hover:text-claude-primary-500">
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {title}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize', config[status])}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium capitalize', config[priority])}>{priority}</span>;
}

function IntentTypeBadge({ type }: { type: string }) {
  const config: Record<string, { color: string; label: string }> = {
    goal: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Goal' },
    constraint: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Constraint' },
    behavior: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Behavior' },
    principle: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Principle' },
    okr: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'OKR' },
    adr: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'ADR' },
  };
  const c = config[type] || config.goal;
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', c.color)}>{c.label}</span>;
}

function IntentStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    achieved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    deprecated: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium capitalize', config[status])}>{status}</span>;
}

function SliceStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    ready: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', config[status])}>{status.replace('_', ' ')}</span>;
}

function DocTypeBadge({ type }: { type: string }) {
  return <span className="text-xs px-2 py-0.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded font-medium capitalize">{type.replace('-', ' ')}</span>;
}

function FreshnessBadge({ freshness }: { freshness: string }) {
  const config: Record<string, string> = {
    current: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    stale: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    outdated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium capitalize', config[freshness])}>{freshness}</span>;
}

function ArtifactTypeBadge({ type }: { type: string }) {
  return <span className="text-xs px-2 py-0.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded font-medium capitalize">{type.replace('-', ' ')}</span>;
}

function ArtifactStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium capitalize', config[status])}>{status}</span>;
}

function ADRStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    proposed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    deprecated: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    superseded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium capitalize', config[status])}>Status: {status}</span>;
}

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'changes-requested': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', config[status])}>{status.replace('-', ' ')}</span>;
}

function MetricCard({ metric }: { metric: SuccessMetric }) {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
      <p className="text-xs text-claude-neutral-400 truncate">{metric.name}</p>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-lg font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">{metric.current}</p>
          <p className="text-xs text-claude-neutral-400">target: {metric.target}</p>
        </div>
        <TrendIcon className={clsx('w-4 h-4', trendColor)} />
      </div>
    </div>
  );
}

function PRCard({ pr }: { pr: PullRequest }) {
  const statusConfig: Record<string, string> = {
    open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    merged: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  const checksConfig: Record<string, string> = {
    pending: 'text-yellow-500',
    passing: 'text-green-500',
    failing: 'text-red-500',
  };

  return (
    <div className="p-3 bg-claude-cream-50 dark:bg-claude-neutral-800 rounded-md">
      <div className="flex items-start gap-2">
        <GitPullRequest className="w-4 h-4 text-claude-neutral-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-claude-primary-600 dark:text-claude-primary-400 hover:underline">
            #{pr.number} {pr.title}
          </a>
          <div className="flex items-center gap-2 mt-1 text-xs text-claude-neutral-400">
            <span>{pr.author}</span>
            <span className={clsx('px-1.5 py-0.5 rounded', statusConfig[pr.status])}>{pr.status}</span>
            <span className={checksConfig[pr.checksStatus]}>
              {pr.checksStatus === 'passing' ? '✓' : pr.checksStatus === 'failing' ? '✗' : '○'} checks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CREATE FORM
// =============================================================================

interface CreateFormProps {
  type: 'project' | 'intent' | 'slice' | 'context';
  projectId?: string;
  teamId?: string;
  onClose: () => void;
  onCreate: (item: unknown) => void;
}

export function CreateForm({ type, projectId, teamId, onClose, onCreate }: CreateFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({ name: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `${type}-${Date.now()}`;
    const now = new Date().toISOString();

    let newItem: unknown;
    switch (type) {
      case 'project':
        newItem = { id, teamId: teamId || '', name: formData.name, description: formData.description, status: 'active', intents: [], context: [], artifacts: [], repositories: [], createdAt: now, updatedAt: now };
        break;
      case 'intent':
        newItem = { id, name: formData.name, description: formData.description, type: 'goal', priority: 'medium', status: 'active', source: 'project', createdBy: 'user-1', createdAt: now };
        break;
      case 'slice':
        newItem = { id, projectId: projectId || '', shortId: `SL-${Math.floor(Math.random() * 1000)}`, name: formData.name, description: formData.description, status: 'backlog', priority: 'medium', createdAt: now, updatedAt: now };
        break;
      case 'context':
        newItem = { id, name: formData.name, type: 'document', source: 'manual', freshness: 'current', lastVerified: now, usageCount: 0, effectivenessScore: 0 };
        break;
    }

    onCreate(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-claude-neutral-900 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-800">
          <h3 className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100 capitalize">Create New {type}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-claude-neutral-500 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200 mb-1">Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
              className="w-full px-3 py-2 rounded-md border border-claude-cream-300 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-200 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 rounded-md border border-claude-cream-300 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md text-claude-neutral-600 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-md bg-claude-primary-500 text-white hover:bg-claude-primary-600">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
