/**
 * PipelineBoard - Kanban-style sales pipeline
 * @prompt-id forge-v4.1:ui:component:pipeline-board:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface Deal {
  id: string;
  name: string;
  description?: string;
  stage: string;
  value: number;
  currency: string;
  probability: number;
  closeDate?: string;
  customer: { id: string; name: string };
  blockers: Array<{ id: string; description: string; featureRequestId?: string }>;
  ownerId?: string;
}

interface PipelineBoardProps {
  tenantId: string;
  onSelectDeal?: (dealId: string) => void;
}

const STAGES = [
  { key: 'QUALIFICATION', label: 'Qualification', color: 'bg-gray-200' },
  { key: 'DISCOVERY', label: 'Discovery', color: 'bg-blue-200' },
  { key: 'DEMO', label: 'Demo', color: 'bg-indigo-200' },
  { key: 'PROPOSAL', label: 'Proposal', color: 'bg-purple-200' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-yellow-200' },
  { key: 'CLOSED_WON', label: 'Closed Won', color: 'bg-green-200' },
  { key: 'CLOSED_LOST', label: 'Closed Lost', color: 'bg-red-200' },
];

// Demo data for development
const demoDeals: Deal[] = [
  { id: 'deal-1', name: 'Enterprise Platform License', stage: 'NEGOTIATION', value: 250000, currency: 'USD', probability: 75, closeDate: '2024-02-15', customer: { id: 'cust-1', name: 'Acme Corporation' }, blockers: [{ id: 'blk-1', description: 'Needs SSO/SAML support', featureRequestId: 'feat-1' }] },
  { id: 'deal-2', name: 'Growth Plan Expansion', stage: 'PROPOSAL', value: 85000, currency: 'USD', probability: 60, closeDate: '2024-02-28', customer: { id: 'cust-2', name: 'TechStart Inc' }, blockers: [] },
  { id: 'deal-3', name: 'Strategic Partnership', stage: 'DEMO', value: 450000, currency: 'USD', probability: 40, closeDate: '2024-03-30', customer: { id: 'cust-5', name: 'MegaCorp International' }, blockers: [{ id: 'blk-2', description: 'API rate limits too low', featureRequestId: 'feat-5' }] },
  { id: 'deal-4', name: 'Team License', stage: 'QUALIFICATION', value: 25000, currency: 'USD', probability: 20, customer: { id: 'cust-6', name: 'Innovate Solutions' }, blockers: [] },
  { id: 'deal-5', name: 'Department Rollout', stage: 'DISCOVERY', value: 120000, currency: 'USD', probability: 35, closeDate: '2024-03-15', customer: { id: 'cust-3', name: 'Global Dynamics' }, blockers: [] },
  { id: 'deal-6', name: 'Enterprise Annual', stage: 'CLOSED_WON', value: 180000, currency: 'USD', probability: 100, closeDate: '2024-01-10', customer: { id: 'cust-9', name: 'Enterprise Plus' }, blockers: [] },
  { id: 'deal-7', name: 'Pilot Program', stage: 'DISCOVERY', value: 15000, currency: 'USD', probability: 30, customer: { id: 'cust-4', name: 'Startup Labs' }, blockers: [] },
  { id: 'deal-8', name: 'Multi-Team License', stage: 'PROPOSAL', value: 95000, currency: 'USD', probability: 55, closeDate: '2024-02-20', customer: { id: 'cust-3', name: 'Global Dynamics' }, blockers: [{ id: 'blk-3', description: 'Need bulk import feature', featureRequestId: 'feat-2' }] },
  { id: 'deal-9', name: 'SMB Starter', stage: 'CLOSED_LOST', value: 8000, currency: 'USD', probability: 0, closeDate: '2024-01-05', customer: { id: 'cust-10', name: 'QuickScale' }, blockers: [] },
];

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  tenantId,
  onSelectDeal,
}) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    loadDeals();
  }, [tenantId]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deals', {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setDeals(data.data || []);
    } catch (error) {
      console.error('Failed to load deals, using demo data:', error);
      setDeals(demoDeals);
    } finally {
      setLoading(false);
    }
  };

  const getDealsByStage = (stage: string): Deal[] => {
    return deals.filter(d => d.stage === stage);
  };

  const getStageValue = (stage: string): number => {
    return getDealsByStage(stage).reduce((sum, d) => sum + d.value, 0);
  };

  const activeStages = showClosed
    ? STAGES
    : STAGES.filter(s => !s.key.startsWith('CLOSED'));

  const totalPipelineValue = deals
    .filter(d => !d.stage.startsWith('CLOSED'))
    .reduce((sum, d) => sum + d.value, 0);

  const weightedPipelineValue = deals
    .filter(d => !d.stage.startsWith('CLOSED'))
    .reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

  const blockedValue = deals
    .filter(d => d.blockers.length > 0 && !d.stage.startsWith('CLOSED'))
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Sales Pipeline</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="rounded"
            />
            Show closed deals
          </label>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Pipeline Value</div>
          <div className="text-2xl font-semibold">${totalPipelineValue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Weighted Value</div>
          <div className="text-2xl font-semibold text-blue-600">
            ${weightedPipelineValue.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Blocked by Features</div>
          <div className="text-2xl font-semibold text-orange-600">
            ${blockedValue.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Open Deals</div>
          <div className="text-2xl font-semibold">
            {deals.filter(d => !d.stage.startsWith('CLOSED')).length}
          </div>
        </Card>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeStages.map((stage) => {
            const stageDeals = getDealsByStage(stage.key);
            const stageValue = getStageValue(stage.key);

            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-72"
              >
                {/* Stage Header */}
                <div className={`${stage.color} rounded-t-lg px-3 py-2`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{stage.label}</span>
                    <span className="text-sm bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    ${stageValue.toLocaleString()}
                  </div>
                </div>

                {/* Stage Content */}
                <div className="bg-gray-50 rounded-b-lg p-2 min-h-96 space-y-2">
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onSelectDeal?.(deal.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{deal.name}</h4>
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {deal.probability}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {deal.customer.name}
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        ${deal.value.toLocaleString()}
                      </div>
                      {deal.closeDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Close: {new Date(deal.closeDate).toLocaleDateString()}
                        </div>
                      )}
                      {deal.blockers.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {deal.blockers.length} blocker{deal.blockers.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
