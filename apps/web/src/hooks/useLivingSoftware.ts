/**
 * Living Software React Hooks
 *
 * Hooks for fetching and managing Living Software data:
 * - Intents (WHY)
 * - Capabilities (WHAT)
 * - Signals (HOW)
 * - Experiments (LEARN)
 *
 * @prompt-id forge-v4.1:web:hooks:living-software:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listIntents,
  type Intent,
  type IntentStatus,
  type IntentPriority,
} from '../api/intents';
import {
  listSignals,
  type Signal,
  type SignalHealth,
} from '../api/signals';
import {
  listCapabilities,
  type Capability,
  type CapabilityStatus,
} from '../api/capabilities';
import {
  listExperiments,
  type Experiment,
  type ExperimentStatus,
} from '../api/experiments';

// ============================================================================
// INTENTS HOOK
// ============================================================================

interface UseIntentsOptions {
  status?: IntentStatus;
  priority?: IntentPriority;
  projectId?: string;
}

interface UseIntentsResult {
  intents: Intent[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  // Computed
  atRiskIntents: Intent[];
  activeIntents: Intent[];
  criticalIntents: Intent[];
}

export function useIntents(options: UseIntentsOptions = {}): UseIntentsResult {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listIntents(options);
      setIntents(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch intents'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.priority, options.projectId]);

  useEffect(() => {
    fetchIntents();
  }, [fetchIntents]);

  const atRiskIntents = useMemo(
    () => intents.filter(i => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE'),
    [intents]
  );

  const activeIntents = useMemo(
    () => intents.filter(i => i.status === 'ACTIVE'),
    [intents]
  );

  const criticalIntents = useMemo(
    () => intents.filter(i => i.priority === 'CRITICAL'),
    [intents]
  );

  return {
    intents,
    loading,
    error,
    refresh: fetchIntents,
    atRiskIntents,
    activeIntents,
    criticalIntents,
  };
}

// ============================================================================
// SIGNALS HOOK
// ============================================================================

interface UseSignalsOptions {
  health?: SignalHealth;
  intentId?: string;
  capabilityId?: string;
  hasAnomaly?: boolean;
}

interface UseSignalsResult {
  signals: Signal[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  // Computed
  alertingSignals: Signal[];
  criticalSignals: Signal[];
  healthySignals: Signal[];
  byHealth: Record<SignalHealth, number>;
}

export function useSignals(options: UseSignalsOptions = {}): UseSignalsResult {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listSignals(options);
      setSignals(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch signals'));
    } finally {
      setLoading(false);
    }
  }, [options.health, options.intentId, options.capabilityId, options.hasAnomaly]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const alertingSignals = useMemo(
    () => signals.filter(s => s.health === 'WARNING' || s.health === 'CRITICAL'),
    [signals]
  );

  const criticalSignals = useMemo(
    () => signals.filter(s => s.health === 'CRITICAL'),
    [signals]
  );

  const healthySignals = useMemo(
    () => signals.filter(s => s.health === 'GOOD' || s.health === 'EXCELLENT'),
    [signals]
  );

  const byHealth = useMemo(() => {
    const counts: Record<SignalHealth, number> = {
      EXCELLENT: 0,
      GOOD: 0,
      WARNING: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    };
    signals.forEach(s => {
      counts[s.health] = (counts[s.health] || 0) + 1;
    });
    return counts;
  }, [signals]);

  return {
    signals,
    loading,
    error,
    refresh: fetchSignals,
    alertingSignals,
    criticalSignals,
    healthySignals,
    byHealth,
  };
}

// ============================================================================
// CAPABILITIES HOOK
// ============================================================================

interface UseCapabilitiesOptions {
  status?: CapabilityStatus;
  intentId?: string;
  hasGaps?: boolean;
}

interface UseCapabilitiesResult {
  capabilities: Capability[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  // Computed
  capabilitiesWithGaps: Capability[];
  activeCapabilities: Capability[];
  totalGaps: number;
  averageEffectiveness: number;
}

export function useCapabilities(options: UseCapabilitiesOptions = {}): UseCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCapabilities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listCapabilities(options);
      setCapabilities(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch capabilities'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.intentId, options.hasGaps]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  const capabilitiesWithGaps = useMemo(
    () => capabilities.filter(c => c.gaps && c.gaps.length > 0),
    [capabilities]
  );

  const activeCapabilities = useMemo(
    () => capabilities.filter(c => c.status === 'ACTIVE'),
    [capabilities]
  );

  const totalGaps = useMemo(
    () => capabilities.reduce((sum, c) => sum + (c.gaps?.length || 0), 0),
    [capabilities]
  );

  const averageEffectiveness = useMemo(() => {
    if (capabilities.length === 0) return 0;
    const sum = capabilities.reduce((s, c) => s + (c.effectivenessScore || 0), 0);
    return sum / capabilities.length;
  }, [capabilities]);

  return {
    capabilities,
    loading,
    error,
    refresh: fetchCapabilities,
    capabilitiesWithGaps,
    activeCapabilities,
    totalGaps,
    averageEffectiveness,
  };
}

// ============================================================================
// EXPERIMENTS HOOK
// ============================================================================

interface UseExperimentsOptions {
  status?: ExperimentStatus;
  intentId?: string;
  capabilityId?: string;
}

interface UseExperimentsResult {
  experiments: Experiment[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  // Computed
  runningExperiments: Experiment[];
  completedExperiments: Experiment[];
  scheduledExperiments: Experiment[];
}

export function useExperiments(options: UseExperimentsOptions = {}): UseExperimentsResult {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExperiments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listExperiments(options);
      setExperiments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch experiments'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.intentId, options.capabilityId]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const runningExperiments = useMemo(
    () => experiments.filter(e => e.status === 'RUNNING'),
    [experiments]
  );

  const completedExperiments = useMemo(
    () => experiments.filter(e => e.status === 'COMPLETED'),
    [experiments]
  );

  const scheduledExperiments = useMemo(
    () => experiments.filter(e => e.status === 'SCHEDULED'),
    [experiments]
  );

  return {
    experiments,
    loading,
    error,
    refresh: fetchExperiments,
    runningExperiments,
    completedExperiments,
    scheduledExperiments,
  };
}

// ============================================================================
// COMBINED PULSE HOOK
// ============================================================================

interface PulseData {
  intentsAtRisk: number;
  signalsAlerting: number;
  capabilityGaps: number;
  experimentsRunning: number;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  // Quick access items
  needsAttention: Array<{
    id: string;
    type: 'intent' | 'signal' | 'capability' | 'experiment';
    label: string;
    status: string;
    value?: string | number;
    severity?: string;
  }>;
}

export function usePulse(): PulseData {
  const intents = useIntents();
  const signals = useSignals();
  const capabilities = useCapabilities();
  const experiments = useExperiments();

  const loading = intents.loading || signals.loading || capabilities.loading || experiments.loading;
  const error = intents.error || signals.error || capabilities.error || experiments.error;

  const refresh = useCallback(() => {
    intents.refresh();
    signals.refresh();
    capabilities.refresh();
    experiments.refresh();
  }, [intents.refresh, signals.refresh, capabilities.refresh, experiments.refresh]);

  const needsAttention = useMemo(() => {
    const items: PulseData['needsAttention'] = [];

    // Add at-risk intents
    intents.atRiskIntents.slice(0, 2).forEach(intent => {
      items.push({
        id: intent.id,
        type: 'intent',
        label: intent.title.slice(0, 40) + (intent.title.length > 40 ? '...' : ''),
        status: 'at-risk',
        value: Math.round(intent.fulfillmentScore * 100),
      });
    });

    // Add critical signals
    signals.criticalSignals.slice(0, 2).forEach(signal => {
      const change = signal.previousValue
        ? ((Number(signal.currentValue) - Number(signal.previousValue)) / Number(signal.previousValue) * 100).toFixed(1)
        : null;
      items.push({
        id: signal.id,
        type: 'signal',
        label: signal.name,
        status: 'critical',
        value: change ? `${Number(change) > 0 ? '+' : ''}${change}%` : undefined,
      });
    });

    // Add capabilities with gaps
    capabilities.capabilitiesWithGaps.slice(0, 2).forEach(cap => {
      const criticalGaps = cap.gaps?.filter((g: { severity: string }) => g.severity === 'critical' || g.severity === 'high') || [];
      items.push({
        id: cap.id,
        type: 'capability',
        label: cap.name,
        status: 'gap',
        severity: criticalGaps.length > 0 ? 'high' : 'medium',
      });
    });

    // Add running experiments
    experiments.runningExperiments.slice(0, 1).forEach(exp => {
      items.push({
        id: exp.id,
        type: 'experiment',
        label: exp.name,
        status: 'running',
        value: exp.statisticalSignificance ? Math.round(exp.statisticalSignificance * 100) : undefined,
      });
    });

    return items.slice(0, 5);
  }, [intents.atRiskIntents, signals.criticalSignals, capabilities.capabilitiesWithGaps, experiments.runningExperiments]);

  return {
    intentsAtRisk: intents.atRiskIntents.length,
    signalsAlerting: signals.alertingSignals.length,
    capabilityGaps: capabilities.totalGaps,
    experimentsRunning: experiments.runningExperiments.length,
    loading,
    error,
    refresh,
    needsAttention,
  };
}
