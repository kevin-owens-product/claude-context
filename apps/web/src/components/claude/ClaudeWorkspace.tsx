/**
 * ClaudeWorkspace - Claude as the central intelligence connecting:
 * Intent → Work → Code → Artifacts → Collaboration
 *
 * Claude understands and surfaces the relationships between all aspects
 * of your software development work.
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  Target,
  FileText,
  Code2,
  GitPullRequest,
  GitCommit,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  Link2,
  ChevronRight,
  Lightbulb,
  Zap,
  ExternalLink,
  MessageSquare,
  Eye,
  Users,
  Layers,
  FileCode,
  Image,
  FileJson,
  Play,
  CheckCircle2,
  Clock,
  Radio,
  Mic,
  Video,
} from 'lucide-react';
import type { Slice, Intent, ContextDoc, Artifact, Project } from '../../data/enterprise-data';

interface ClaudeInsight {
  id: string;
  type: 'risk' | 'suggestion' | 'connection' | 'progress' | 'blocker';
  title: string;
  description: string;
  relatedItems: Array<{
    type: 'slice' | 'intent' | 'context' | 'artifact' | 'pr' | 'code';
    id: string;
    name: string;
  }>;
}

interface ClaudeWorkspaceProps {
  project: Project;
  slices: Slice[];
  intents: Intent[];
  context: ContextDoc[];
  artifacts: Artifact[];
  selectedSlice?: Slice | null;
  onSelectIntent: (intent: Intent) => void;
  onSelectContext: (doc: ContextDoc) => void;
}

export function ClaudeWorkspace({
  project,
  slices,
  intents,
  context,
  artifacts,
  selectedSlice,
  onSelectIntent,
  onSelectContext,
}: ClaudeWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'understand' | 'code' | 'artifacts' | 'cowork'>('understand');

  // Generate Claude's understanding
  const insights = useMemo(() => generateInsights(slices, intents, context, artifacts), [slices, intents, context, artifacts]);
  const health = useMemo(() => calculateProjectHealth(slices, intents), [slices, intents]);

  // Code activity
  const codeActivity = useMemo(() => getCodeActivity(slices), [slices]);

  // Active collaborators (simulated)
  const collaborators = useMemo(() => getActiveCollaborators(slices), [slices]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-claude-neutral-900 to-claude-neutral-950">
      {/* Claude Header */}
      <div className="px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-claude-neutral-100 text-sm">Claude</h2>
            <p className="text-xs text-claude-neutral-500">{project.name}</p>
          </div>
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-xs text-green-400">{collaborators.length} active</span>
            </div>
          )}
        </div>

        {/* Quick Health */}
        <div className="flex items-center gap-3 text-xs">
          <HealthBadge label="Goals" value={health.goalsOnTrack} total={health.totalGoals} color="green" />
          <HealthBadge label="PRs" value={codeActivity.openPRs} color="purple" />
          <HealthBadge label="Artifacts" value={artifacts.length} color="blue" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-claude-neutral-800">
        <TabButton
          active={activeTab === 'understand'}
          onClick={() => setActiveTab('understand')}
          icon={<Eye className="w-3.5 h-3.5" />}
          label="Understand"
        />
        <TabButton
          active={activeTab === 'code'}
          onClick={() => setActiveTab('code')}
          icon={<Code2 className="w-3.5 h-3.5" />}
          label="Code"
          badge={codeActivity.openPRs > 0 ? codeActivity.openPRs : undefined}
        />
        <TabButton
          active={activeTab === 'artifacts'}
          onClick={() => setActiveTab('artifacts')}
          icon={<Layers className="w-3.5 h-3.5" />}
          label="Artifacts"
          badge={artifacts.length > 0 ? artifacts.length : undefined}
        />
        <TabButton
          active={activeTab === 'cowork'}
          onClick={() => setActiveTab('cowork')}
          icon={<Users className="w-3.5 h-3.5" />}
          label="CoWork"
          badge={collaborators.length > 0 ? collaborators.length : undefined}
          badgeColor="green"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'understand' && (
          <UnderstandTab
            project={project}
            slices={slices}
            intents={intents}
            context={context}
            insights={insights}
            selectedSlice={selectedSlice}
            onSelectIntent={onSelectIntent}
            onSelectContext={onSelectContext}
          />
        )}

        {activeTab === 'code' && (
          <CodeTab
            slices={slices}
            codeActivity={codeActivity}
            selectedSlice={selectedSlice}
          />
        )}

        {activeTab === 'artifacts' && (
          <ArtifactsTab artifacts={artifacts} />
        )}

        {activeTab === 'cowork' && (
          <CoWorkTab
            collaborators={collaborators}
            slices={slices}
            project={project}
          />
        )}
      </div>

      {/* Quick Ask */}
      <div className="p-3 border-t border-claude-neutral-800">
        <div className="relative">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
          <input
            type="text"
            placeholder="Ask Claude about this project..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-claude-neutral-800 rounded-lg border border-claude-neutral-700 text-claude-neutral-100 placeholder-claude-neutral-500 focus:outline-none focus:ring-1 focus:ring-claude-primary-500"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UNDERSTAND TAB - Intent, Work, and Documentation connections
