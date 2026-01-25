/**
 * ClaudeAssistant - Intelligent Living Software Assistant
 *
 * An AI-powered assistant that:
 * - Shows real-time insights with clickable navigation
 * - Provides AI-powered action recommendations
 * - Displays live activity feed from the system
 * - Offers smart command suggestions
 * - Supports keyboard shortcuts (⌘+Enter to send)
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  Send,
  Target,
  Activity,
  Box,
  FlaskConical,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  X,
  Loader2,
  Zap,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  ChevronRight,
  Users,
  Heart,
  DollarSign,
} from 'lucide-react';
import { useWorkspace } from '../../contexts';
import { useIntents, useSignals, useCapabilities, useExperiments } from '../../hooks';
import type { Intent } from '../../api/intents';
import type { Signal } from '../../api/signals';
import type { Capability } from '../../api/capabilities';
import type { Experiment } from '../../api/experiments';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'critical';
  icon: React.ReactNode;
  text: string;
  detail?: string;
  action?: {
    label: string;
    view: string;
    itemId?: string;
  };
}

interface ActivityItem {
  id: string;
  type: 'intent' | 'signal' | 'capability' | 'experiment';
  action: 'created' | 'updated' | 'completed' | 'alert' | 'resolved';
  name: string;
  timestamp: Date;
  detail?: string;
}

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: {
    label: string;
    onClick: () => void;
  };
  impact: string;
}

type TabType = 'chat' | 'insights' | 'activity' | 'actions';

export function ClaudeAssistant() {
  const { setCurrentView, closeAssistant } = useWorkspace();

  // Fetch Living Software data
  const { intents, refresh: refreshIntents } = useIntents();
  const { signals, refresh: refreshSignals } = useSignals();
  const { capabilities, refresh: refreshCapabilities } = useCapabilities();
  const { experiments, refresh: refreshExperiments } = useExperiments();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Refresh all data
  const refreshAll = useCallback(() => {
    refreshIntents();
    refreshSignals();
    refreshCapabilities();
    refreshExperiments();
  }, [refreshIntents, refreshSignals, refreshCapabilities, refreshExperiments]);

  // Generate contextual insights with actions
  const insights = useMemo((): Insight[] => {
    const items: Insight[] = [];

    // Critical signals first
    const criticalSignals = signals.filter((s: Signal) => s.health === 'CRITICAL');
    criticalSignals.forEach((s: Signal) => {
      items.push({
        id: `signal-critical-${s.id}`,
        type: 'critical',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        text: `${s.name} is critical`,
        detail: s.currentValue !== undefined ? `Current: ${s.currentValue}${s.unit || ''}` : undefined,
        action: { label: 'View Signal', view: 'signals', itemId: s.id },
      });
    });

    // At-risk intents
    const atRiskIntents = intents.filter((i: Intent) => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE');
    atRiskIntents.forEach((i: Intent) => {
      items.push({
        id: `intent-risk-${i.id}`,
        type: 'warning',
        icon: <Target className="w-3.5 h-3.5" />,
        text: `"${i.title.slice(0, 30)}${i.title.length > 30 ? '...' : ''}" at risk`,
        detail: `${Math.round(i.fulfillmentScore * 100)}% fulfilled`,
        action: { label: 'View Intent', view: 'intents', itemId: i.id },
      });
    });

    // Warning signals
    const warningSignals = signals.filter((s: Signal) => s.health === 'WARNING');
    if (warningSignals.length > 0) {
      items.push({
        id: 'signals-warning',
        type: 'warning',
        icon: <Activity className="w-3.5 h-3.5" />,
        text: `${warningSignals.length} signal${warningSignals.length > 1 ? 's' : ''} need attention`,
        action: { label: 'View Signals', view: 'signals' },
      });
    }

    // Low effectiveness capabilities
    const lowEffectiveness = capabilities.filter((c: Capability) => c.effectivenessScore < 0.5);
    if (lowEffectiveness.length > 0) {
      items.push({
        id: 'capabilities-low',
        type: 'info',
        icon: <Box className="w-3.5 h-3.5" />,
        text: `${lowEffectiveness.length} capability${lowEffectiveness.length > 1 ? 'ies' : ''} underperforming`,
        action: { label: 'View Capabilities', view: 'capabilities' },
      });
    }

    // Running experiments
    const runningExperiments = experiments.filter((e: Experiment) => e.status === 'RUNNING');
    runningExperiments.forEach((e: Experiment) => {
      const significance = e.statisticalSignificance ? Math.round(e.statisticalSignificance * 100) : null;
      items.push({
        id: `experiment-running-${e.id}`,
        type: significance && significance > 95 ? 'success' : 'info',
        icon: <FlaskConical className="w-3.5 h-3.5" />,
        text: `"${e.name}" ${significance ? `${significance}% significant` : 'in progress'}`,
        action: { label: 'View Experiment', view: 'experiments', itemId: e.id },
      });
    });

    // Positive health indicator
    const healthySignals = signals.filter((s: Signal) => s.health === 'EXCELLENT' || s.health === 'GOOD');
    if (healthySignals.length > signals.length * 0.8 && signals.length > 0) {
      items.push({
        id: 'health-good',
        type: 'success',
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: 'System health is excellent',
        detail: `${healthySignals.length}/${signals.length} signals healthy`,
      });
    }

    // Customer-centric insights (simulated for now)
    // In production, these would come from a customer health API
    const customerChurnRisk = 8; // simulated
    const blockedDealValue = 847000; // simulated
    const npsScore = 42; // simulated

    if (customerChurnRisk > 5) {
      items.push({
        id: 'customer-churn-risk',
        type: 'warning',
        icon: <Users className="w-3.5 h-3.5" />,
        text: `${customerChurnRisk} customers at churn risk`,
        detail: 'Proactive outreach recommended',
        action: { label: 'View Customers', view: 'customer-intelligence' },
      });
    }

    if (blockedDealValue > 500000) {
      items.push({
        id: 'blocked-deals',
        type: 'info',
        icon: <DollarSign className="w-3.5 h-3.5" />,
        text: `$${(blockedDealValue / 1000).toFixed(0)}K blocked by features`,
        detail: 'Feature prioritization opportunity',
        action: { label: 'View Intelligence', view: 'customer-intelligence' },
      });
    }

    if (npsScore >= 40) {
      items.push({
        id: 'nps-positive',
        type: 'success',
        icon: <Heart className="w-3.5 h-3.5" />,
        text: `NPS score: ${npsScore}`,
        detail: 'Customer sentiment is positive',
        action: { label: 'View Details', view: 'customer-intelligence' },
      });
    }

    return items.slice(0, 8);
  }, [intents, signals, capabilities, experiments]);

  // Generate AI recommendations
  const recommendations = useMemo((): Recommendation[] => {
    const items: Recommendation[] = [];

    // Recommend addressing critical signals
    const criticalSignals = signals.filter((s: Signal) => s.health === 'CRITICAL');
    if (criticalSignals.length > 0) {
      items.push({
        id: 'rec-critical-signals',
        priority: 'high',
        title: 'Address Critical Signals',
        description: `${criticalSignals.length} signal${criticalSignals.length > 1 ? 's are' : ' is'} in critical state. Immediate action recommended.`,
        action: {
          label: 'View Signals',
          onClick: () => setCurrentView('signals'),
        },
        impact: 'Prevent system degradation',
      });
    }

    // Recommend running experiments for low-performing capabilities
    const lowCaps = capabilities.filter((c: Capability) => c.effectivenessScore < 0.5 && c.status === 'ACTIVE');
    const runningExps = experiments.filter((e: Experiment) => e.status === 'RUNNING');
    if (lowCaps.length > 0 && runningExps.length < 2) {
      items.push({
        id: 'rec-experiment',
        priority: 'medium',
        title: 'Run Improvement Experiment',
        description: `${lowCaps.length} capabilities have low effectiveness. Consider A/B testing improvements.`,
        action: {
          label: 'View Experiments',
          onClick: () => setCurrentView('experiments'),
        },
        impact: 'Improve feature effectiveness by 20-40%',
      });
    }

    // Recommend reviewing at-risk intents
    const atRiskIntents = intents.filter((i: Intent) => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE');
    if (atRiskIntents.length > 0) {
      items.push({
        id: 'rec-intents',
        priority: 'high',
        title: 'Review At-Risk Intents',
        description: `${atRiskIntents.length} strategic intent${atRiskIntents.length > 1 ? 's are' : ' is'} falling behind. Review resource allocation.`,
        action: {
          label: 'View Intents',
          onClick: () => setCurrentView('intents'),
        },
        impact: 'Keep strategic goals on track',
      });
    }

    // Recommend completing experiments that reached significance
    const significantExps = experiments.filter((e: Experiment) =>
      e.status === 'RUNNING' && e.statisticalSignificance && e.statisticalSignificance > 0.95
    );
    if (significantExps.length > 0) {
      items.push({
        id: 'rec-conclude-exp',
        priority: 'medium',
        title: 'Conclude Significant Experiments',
        description: `${significantExps.length} experiment${significantExps.length > 1 ? 's have' : ' has'} reached statistical significance. Ready to ship winning variants.`,
        action: {
          label: 'View Experiments',
          onClick: () => setCurrentView('experiments'),
        },
        impact: 'Ship validated improvements',
      });
    }

    // Customer-centric recommendations (simulated data for now)
    const customerChurnRisk = 8; // In production, from customer health API
    const blockedDealValue = 847000; // In production, from sales API

    if (customerChurnRisk > 5) {
      items.push({
        id: 'rec-churn-outreach',
        priority: 'high',
        title: 'Proactive Customer Outreach',
        description: `${customerChurnRisk} customers showing churn signals. Schedule success calls to address concerns.`,
        action: {
          label: 'View At-Risk',
          onClick: () => setCurrentView('customer-intelligence'),
        },
        impact: 'Reduce churn by 15-25%',
      });
    }

    if (blockedDealValue > 500000) {
      items.push({
        id: 'rec-feature-priority',
        priority: 'medium',
        title: 'Revenue-Driven Prioritization',
        description: `$${(blockedDealValue / 1000).toFixed(0)}K in pipeline blocked by missing features. Review roadmap alignment.`,
        action: {
          label: 'View Intelligence',
          onClick: () => setCurrentView('customer-intelligence'),
        },
        impact: `Unlock $${(blockedDealValue / 1000).toFixed(0)}K in revenue`,
      });
    }

    // General optimization recommendation
    const healthyPercent = signals.length > 0
      ? Math.round((signals.filter((s: Signal) => ['EXCELLENT', 'GOOD'].includes(s.health)).length / signals.length) * 100)
      : 100;
    if (healthyPercent > 80 && items.length === 0) {
      items.push({
        id: 'rec-optimize',
        priority: 'low',
        title: 'System Running Well',
        description: 'No critical issues. Consider exploring new experiments or capability improvements.',
        action: {
          label: 'Explore Ideas',
          onClick: () => setCurrentView('experiments'),
        },
        impact: 'Continuous improvement',
      });
    }

    return items.slice(0, 5);
  }, [intents, signals, capabilities, experiments, setCurrentView]);

  // Generate simulated activity feed
  const activityFeed = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    const now = new Date();

    // Add recent signal changes
    signals.slice(0, 3).forEach((s: Signal, idx: number) => {
      const isAlert = s.health === 'WARNING' || s.health === 'CRITICAL';
      items.push({
        id: `activity-signal-${s.id}`,
        type: 'signal',
        action: isAlert ? 'alert' : 'updated',
        name: s.name,
        timestamp: new Date(now.getTime() - (idx * 5 + 2) * 60000),
        detail: isAlert ? `Health: ${s.health}` : `Value: ${s.currentValue}${s.unit || ''}`,
      });
    });

    // Add experiment updates
    experiments.filter((e: Experiment) => e.status === 'RUNNING').slice(0, 2).forEach((e: Experiment, idx: number) => {
      items.push({
        id: `activity-exp-${e.id}`,
        type: 'experiment',
        action: 'updated',
        name: e.name,
        timestamp: new Date(now.getTime() - (idx * 15 + 10) * 60000),
        detail: e.statisticalSignificance ? `${Math.round(e.statisticalSignificance * 100)}% significance` : 'Collecting data',
      });
    });

    // Add capability updates
    capabilities.slice(0, 2).forEach((c: Capability, idx: number) => {
      items.push({
        id: `activity-cap-${c.id}`,
        type: 'capability',
        action: c.effectivenessScore > 0.7 ? 'completed' : 'updated',
        name: c.name,
        timestamp: new Date(now.getTime() - (idx * 30 + 20) * 60000),
        detail: `Effectiveness: ${Math.round(c.effectivenessScore * 100)}%`,
      });
    });

    // Sort by timestamp
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
  }, [signals, experiments, capabilities]);

  // Command suggestions based on input
  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    const allSuggestions = [
      { text: 'What is the system status?', match: ['status', 'system', 'how'] },
      { text: 'Are any intents at risk?', match: ['intent', 'risk', 'goal'] },
      { text: 'Which signals need attention?', match: ['signal', 'alert', 'attention', 'health'] },
      { text: 'What experiments are running?', match: ['experiment', 'test', 'running', 'ab'] },
      { text: 'Show me underperforming capabilities', match: ['capability', 'feature', 'under', 'low'] },
      { text: 'What should I focus on today?', match: ['focus', 'today', 'priority', 'recommend'] },
      { text: 'Summarize recent changes', match: ['recent', 'change', 'summary', 'update'] },
    ];
    return allSuggestions
      .filter(s => s.match.some(m => q.includes(m) || m.includes(q)))
      .map(s => s.text)
      .slice(0, 3);
  }, [input]);

  // Generate AI response
  const generateResponse = (question: string): Message => {
    const q = question.toLowerCase();
    let content = '';
    let actions: Message['actions'] = [];

    // Intent-related questions
    if (q.includes('intent') || q.includes('goal') || q.includes('why')) {
      const activeIntents = intents.filter((i: Intent) => i.status === 'ACTIVE');
      const atRisk = intents.filter((i: Intent) => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE');
      content = `📊 **Intent Overview**\n\n• Total: ${intents.length} intents\n• Active: ${activeIntents.length}\n• At Risk: ${atRisk.length}\n\n${atRisk.length > 0 ? `⚠️ **Needs Attention:**\n${atRisk.map((i: Intent) => `• ${i.title} (${Math.round(i.fulfillmentScore * 100)}%)`).join('\n')}` : '✅ All intents are on track!'}`;
      if (atRisk.length > 0) {
        actions = [{ label: 'View At-Risk Intents', action: () => setCurrentView('intents'), variant: 'primary' }];
      }
    }
    // Signal-related questions
    else if (q.includes('signal') || q.includes('health') || q.includes('metric') || q.includes('alert')) {
      const excellent = signals.filter((s: Signal) => s.health === 'EXCELLENT').length;
      const good = signals.filter((s: Signal) => s.health === 'GOOD').length;
      const warning = signals.filter((s: Signal) => s.health === 'WARNING');
      const critical = signals.filter((s: Signal) => s.health === 'CRITICAL');
      content = `📈 **Signal Health**\n\n• Excellent: ${excellent}\n• Good: ${good}\n• Warning: ${warning.length}\n• Critical: ${critical.length}\n\n${critical.length > 0 ? `🚨 **Critical:**\n${critical.map((s: Signal) => `• ${s.name}`).join('\n')}` : ''}${warning.length > 0 ? `\n\n⚠️ **Warnings:**\n${warning.map((s: Signal) => `• ${s.name}`).join('\n')}` : ''}${critical.length === 0 && warning.length === 0 ? '✅ All signals healthy!' : ''}`;
      if (critical.length > 0 || warning.length > 0) {
        actions = [{ label: 'View Signals Dashboard', action: () => setCurrentView('signals'), variant: 'primary' }];
      }
    }
    // Capability-related questions
    else if (q.includes('capability') || q.includes('feature') || q.includes('what')) {
      const active = capabilities.filter((c: Capability) => c.status === 'ACTIVE').length;
      const avgEffectiveness = capabilities.length > 0
        ? Math.round((capabilities.reduce((sum: number, c: Capability) => sum + c.effectivenessScore, 0) / capabilities.length) * 100)
        : 0;
      const low = capabilities.filter((c: Capability) => c.effectivenessScore < 0.5);
      content = `🧩 **Capabilities**\n\n• Total: ${capabilities.length}\n• Active: ${active}\n• Avg Effectiveness: ${avgEffectiveness}%\n\n${low.length > 0 ? `📉 **Underperforming:**\n${low.map((c: Capability) => `• ${c.name} (${Math.round(c.effectivenessScore * 100)}%)`).join('\n')}` : '✅ All capabilities performing well!'}`;
      if (low.length > 0) {
        actions = [{ label: 'Analyze Capabilities', action: () => setCurrentView('capabilities'), variant: 'primary' }];
      }
    }
    // Experiment-related questions
    else if (q.includes('experiment') || q.includes('test') || q.includes('learn') || q.includes('ab')) {
      const running = experiments.filter((e: Experiment) => e.status === 'RUNNING');
      const completed = experiments.filter((e: Experiment) => e.status === 'COMPLETED');
      const significant = running.filter((e: Experiment) => e.statisticalSignificance && e.statisticalSignificance > 0.95);
      content = `🧪 **Experiments**\n\n• Total: ${experiments.length}\n• Running: ${running.length}\n• Completed: ${completed.length}\n\n${running.length > 0 ? `🔬 **Active:**\n${running.map((e: Experiment) => `• ${e.name} ${e.statisticalSignificance ? `(${Math.round(e.statisticalSignificance * 100)}% sig)` : ''}`).join('\n')}` : 'No experiments running.'}${significant.length > 0 ? `\n\n🎯 **Ready to Ship:** ${significant.length} experiment${significant.length > 1 ? 's have' : ' has'} reached significance!` : ''}`;
      actions = [{ label: 'View Experiments', action: () => setCurrentView('experiments'), variant: 'primary' }];
    }
    // Focus/priority questions
    else if (q.includes('focus') || q.includes('priority') || q.includes('recommend') || q.includes('should')) {
      const criticalSignals = signals.filter((s: Signal) => s.health === 'CRITICAL');
      const atRiskIntents = intents.filter((i: Intent) => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE');
      const significantExps = experiments.filter((e: Experiment) => e.status === 'RUNNING' && e.statisticalSignificance && e.statisticalSignificance > 0.95);

      const priorities: string[] = [];
      if (criticalSignals.length > 0) priorities.push(`🚨 **Urgent:** ${criticalSignals.length} critical signal${criticalSignals.length > 1 ? 's' : ''} need immediate attention`);
      if (atRiskIntents.length > 0) priorities.push(`⚠️ **Important:** ${atRiskIntents.length} intent${atRiskIntents.length > 1 ? 's are' : ' is'} at risk`);
      if (significantExps.length > 0) priorities.push(`🎯 **Opportunity:** ${significantExps.length} experiment${significantExps.length > 1 ? 's are' : ' is'} ready to ship`);

      content = priorities.length > 0
        ? `**Today's Priorities**\n\n${priorities.join('\n\n')}`
        : `✅ **Looking Good!**\n\nNo urgent issues. Consider:\n• Reviewing capability effectiveness\n• Planning new experiments\n• Updating intent success criteria`;

      if (criticalSignals.length > 0) {
        actions = [{ label: 'View Critical Signals', action: () => setCurrentView('signals'), variant: 'primary' }];
      } else if (atRiskIntents.length > 0) {
        actions = [{ label: 'View At-Risk Intents', action: () => setCurrentView('intents'), variant: 'primary' }];
      }
    }
    // Status/overview questions
    else if (q.includes('status') || q.includes('overview') || q.includes('summary') || q.includes('how are')) {
      const healthyPercent = Math.round((signals.filter((s: Signal) => ['EXCELLENT', 'GOOD'].includes(s.health)).length / Math.max(signals.length, 1)) * 100);
      const activeIntents = intents.filter((i: Intent) => i.status === 'ACTIVE').length;
      const runningExps = experiments.filter((e: Experiment) => e.status === 'RUNNING').length;

      content = `**System Status** ${healthyPercent >= 70 ? '✅' : '⚠️'}\n\n📊 **Health Score:** ${healthyPercent}%\n\n• **Intents:** ${intents.length} total, ${activeIntents} active\n• **Signals:** ${signals.length} monitored, ${healthyPercent}% healthy\n• **Capabilities:** ${capabilities.length} tracked\n• **Experiments:** ${runningExps} running\n\n${healthyPercent >= 70 ? 'System is operating normally.' : 'Some areas need attention.'}`;
      actions = [{ label: 'View Dashboard', action: () => setCurrentView('dashboard'), variant: 'secondary' }];
    }
    // Default response
    else {
      content = `I can help you understand your Living Software system. Try asking:\n\n• "What should I focus on today?"\n• "What's the system status?"\n• "Are any intents at risk?"\n• "Which signals need attention?"\n• "What experiments are running?"`;
    }

    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      actions,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(userMessage.content);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const handleInsightClick = (insight: Insight) => {
    if (insight.action) {
      setCurrentView(insight.action.view as any);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const activityIcons = {
    intent: <Target className="w-3 h-3" />,
    signal: <Activity className="w-3 h-3" />,
    capability: <Box className="w-3 h-3" />,
    experiment: <FlaskConical className="w-3 h-3" />,
  };

  const activityColors = {
    created: 'text-green-400',
    updated: 'text-blue-400',
    completed: 'text-purple-400',
    alert: 'text-yellow-400',
    resolved: 'text-green-400',
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-claude-neutral-900 to-claude-neutral-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-claude-neutral-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center shadow-lg shadow-claude-primary-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-claude-neutral-900" />
            </div>
            <div>
              <h2 className="font-semibold text-claude-neutral-100 text-sm">Claude</h2>
              <p className="text-[10px] text-claude-neutral-500">Living Software Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refreshAll}
              className="p-1.5 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeAssistant}
              className="p-1.5 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-claude-neutral-800/50 rounded-lg p-0.5">
          {[
            { id: 'chat' as const, icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Chat' },
            { id: 'insights' as const, icon: <Lightbulb className="w-3.5 h-3.5" />, label: 'Insights', badge: insights.filter(i => i.type === 'critical' || i.type === 'warning').length },
            { id: 'activity' as const, icon: <Clock className="w-3.5 h-3.5" />, label: 'Activity' },
            { id: 'actions' as const, icon: <Wand2 className="w-3.5 h-3.5" />, label: 'Actions', badge: recommendations.filter(r => r.priority === 'high').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'bg-claude-neutral-700 text-claude-neutral-100'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-300'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-claude-primary-400/20 to-claude-primary-600/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-claude-primary-400" />
                </div>
                <p className="text-sm text-claude-neutral-300 mb-2">How can I help you today?</p>
                <p className="text-xs text-claude-neutral-500 mb-4">
                  Ask about intents, signals, capabilities, or experiments
                </p>

                {/* Quick prompts */}
                <div className="space-y-2 text-left">
                  {[
                    { icon: <Zap className="w-3.5 h-3.5" />, text: 'What should I focus on today?' },
                    { icon: <Activity className="w-3.5 h-3.5" />, text: "What's the system status?" },
                    { icon: <Target className="w-3.5 h-3.5" />, text: 'Show me at-risk intents' },
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(prompt.text)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-claude-neutral-300 bg-claude-neutral-800/50 hover:bg-claude-neutral-800 rounded-lg transition-colors"
                    >
                      <span className="text-claude-primary-400">{prompt.icon}</span>
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={clsx(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={clsx(
                        'max-w-[90%] rounded-xl px-3 py-2',
                        message.role === 'user'
                          ? 'bg-claude-primary-500 text-white'
                          : 'bg-claude-neutral-800 text-claude-neutral-200'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-claude-neutral-700">
                          {message.actions.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={action.action}
                              className={clsx(
                                'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                                action.variant === 'primary'
                                  ? 'bg-claude-primary-500 hover:bg-claude-primary-400 text-white'
                                  : 'bg-claude-neutral-700 hover:bg-claude-neutral-600 text-claude-neutral-200'
                              )}
                            >
                              {action.label}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-claude-neutral-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-claude-primary-400 animate-spin" />
                        <span className="text-sm text-claude-neutral-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="p-3 space-y-2">
            {insights.length > 0 ? (
              insights.map(insight => (
                <button
                  key={insight.id}
                  onClick={() => handleInsightClick(insight)}
                  className={clsx(
                    'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors group',
                    insight.type === 'critical' && 'bg-red-500/10 hover:bg-red-500/20',
                    insight.type === 'warning' && 'bg-yellow-500/10 hover:bg-yellow-500/20',
                    insight.type === 'info' && 'bg-blue-500/10 hover:bg-blue-500/20',
                    insight.type === 'success' && 'bg-green-500/10 hover:bg-green-500/20',
                  )}
                >
                  <div className={clsx(
                    'mt-0.5',
                    insight.type === 'critical' && 'text-red-400',
                    insight.type === 'warning' && 'text-yellow-400',
                    insight.type === 'info' && 'text-blue-400',
                    insight.type === 'success' && 'text-green-400',
                  )}>
                    {insight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm font-medium',
                      insight.type === 'critical' && 'text-red-300',
                      insight.type === 'warning' && 'text-yellow-300',
                      insight.type === 'info' && 'text-blue-300',
                      insight.type === 'success' && 'text-green-300',
                    )}>
                      {insight.text}
                    </p>
                    {insight.detail && (
                      <p className="text-xs text-claude-neutral-500 mt-0.5">{insight.detail}</p>
                    )}
                  </div>
                  {insight.action && (
                    <ChevronRight className="w-4 h-4 text-claude-neutral-600 group-hover:text-claude-neutral-400 transition-colors" />
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-claude-neutral-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All systems healthy</p>
                <p className="text-xs mt-1">No issues detected</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="p-3">
            <div className="space-y-1">
              {activityFeed.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-claude-neutral-800/50 transition-colors"
                >
                  <div className={clsx('mt-1', activityColors[item.action])}>
                    {activityIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-claude-neutral-200 truncate">{item.name}</span>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', activityColors[item.action], 'bg-current/10')}>
                        {item.action}
                      </span>
                    </div>
                    {item.detail && (
                      <p className="text-xs text-claude-neutral-500 mt-0.5">{item.detail}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-claude-neutral-600 whitespace-nowrap">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="p-3 space-y-3">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className={clsx(
                  'p-3 rounded-lg border',
                  rec.priority === 'high' && 'bg-red-500/5 border-red-500/20',
                  rec.priority === 'medium' && 'bg-yellow-500/5 border-yellow-500/20',
                  rec.priority === 'low' && 'bg-claude-neutral-800/50 border-claude-neutral-700',
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={clsx(
                    'p-1 rounded',
                    rec.priority === 'high' && 'bg-red-500/20 text-red-400',
                    rec.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                    rec.priority === 'low' && 'bg-claude-neutral-700 text-claude-neutral-400',
                  )}>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-claude-neutral-200">{rec.title}</h4>
                    <p className="text-xs text-claude-neutral-500 mt-0.5">{rec.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-claude-neutral-700/50">
                  <span className="text-[10px] text-claude-neutral-500">
                    💡 {rec.impact}
                  </span>
                  <button
                    onClick={rec.action.onClick}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-claude-neutral-700 hover:bg-claude-neutral-600 text-claude-neutral-200 rounded transition-colors"
                  >
                    {rec.action.label}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input (shown for chat tab) */}
      {activeTab === 'chat' && (
        <div className="p-3 border-t border-claude-neutral-800 flex-shrink-0">
          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-2 space-y-1">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(suggestion);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                setShowSuggestions(e.target.value.length > 1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude... (⌘+Enter)"
              className="flex-1 px-3 py-2 text-sm bg-claude-neutral-800 rounded-lg border border-claude-neutral-700 text-claude-neutral-100 placeholder-claude-neutral-500 focus:outline-none focus:ring-1 focus:ring-claude-primary-500 focus:border-claude-primary-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-3 py-2 bg-claude-primary-500 hover:bg-claude-primary-400 disabled:bg-claude-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ClaudeAssistant;
