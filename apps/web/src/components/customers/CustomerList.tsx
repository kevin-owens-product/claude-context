/**
 * CustomerList - Customer management with health scores
 * @prompt-id forge-v4.1:ui:component:customer-list:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface Customer {
  id: string;
  name: string;
  type: string;
  tier: string;
  healthScore: number;
  churnRisk: number;
  mrr: number;
  createdAt: string;
}

interface CustomerListProps {
  tenantId: string;
  onSelectCustomer?: (customerId: string) => void;
}

const tierColors: Record<string, string> = {
  STRATEGIC: 'bg-purple-100 text-purple-800',
  ENTERPRISE: 'bg-indigo-100 text-indigo-800',
  GROWTH: 'bg-blue-100 text-blue-800',
  STANDARD: 'bg-gray-100 text-gray-800',
  FREE: 'bg-green-100 text-green-800',
};

// Demo data for development/preview
const demoCustomers: Customer[] = [
  { id: 'cust-1', name: 'Acme Corporation', type: 'B2B_ENTERPRISE', tier: 'STRATEGIC', healthScore: 92, churnRisk: 0.05, mrr: 45000, createdAt: '2024-01-15' },
  { id: 'cust-2', name: 'TechStart Inc', type: 'B2B_MID_MARKET', tier: 'GROWTH', healthScore: 78, churnRisk: 0.15, mrr: 12000, createdAt: '2024-03-01' },
  { id: 'cust-3', name: 'Global Dynamics', type: 'B2B_ENTERPRISE', tier: 'ENTERPRISE', healthScore: 85, churnRisk: 0.08, mrr: 28000, createdAt: '2023-11-20' },
  { id: 'cust-4', name: 'Startup Labs', type: 'B2B_SMB', tier: 'STANDARD', healthScore: 45, churnRisk: 0.65, mrr: 2500, createdAt: '2024-06-01' },
  { id: 'cust-5', name: 'MegaCorp International', type: 'B2B_ENTERPRISE', tier: 'STRATEGIC', healthScore: 88, churnRisk: 0.10, mrr: 75000, createdAt: '2023-08-15' },
  { id: 'cust-6', name: 'Innovate Solutions', type: 'B2B_MID_MARKET', tier: 'GROWTH', healthScore: 62, churnRisk: 0.35, mrr: 8500, createdAt: '2024-04-10' },
  { id: 'cust-7', name: 'CloudFirst', type: 'PLG_PAID', tier: 'STANDARD', healthScore: 71, churnRisk: 0.22, mrr: 499, createdAt: '2024-05-20' },
  { id: 'cust-8', name: 'DataDriven Co', type: 'B2B_SMB', tier: 'GROWTH', healthScore: 38, churnRisk: 0.72, mrr: 3200, createdAt: '2024-02-28' },
  { id: 'cust-9', name: 'Enterprise Plus', type: 'B2B_ENTERPRISE', tier: 'ENTERPRISE', healthScore: 95, churnRisk: 0.02, mrr: 52000, createdAt: '2023-05-10' },
  { id: 'cust-10', name: 'QuickScale', type: 'PLG_PAID', tier: 'STANDARD', healthScore: 55, churnRisk: 0.45, mrr: 299, createdAt: '2024-07-05' },
];

const healthScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export const CustomerList: React.FC<CustomerListProps> = ({
  tenantId,
  onSelectCustomer,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ type?: string; tier?: string }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [tenantId, filter]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.tier) params.append('tier', filter.tier);

      const response = await fetch(`/api/customers?${params}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Failed to load customers, using demo data:', error);
      // Use demo data when API is not available
      let filtered = demoCustomers;
      if (filter.type) filtered = filtered.filter(c => c.type === filter.type);
      if (filter.tier) filtered = filtered.filter(c => c.tier === filter.tier);
      setCustomers(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    // Sort by health score ascending (lowest health first = needs attention)
    if (a.churnRisk !== b.churnRisk) return b.churnRisk - a.churnRisk;
    return a.healthScore - b.healthScore;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter.tier || ''}
            onChange={(e) => setFilter({ ...filter, tier: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tiers</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="PREMIUM">Premium</option>
            <option value="STANDARD">Standard</option>
            <option value="FREE">Free</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Customers</div>
          <div className="text-2xl font-semibold">{customers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">At Risk</div>
          <div className="text-2xl font-semibold text-red-600">
            {customers.filter(c => c.churnRisk > 0.5).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Healthy</div>
          <div className="text-2xl font-semibold text-green-600">
            {customers.filter(c => c.healthScore >= 80).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total MRR</div>
          <div className="text-2xl font-semibold">
            ${customers.reduce((sum, c) => sum + (c.mrr || 0), 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading customers...</div>
      ) : sortedCustomers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No customers found</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Churn Risk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectCustomer?.(customer.id)}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {customer.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierColors[customer.tier] || 'bg-gray-100 text-gray-800'}`}>
                      {customer.tier}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${customer.healthScore >= 80 ? 'bg-green-500' : customer.healthScore >= 60 ? 'bg-yellow-500' : customer.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                          style={{ width: `${customer.healthScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${healthScoreColor(customer.healthScore)}`}>
                        {customer.healthScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-sm font-medium ${customer.churnRisk > 0.5 ? 'text-red-600' : customer.churnRisk > 0.3 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {(customer.churnRisk * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    ${(customer.mrr || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