// =============================================================================

interface UnderstandTabProps {
  project: Project;
  slices: Slice[];
  intents: Intent[];
  context: ContextDoc[];
  insights: ClaudeInsight[];
  selectedSlice?: Slice | null;
  onSelectIntent: (intent: Intent) => void;
  onSelectContext: (doc: ContextDoc) => void;
}

function UnderstandTab({
  project,
  slices,
  intents,
  context,
  insights,
  selectedSlice,
  onSelectIntent,
  onSelectContext,
}: UnderstandTabProps) {
  const activeGoals = intents.filter(i => i.type === 'goal' && i.status === 'active');
  const constraints = intents.filter(i => i.type === 'constraint');

  // If a slice is selected, show focused view
  if (selectedSlice) {
    const linkedIntent = selectedSlice.linkedIntent
      ? intents.find(i => i.id === selectedSlice.linkedIntent)
      : undefined;

    const relatedDocs = context.filter(c =>
      selectedSlice.labels?.some(l =>
        c.name.toLowerCase().includes(l.toLowerCase()) ||
        c.tags?.some(t => t.toLowerCase().includes(l.toLowerCase()))
      )
    );

    return (
      <div className="p-4 space-y-4">
        {/* Selected Slice Context */}
        <div className="bg-claude-primary-500/10 border border-claude-primary-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-claude-primary-400" />
            <span className="text-xs font-medium text-claude-primary-400 uppercase tracking-wider">
              Context for {selectedSlice.shortId}
            </span>
          </div>
          <h3 className="text-sm font-medium text-claude-neutral-100 mb-2">{selectedSlice.name}</h3>

          {linkedIntent && (
            <button
              onClick={() => onSelectIntent(linkedIntent)}
              className="flex items-center gap-2 w-full p-2 mt-2 bg-claude-neutral-800/50 rounded text-left hover:bg-claude-neutral-800 transition-colors"
            >
              <Target className="w-4 h-4 text-green-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-claude-neutral-400">Linked Goal</div>
                <div className="text-sm text-claude-neutral-200 truncate">{linkedIntent.name}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-claude-neutral-500" />
            </button>
          )}

          {!linkedIntent && (
            <div className="flex items-center gap-2 p-2 mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-400">Not linked to any goal</span>
            </div>
          )}
        </div>

        {/* Related Documentation */}
        {relatedDocs.length > 0 && (
          <Section title="Related Docs" icon={<FileText className="w-4 h-4 text-blue-500" />}>
            {relatedDocs.slice(0, 3).map(doc => (
              <DocRow key={doc.id} doc={doc} onClick={() => onSelectContext(doc)} />
            ))}
          </Section>
        )}

        {/* Constraints to Consider */}
        {constraints.length > 0 && (
          <Section title="Constraints" icon={<AlertTriangle className="w-4 h-4 text-red-500" />}>
            {constraints.slice(0, 2).map(c => (
              <button
                key={c.id}
                onClick={() => onSelectIntent(c)}
                className="w-full flex items-center gap-2 p-2 text-left hover:bg-claude-neutral-800/50 rounded transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-claude-neutral-300 flex-1 truncate">{c.name}</span>
              </button>
            ))}
          </Section>
        )}
      </div>
    );
  }

  // Default: Project overview
  return (
    <div className="p-4 space-y-4">
      {/* Claude's Summary */}
      <div className="bg-claude-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-claude-primary-400" />
          <span className="text-xs font-medium text-claude-primary-400">Project Understanding</span>
        </div>
        <p className="text-sm text-claude-neutral-300 leading-relaxed">
          <strong className="text-claude-neutral-100">{project.name}</strong> has{' '}
          <strong className="text-green-400">{activeGoals.length} active goals</strong> with{' '}
          <strong className="text-yellow-400">{slices.filter(s => s.status === 'in_progress').length} items in progress</strong>.
          {constraints.length > 0 && (
            <> Watch for <strong className="text-red-400">{constraints.length} constraints</strong>.</>
          )}
        </p>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Section title="Insights" icon={<Lightbulb className="w-4 h-4 text-yellow-500" />}>
          {insights.slice(0, 3).map(insight => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </Section>
      )}

      {/* Active Goals */}
      <Section title="Goals" icon={<Target className="w-4 h-4 text-green-500" />}>
        {activeGoals.slice(0, 3).map(goal => {
          const linkedSlices = slices.filter(s => s.linkedIntent === goal.id);
          const completed = linkedSlices.filter(s => s.status === 'completed').length;
          const progress = linkedSlices.length > 0 ? Math.round((completed / linkedSlices.length) * 100) : 0;

          return (
            <button
              key={goal.id}
              onClick={() => onSelectIntent(goal)}
              className="w-full p-2 text-left hover:bg-claude-neutral-800/50 rounded transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-claude-neutral-200 truncate">{goal.name}</span>
                <span className="text-xs text-claude-neutral-500">{linkedSlices.length} items</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-claude-neutral-700 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-claude-neutral-500">{progress}%</span>
              </div>
            </button>
          );
        })}
      </Section>

      {/* Key Documentation */}
      <Section title="Key Docs" icon={<FileText className="w-4 h-4 text-blue-500" />}>
        {context.slice(0, 3).map(doc => (
          <DocRow key={doc.id} doc={doc} onClick={() => onSelectContext(doc)} />
        ))}
      </Section>
    </div>
  );
}

