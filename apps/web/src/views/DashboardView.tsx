/**
 * DashboardView - Central command center for project overview
 * Combines AI insights, analytics, activity, and automation
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Brain,
  Activity,
  BarChart3,
  GitBranch,
  Zap,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Slice, Intent, Artifact, Project } from '../data/enterprise-data';
import { AIInsightsPanel } from '../components/ai/AIInsightsPanel';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { AnalyticsWidgets } from '../components/analytics/AnalyticsWidgets';
import { DependencyGraph } from '../components/graph/DependencyGraph';
import { WorkflowAutomation } from '../components/automation/WorkflowAutomation';

interface DashboardViewProps {
  project: Project;
  slices: Slice[];
  intents: Intent[];
  artifacts: Artifact[];
  onSliceClick?: (slice: Slice) => void;
  onIntentClick?: (intent: Intent) => void;
  onArtifactClick?: (artifact: Artifact) => void;
}

type PanelType = 'insights' | 'activity' | 'dependencies' | 'automation';

export function DashboardView({
  project,
  slices,
  intents,
  artifacts,
  onSliceClick,
  onIntentClick,
  onArtifactClick,
}: DashboardViewProps) {
  const [expandedPanel, setExpandedPanel] = useState<PanelType | null>(null);

  const panels = [
    {
      id: 'insights' as PanelType,
      title: 'AI Insights',
      icon: Brain,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      id: 'activity' as PanelType,
      title: 'Activity Feed',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'dependencies' as PanelType,
      title: 'Dependencies',
      icon: GitBranch,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      id: 'automation' as PanelType,
      title: 'Automation',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  const renderPanelContent = (panelId: PanelType) => {
    switch (panelId) {
      case 'insights':
        return (
          <AIInsightsPanel
            slices={slices}
            intents={intents}
            onSliceClick={onSliceClick}
            onIntentClick={onIntentClick}
          />
        );
      case 'activity':
        return (
          <ActivityFeed
            slices={slices}
            intents={intents}
            artifacts={artifacts}
            onSliceClick={onSliceClick}
            onIntentClick={onIntentClick}
            onArtifactClick={onArtifactClick}
          />
        );
      case 'dependencies':
        return (
          <DependencyGraph
            slices={slices}
            onSliceClick={onSliceClick}
          />
        );
      case 'automation':
        return (
          <WorkflowAutomation />
        );
      default:
        return null;
    }
  };

  // Expanded single panel view
  if (expandedPanel) {
    const panel = panels.find(p => p.id === expandedPanel);
    const Icon = panel?.icon || LayoutDashboard;

    return (
      <div className="flex flex-col h-full bg-claude-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandedPanel(null)}
              className="flex items-center gap-2 text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-sm">Back to Dashboard</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Icon className={clsx('w-5 h-5', panel?.color)} />
            <span className="text-sm font-medium text-claude-neutral-200">{panel?.title}</span>
          </div>
          <button
            onClick={() => setExpandedPanel(null)}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {renderPanelContent(expandedPanel)}
        </div>
      </div>
    );
  }

  // Dashboard grid view
  return (
    <div className="flex flex-col h-full bg-claude-neutral-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-claude-primary-500/20 to-purple-500/20 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-claude-primary-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-claude-neutral-100">
              {project.name} Dashboard
            </h1>
            <p className="text-sm text-claude-neutral-500">
              Project command center with AI-powered insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-claude-neutral-800 rounded-lg">
            <BarChart3 className="w-4 h-4 text-claude-neutral-400" />
            <span className="text-sm text-claude-neutral-300">
              {slices.length} slices
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="border-b border-claude-neutral-800">
        <AnalyticsWidgets slices={slices} intents={intents} />
      </div>

      {/* Main Dashboard Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4 h-full min-h-[600px]">
          {panels.map(panel => {
            const Icon = panel.icon;
            return (
              <div
                key={panel.id}
                className="bg-claude-neutral-850 rounded-xl border border-claude-neutral-800 overflow-hidden flex flex-col"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className={clsx('p-1.5 rounded-lg', panel.bgColor)}>
                      <Icon className={clsx('w-4 h-4', panel.color)} />
                    </div>
                    <span className="text-sm font-medium text-claude-neutral-200">
                      {panel.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedPanel(panel.id)}
                    className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
                    title="Expand"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-hidden">
                  {renderPanelContent(panel.id)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
