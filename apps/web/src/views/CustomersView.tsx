/**
 * CustomersView - Comprehensive customer management with health monitoring
 * @prompt-id forge-v4.1:ui:view:customers:002
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';

interface Customer {
  id: string;
  name: string;
  type: string;
  tier: string;
  healthScore: number;
  churnRisk: number;
  mrr: number;
  arr: number;
  createdAt: string;
  lastEngagement?: string;
  primaryContact?: {
    name: string;
    email: string;
    title: string;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
  }>;
  subscriptions: Array<{
    plan: string;
    status: string;
    seats: number;
    renewalDate: string;
  }>;
}

interface CustomersViewProps {
  tenantId: string;
}

// Demo customers with rich data
const demoCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Acme Corporation',
    type: 'B2B_ENTERPRISE',
    tier: 'STRATEGIC',
    healthScore: 92,
    churnRisk: 0.05,
    mrr: 45000,
    arr: 540000,
    createdAt: '2023-01-15',
    lastEngagement: '2024-01-22',
    primaryContact: { name: 'Sarah Chen', email: 'sarah.chen@acme.com', title: 'VP Engineering' },
    recentActivity: [
      { id: 'a1', type: 'QBR', description: 'Quarterly business review completed', date: '2024-01-20' },
      { id: 'a2', type: 'SUPPORT', description: 'Resolved API integration issue', date: '2024-01-18' },
      { id: 'a3', type: 'FEATURE', description: 'Requested SSO/SAML support', date: '2024-01-15' },
    ],
    subscriptions: [{ plan: 'Enterprise Plus', status: 'ACTIVE', seats: 250, renewalDate: '2024-06-15' }],
  },
  {
    id: 'cust-2',
    name: 'TechStart Inc',
    type: 'B2B_MID_MARKET',
    tier: 'GROWTH',
    healthScore: 78,
    churnRisk: 0.15,
    mrr: 12000,
    arr: 144000,
    createdAt: '2023-06-01',
    lastEngagement: '2024-01-19',
    primaryContact: { name: 'Mike Johnson', email: 'mike@techstart.io', title: 'CTO' },
    recentActivity: [
      { id: 'a4', type: 'DEMO', description: 'New features demo session', date: '2024-01-19' },
      { id: 'a5', type: 'NPS', description: 'NPS response: 8', date: '2024-01-10' },
    ],
    subscriptions: [{ plan: 'Growth', status: 'ACTIVE', seats: 50, renewalDate: '2024-09-01' }],
  },
  {
    id: 'cust-3',
    name: 'Global Dynamics',
    type: 'B2B_ENTERPRISE',
    tier: 'ENTERPRISE',
    healthScore: 85,
    churnRisk: 0.08,
    mrr: 28000,
    arr: 336000,
    createdAt: '2023-03-20',
    lastEngagement: '2024-01-21',
    primaryContact: { name: 'Lisa Park', email: 'lpark@globaldynamics.com', title: 'Director of IT' },
    recentActivity: [
      { id: 'a6', type: 'EXPANSION', description: 'Added 30 new seats', date: '2024-01-21' },
      { id: 'a7', type: 'TRAINING', description: 'Admin training session', date: '2024-01-14' },
    ],
    subscriptions: [{ plan: 'Enterprise', status: 'ACTIVE', seats: 150, renewalDate: '2024-04-20' }],
  },
  {
    id: 'cust-4',
    name: 'Startup Labs',
    type: 'B2B_SMB',
    tier: 'STANDARD',
    healthScore: 45,
    churnRisk: 0.65,
    mrr: 2500,
    arr: 30000,
    createdAt: '2023-09-01',
    lastEngagement: '2023-12-15',
    primaryContact: { name: 'Alex Rivera', email: 'alex@startuplabs.co', title: 'Founder' },
    recentActivity: [
      { id: 'a8', type: 'SUPPORT', description: 'Multiple support tickets opened', date: '2023-12-15' },
      { id: 'a9', type: 'COMPLAINT', description: 'Complained about pricing', date: '2023-12-10' },
    ],
    subscriptions: [{ plan: 'Standard', status: 'ACTIVE', seats: 15, renewalDate: '2024-03-01' }],
  },
  {
    id: 'cust-5',
    name: 'MegaCorp International',
    type: 'B2B_ENTERPRISE',
    tier: 'STRATEGIC',
    healthScore: 88,
    churnRisk: 0.10,
    mrr: 75000,
    arr: 900000,
    createdAt: '2022-08-15',
    lastEngagement: '2024-01-23',
    primaryContact: { name: 'James Wilson', email: 'jwilson@megacorp.com', title: 'SVP Technology' },
    recentActivity: [
      { id: 'a10', type: 'EXECUTIVE', description: 'Executive sponsor meeting', date: '2024-01-23' },
      { id: 'a11', type: 'EXPANSION', description: 'Discussing global rollout', date: '2024-01-20' },
    ],
    subscriptions: [{ plan: 'Enterprise Plus', status: 'ACTIVE', seats: 500, renewalDate: '2024-08-15' }],
  },
  {
    id: 'cust-6',
    name: 'DataDriven Co',
    type: 'B2B_SMB',
    tier: 'GROWTH',
    healthScore: 38,
    churnRisk: 0.72,
    mrr: 3200,
    arr: 38400,
    createdAt: '2023-07-28',
    lastEngagement: '2024-01-05',
    primaryContact: { name: 'Emma Watson', email: 'emma@datadriven.co', title: 'Head of Product' },
    recentActivity: [
      { id: 'a12', type: 'CHURN_RISK', description: 'Low usage detected', date: '2024-01-05' },
      { id: 'a13', type: 'OUTREACH', description: 'CSM outreach attempted', date: '2024-01-03' },
    ],
    subscriptions: [{ plan: 'Growth', status: 'ACTIVE', seats: 20, renewalDate: '2024-01-28' }],
  },
];

const tierColors: Record<string, string> = {
  STRATEGIC: 'bg-purple-100 text-purple-800 border-purple-200',
  ENTERPRISE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  GROWTH: 'bg-blue-100 text-blue-800 border-blue-200',
  STANDARD: 'bg-gray-100 text-gray-800 border-gray-200',
  FREE: 'bg-green-100 text-green-800 border-green-200',
};

const activityIcons: Record<string, string> = {
  QBR: '📊',
  SUPPORT: '🎫',
  FEATURE: '✨',
  DEMO: '🎬',
  NPS: '📈',
  EXPANSION: '📈',
  TRAINING: '🎓',
  COMPLAINT: '⚠️',
  EXECUTIVE: '👔',
  CHURN_RISK: '🚨',
  OUTREACH: '📞',
};

export const CustomersView: React.FC<CustomersViewProps> = ({ tenantId: _tenantId }) => {
  const [customers] = useState<Customer[]>(demoCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'healthScore' | 'churnRisk' | 'mrr' | 'name'>('churnRisk');

  // Computed metrics
  const metrics = useMemo(() => {
    const atRisk = customers.filter(c => c.churnRisk > 0.5);
    const healthy = customers.filter(c => c.healthScore >= 80);
    const totalMRR = customers.reduce((sum, c) => sum + c.mrr, 0);
    const totalARR = customers.reduce((sum, c) => sum + c.arr, 0);
    const avgHealth = customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length;
    return { atRisk: atRisk.length, healthy: healthy.length, totalMRR, totalARR, avgHealth };
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (tierFilter) {
      result = result.filter(c => c.tier === tierFilter);
    }
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'churnRisk': return b.churnRisk - a.churnRisk;
        case 'healthScore': return a.healthScore - b.healthScore;
        case 'mrr': return b.mrr - a.mrr;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [customers, searchQuery, tierFilter, sortBy]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getChurnColor = (risk: number) => {
    if (risk <= 0.2) return 'text-green-600';
    if (risk <= 0.4) return 'text-yellow-600';
    if (risk <= 0.6) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-claude-neutral-900">
      {/* Left Panel - Customer List */}
      <div className="w-1/2 border-r border-gray-200 dark:border-claude-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Add Customer
            </button>
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total MRR</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">${metrics.totalMRR.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg Health</div>
              <div className="text-lg font-bold text-blue-600">{metrics.avgHealth.toFixed(0)}%</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">At Risk</div>
              <div className="text-lg font-bold text-red-600">{metrics.atRisk}</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Healthy</div>
              <div className="text-lg font-bold text-green-600">{metrics.healthy}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            >
              <option value="">All Tiers</option>
              <option value="STRATEGIC">Strategic</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="GROWTH">Growth</option>
              <option value="STANDARD">Standard</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            >
              <option value="churnRisk">Churn Risk</option>
              <option value="healthScore">Health Score</option>
              <option value="mrr">MRR</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedCustomer?.id === customer.id
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                  : 'bg-white dark:bg-claude-neutral-800 border-gray-200 dark:border-claude-neutral-700 hover:border-gray-300 dark:hover:border-claude-neutral-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${tierColors[customer.tier]}`}>
                      {customer.tier}
                    </span>
                    {customer.churnRisk > 0.5 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        AT RISK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{customer.type.replace(/_/g, ' ')}</span>
                    <span>${customer.mrr.toLocaleString()}/mo</span>
                    {customer.primaryContact && (
                      <span>{customer.primaryContact.name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${getHealthColor(customer.healthScore)}`}>
                    <span className="text-lg font-bold">{customer.healthScore}</span>
                    <span className="text-xs">health</span>
                  </div>
                </div>
              </div>

              {/* Health & Churn Bar */}
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Health</span>
                    <span className={getHealthColor(customer.healthScore).split(' ')[0]}>{customer.healthScore}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        customer.healthScore >= 80 ? 'bg-green-500' :
                        customer.healthScore >= 60 ? 'bg-yellow-500' :
                        customer.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${customer.healthScore}%` }}
                    />
                  </div>
                </div>
                <div className="w-24">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Churn</span>
                    <span className={getChurnColor(customer.churnRisk)}>{(customer.churnRisk * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        customer.churnRisk <= 0.2 ? 'bg-green-500' :
                        customer.churnRisk <= 0.4 ? 'bg-yellow-500' :
                        customer.churnRisk <= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${customer.churnRisk * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Customer Detail */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-claude-neutral-800">
        {selectedCustomer ? (
          <>
            {/* Customer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-claude-neutral-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h2>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${tierColors[selectedCustomer.tier]}`}>
                      {selectedCustomer.tier}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">{selectedCustomer.type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-claude-neutral-600">
                    Schedule Call
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Send Email
                  </button>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className={`text-3xl font-bold ${getHealthColor(selectedCustomer.healthScore).split(' ')[0]}`}>
                    {selectedCustomer.healthScore}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Health Score</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className={`text-3xl font-bold ${getChurnColor(selectedCustomer.churnRisk)}`}>
                    {(selectedCustomer.churnRisk * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Churn Risk</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${(selectedCustomer.mrr / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">MRR</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${(selectedCustomer.arr / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ARR</div>
                </Card>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Primary Contact */}
              {selectedCustomer.primaryContact && (
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Primary Contact</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedCustomer.primaryContact.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{selectedCustomer.primaryContact.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{selectedCustomer.primaryContact.title}</div>
                      <div className="text-sm text-blue-600">{selectedCustomer.primaryContact.email}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Subscription */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Subscription</h3>
                {selectedCustomer.subscriptions.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{sub.plan}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{sub.seats} seats</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sub.status}
                      </span>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Renews {new Date(sub.renewalDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Recent Activity */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {selectedCustomer.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-claude-neutral-700 last:border-0">
                      <span className="text-xl">{activityIcons[activity.type] || '📌'}</span>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900 dark:text-white">{activity.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(activity.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    📞 Log a Call
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    📝 Create Task
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    📊 View Analytics
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    🎯 Set Health Goal
                  </button>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">Select a Customer</h3>
              <p className="text-sm">Choose a customer from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersView;