// =============================================================================
// CODE TAB - PRs, Commits, Branches, Files
// =============================================================================

interface CodeActivity {
  openPRs: number;
  recentCommits: number;
  activeBranches: string[];
  prs: Array<{
    id: string;
    number: number;
    title: string;
    author: string;
    status: 'open' | 'merged' | 'closed';
    checksStatus: 'passing' | 'failing' | 'pending';
    sliceId?: string;
    files: number;
    additions: number;
    deletions: number;
  }>;
}

interface CodeTabProps {
  slices: Slice[];
  codeActivity: CodeActivity;
  selectedSlice?: Slice | null;
}

function CodeTab({ codeActivity, selectedSlice }: CodeTabProps) {
  // If slice selected, show its PRs
  const relevantPRs = selectedSlice
    ? codeActivity.prs.filter(pr => pr.sliceId === selectedSlice.id)
    : codeActivity.prs;

  return (
    <div className="p-4 space-y-4">
      {/* Code Overview */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<GitPullRequest className="w-4 h-4 text-green-500" />}
          label="Open PRs"
          value={codeActivity.openPRs}
        />
        <StatCard
          icon={<GitCommit className="w-4 h-4 text-purple-500" />}
          label="Commits"
          value={codeActivity.recentCommits}
        />
        <StatCard
          icon={<GitBranch className="w-4 h-4 text-blue-500" />}
          label="Branches"
          value={codeActivity.activeBranches.length}
        />
      </div>

      {/* Selected Slice Context */}
      {selectedSlice && (
        <div className="bg-claude-primary-500/10 border border-claude-primary-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-claude-primary-400">
            <Code2 className="w-3.5 h-3.5" />
            <span>Code for {selectedSlice.shortId}</span>
          </div>
        </div>
      )}

      {/* Pull Requests */}
      <Section title="Pull Requests" icon={<GitPullRequest className="w-4 h-4 text-green-500" />}>
        {relevantPRs.length > 0 ? (
          relevantPRs.map(pr => (
            <div
              key={pr.id}
              className="p-3 bg-claude-neutral-800/30 rounded-lg hover:bg-claude-neutral-800/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <GitPullRequest className={clsx(
                  'w-4 h-4 mt-0.5',
                  pr.status === 'open' && 'text-green-500',
                  pr.status === 'merged' && 'text-purple-500',
                  pr.status === 'closed' && 'text-red-500',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-claude-neutral-200 font-medium">#{pr.number}</span>
                    <span className={clsx(
                      'text-xs px-1.5 py-0.5 rounded',
                      pr.checksStatus === 'passing' && 'bg-green-500/20 text-green-400',
                      pr.checksStatus === 'failing' && 'bg-red-500/20 text-red-400',
                      pr.checksStatus === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                    )}>
                      {pr.checksStatus}
                    </span>
                  </div>
                  <p className="text-sm text-claude-neutral-300 truncate mt-1">{pr.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-claude-neutral-500">
                    <span>{pr.author}</span>
                    <span className="text-green-400">+{pr.additions}</span>
                    <span className="text-red-400">-{pr.deletions}</span>
                    <span>{pr.files} files</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-sm text-claude-neutral-500">
            No pull requests {selectedSlice ? 'for this item' : 'yet'}
          </div>
        )}
      </Section>

      {/* Active Branches */}
      {codeActivity.activeBranches.length > 0 && (
        <Section title="Active Branches" icon={<GitBranch className="w-4 h-4 text-blue-500" />}>
          {codeActivity.activeBranches.map(branch => (
            <div key={branch} className="flex items-center gap-2 p-2 hover:bg-claude-neutral-800/50 rounded transition-colors">
              <GitBranch className="w-3.5 h-3.5 text-claude-neutral-500" />
              <code className="text-sm text-claude-neutral-300 font-mono">{branch}</code>
            </div>
          ))}
        </Section>
      )}

      {/* Claude's Code Insights */}
      <div className="bg-claude-neutral-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-claude-primary-400" />
          <span className="text-xs font-medium text-claude-primary-400">Code Insight</span>
        </div>
        <p className="text-sm text-claude-neutral-400">
          {codeActivity.prs.some(pr => pr.checksStatus === 'failing')
            ? 'There are failing checks on some PRs that need attention.'
            : codeActivity.openPRs > 3
            ? 'Consider reviewing open PRs to keep the review queue manageable.'
            : 'Code activity looks healthy.'}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// ARTIFACTS TAB - Documents, Diagrams, Code, Specs
// =============================================================================

interface ArtifactsTabProps {
  artifacts: Artifact[];
}

const artifactIcons: Record<string, React.ReactNode> = {
  code: <FileCode className="w-4 h-4 text-green-500" />,
  diagram: <Image className="w-4 h-4 text-purple-500" />,
  document: <FileText className="w-4 h-4 text-blue-500" />,
  'api-spec': <FileJson className="w-4 h-4 text-yellow-500" />,
  'test-results': <CheckCircle2 className="w-4 h-4 text-green-500" />,
  design: <Image className="w-4 h-4 text-pink-500" />,
  prototype: <Play className="w-4 h-4 text-indigo-500" />,
  config: <FileJson className="w-4 h-4 text-gray-500" />,
};

function ArtifactsTab({ artifacts }: ArtifactsTabProps) {
  // Group artifacts by type
  const byType = artifacts.reduce((acc, a) => {
    acc[a.type] = acc[a.type] || [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, Artifact[]>);

  return (
    <div className="p-4 space-y-4">
      {/* Artifact Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Layers className="w-4 h-4 text-blue-500" />}
          label="Total"
          value={artifacts.length}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-yellow-500" />}
          label="This Week"
          value={artifacts.filter(a => {
            const date = new Date(a.updatedAt);
            const week = new Date();
            week.setDate(week.getDate() - 7);
            return date > week;
          }).length}
        />
      </div>

      {/* Claude's Artifact Understanding */}
      <div className="bg-claude-primary-500/10 border border-claude-primary-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-claude-primary-400" />
          <span className="text-xs font-medium text-claude-primary-400">Artifact Connections</span>
        </div>
        <p className="text-sm text-claude-neutral-300">
          {artifacts.length > 0
            ? `${artifacts.length} artifacts documenting this project. ${
                Object.keys(byType).length
              } different types including ${Object.keys(byType).slice(0, 2).join(', ')}.`
            : 'No artifacts yet. Start documenting your work!'}
        </p>
      </div>

      {/* Artifacts by Type */}
      {Object.entries(byType).map(([type, typeArtifacts]) => (
        <Section
          key={type}
          title={type.replace('-', ' ')}
          icon={artifactIcons[type] || <FileText className="w-4 h-4 text-gray-500" />}
        >
          {typeArtifacts.slice(0, 3).map(artifact => {
            return (
              <div
                key={artifact.id}
                className="p-2 hover:bg-claude-neutral-800/50 rounded transition-colors"
              >
                <div className="flex items-start gap-2">
                  {artifactIcons[artifact.type]}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-claude-neutral-200 truncate">{artifact.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-claude-neutral-500">
                      <span>v{artifact.version}</span>
                      {artifact.reviews && artifact.reviews.length > 0 && (
                        <>
                          <span>•</span>
                          <span className={clsx(
                            artifact.reviews[0].status === 'approved' && 'text-green-400',
                            artifact.reviews[0].status === 'changes-requested' && 'text-yellow-400',
                            artifact.reviews[0].status === 'pending' && 'text-blue-400',
                          )}>
                            {artifact.reviews[0].status.replace('-', ' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-claude-neutral-500" />
                </div>
              </div>
            );
          })}
        </Section>
      ))}

      {artifacts.length === 0 && (
        <div className="text-center py-8 text-claude-neutral-500">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No artifacts yet</p>
          <p className="text-xs mt-1">Create documents, diagrams, and specs as you work</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COWORK TAB - Collaboration, Sessions, People
// =============================================================================

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'active' | 'idle' | 'away';
  workingOn?: {
    type: 'slice' | 'artifact' | 'review';
    id: string;
    name: string;
  };
  isAI?: boolean;
}

interface CoWorkTabProps {
  collaborators: Collaborator[];
  slices: Slice[];
  project: Project;
}

function CoWorkTab({ collaborators, slices, project }: CoWorkTabProps) {
  const activeNow = collaborators.filter(c => c.status === 'active');
  const inProgressSlices = slices.filter(s => s.status === 'in_progress');

  return (
    <div className="p-4 space-y-4">
      {/* Session Status */}
      <div className="bg-gradient-to-r from-green-500/10 to-claude-primary-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-claude-neutral-900" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-claude-neutral-100">Claude is here</div>
            <div className="text-xs text-claude-neutral-400">Ready to help with {project.name}</div>
          </div>
          <button className="px-3 py-1.5 text-xs bg-claude-primary-500 hover:bg-claude-primary-400 text-white rounded-lg transition-colors">
            Start Session
          </button>
        </div>
      </div>

      {/* Active Collaborators */}
      <Section title={`Active Now (${activeNow.length})`} icon={<Users className="w-4 h-4 text-green-500" />}>
        {activeNow.length > 0 ? (
          activeNow.map(person => (
            <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-claude-neutral-800/50 rounded transition-colors">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-claude-neutral-700 flex items-center justify-center text-xs font-medium text-claude-neutral-300">
                  {person.avatar}
                </div>
                <div className={clsx(
                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-claude-neutral-900',
                  person.status === 'active' && 'bg-green-500',
                  person.status === 'idle' && 'bg-yellow-500',
                  person.status === 'away' && 'bg-gray-500',
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-claude-neutral-200 flex items-center gap-1">
                  {person.name}
                  {person.isAI && (
                    <span className="text-[10px] px-1 py-0.5 bg-claude-primary-500/20 text-claude-primary-400 rounded">AI</span>
                  )}
                </div>
                {person.workingOn && (
                  <div className="text-xs text-claude-neutral-500 truncate">
                    Working on {person.workingOn.name}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-sm text-claude-neutral-500">
            No one else is active right now
          </div>
        )}
      </Section>

      {/* Work in Progress */}
      <Section title="Work in Progress" icon={<Zap className="w-4 h-4 text-yellow-500" />}>
        {inProgressSlices.slice(0, 3).map(slice => (
          <div key={slice.id} className="flex items-center gap-3 p-2 hover:bg-claude-neutral-800/50 rounded transition-colors">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-medium text-yellow-400">
              {slice.assignee.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-claude-neutral-200 truncate">{slice.name}</div>
              <div className="text-xs text-claude-neutral-500">{slice.assignee.name}</div>
            </div>
            <span className="text-xs text-yellow-400">{slice.shortId}</span>
          </div>
        ))}
      </Section>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 p-3 bg-claude-neutral-800 hover:bg-claude-neutral-700 rounded-lg transition-colors">
          <Video className="w-4 h-4 text-claude-neutral-400" />
          <span className="text-sm text-claude-neutral-300">Video Call</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-3 bg-claude-neutral-800 hover:bg-claude-neutral-700 rounded-lg transition-colors">
          <Mic className="w-4 h-4 text-claude-neutral-400" />
          <span className="text-sm text-claude-neutral-300">Voice Chat</span>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor = 'primary',
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: 'primary' | 'green';
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors relative',
        active
          ? 'text-claude-neutral-100 border-b-2 border-claude-primary-500'
          : 'text-claude-neutral-500 hover:text-claude-neutral-300 border-b-2 border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={clsx(
          'text-[10px] px-1.5 py-0.5 rounded-full',
          badgeColor === 'green'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-claude-primary-500/20 text-claude-primary-400'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-xs font-medium text-claude-neutral-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function HealthBadge({ label, value, total, color }: { label: string; value: number; total?: number; color: 'green' | 'purple' | 'blue' }) {
  const colorClasses = {
    green: 'text-green-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={colorClasses[color]}>{value}</span>
      {total !== undefined && (
        <>
          <span className="text-claude-neutral-600">/</span>
          <span className="text-claude-neutral-500">{total}</span>
        </>
      )}
      <span className="text-claude-neutral-600">{label}</span>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-claude-neutral-800/50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-semibold text-claude-neutral-100">{value}</div>
      <div className="text-xs text-claude-neutral-500">{label}</div>
    </div>
  );
}

function InsightRow({ insight }: { insight: ClaudeInsight }) {
  const icons = {
    risk: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    suggestion: <Lightbulb className="w-4 h-4 text-blue-500" />,
    connection: <Link2 className="w-4 h-4 text-purple-500" />,
    progress: <TrendingUp className="w-4 h-4 text-green-500" />,
    blocker: <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  const colors = {
    risk: 'bg-yellow-500/10 border-yellow-500/20',
    suggestion: 'bg-blue-500/10 border-blue-500/20',
    connection: 'bg-purple-500/10 border-purple-500/20',
    progress: 'bg-green-500/10 border-green-500/20',
    blocker: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <div className={clsx('p-2 rounded border', colors[insight.type])}>
      <div className="flex items-start gap-2">
        {icons[insight.type]}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-claude-neutral-200">{insight.title}</div>
          <div className="text-xs text-claude-neutral-500 mt-0.5">{insight.description}</div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ doc, onClick }: { doc: ContextDoc; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 text-left hover:bg-claude-neutral-800/50 rounded transition-colors"
    >
      <FileText className="w-4 h-4 text-claude-neutral-500" />
      <span className="flex-1 text-sm text-claude-neutral-300 truncate">{doc.name}</span>
      <span className={clsx(
        'text-[10px] px-1.5 py-0.5 rounded',
        doc.freshness === 'current' && 'bg-green-500/20 text-green-400',
        doc.freshness === 'stale' && 'bg-yellow-500/20 text-yellow-400',
        doc.freshness === 'outdated' && 'bg-red-500/20 text-red-400',
      )}>
        {doc.freshness}
      </span>
    </button>
  );
}

// =============================================================================
// Helper Functions - Claude's Intelligence
// =============================================================================

function generateInsights(slices: Slice[], _intents: Intent[], context: ContextDoc[], artifacts: Artifact[]): ClaudeInsight[] {
  const insights: ClaudeInsight[] = [];

  // Blocked items
  const blocked = slices.filter(s => s.status === 'blocked');
  if (blocked.length > 0) {
    insights.push({
      id: 'blocked',
      type: 'blocker',
      title: `${blocked.length} item${blocked.length > 1 ? 's' : ''} blocked`,
      description: blocked.map(s => s.blockedReason || 'No reason').join('; '),
      relatedItems: blocked.map(s => ({ type: 'slice', id: s.id, name: s.shortId })),
    });
  }

  // Unlinked work
  const unlinked = slices.filter(s => !s.linkedIntent && s.status !== 'completed');
  if (unlinked.length > 0) {
    insights.push({
      id: 'unlinked',
      type: 'suggestion',
      title: 'Work not linked to goals',
      description: `${unlinked.length} item${unlinked.length > 1 ? 's' : ''} without a linked intent`,
      relatedItems: unlinked.slice(0, 3).map(s => ({ type: 'slice', id: s.id, name: s.shortId })),
    });
  }

  // Stale docs
  const stale = context.filter(c => c.freshness !== 'current');
  if (stale.length > 0) {
    insights.push({
      id: 'stale-docs',
      type: 'suggestion',
      title: 'Documentation needs review',
      description: `${stale.length} doc${stale.length > 1 ? 's' : ''} may be outdated`,
      relatedItems: stale.map(d => ({ type: 'context', id: d.id, name: d.name })),
    });
  }

  // Artifacts without reviews
  const unreviewed = artifacts.filter(a => !a.reviews || a.reviews.length === 0);
  if (unreviewed.length > 0) {
    insights.push({
      id: 'unreviewed-artifacts',
      type: 'suggestion',
      title: 'Artifacts awaiting review',
      description: `${unreviewed.length} artifact${unreviewed.length > 1 ? 's need' : ' needs'} review`,
      relatedItems: unreviewed.map(a => ({ type: 'artifact', id: a.id, name: a.name })),
    });
  }

  return insights;
}

function calculateProjectHealth(slices: Slice[], intents: Intent[]) {
  const goals = intents.filter(i => i.type === 'goal' && i.status === 'active');
  const goalsWithProgress = goals.filter(g => {
    const linked = slices.filter(s => s.linkedIntent === g.id);
    return linked.some(s => s.status === 'completed' || s.status === 'in_progress');
  });

  return {
    totalGoals: goals.length,
    goalsOnTrack: goalsWithProgress.length,
  };
}

function getCodeActivity(slices: Slice[]): CodeActivity {
  const allPRs = slices.flatMap(s =>
    (s.pullRequests || []).map(pr => ({
      ...pr,
      sliceId: s.id,
      files: Math.floor(Math.random() * 20) + 1,
      additions: Math.floor(Math.random() * 500) + 10,
      deletions: Math.floor(Math.random() * 200) + 5,
    }))
  );

  return {
    openPRs: allPRs.filter(pr => pr.status === 'open').length,
    recentCommits: Math.floor(Math.random() * 50) + 10,
    activeBranches: [...new Set(slices.filter(s => s.status === 'in_progress').map(s => `feature/${s.shortId.toLowerCase()}`))],
    prs: allPRs,
  };
}

function getActiveCollaborators(slices: Slice[]): Collaborator[] {
  const assignees = slices
    .filter(s => s.status === 'in_progress')
    .map(s => ({
      id: s.assignee.id,
      name: s.assignee.name,
      avatar: s.assignee.avatar,
      role: s.assignee.role,
      status: 'active' as const,
      workingOn: {
        type: 'slice' as const,
        id: s.id,
        name: s.shortId,
      },
    }));

  // Add Claude as always-present collaborator
  const collaborators: Collaborator[] = [
    {
      id: 'claude',
      name: 'Claude',
      avatar: 'AI',
      role: 'AI Assistant',
      status: 'active',
      isAI: true,
    },
    ...assignees.slice(0, 4),
  ];

  return collaborators;
}
