/**
 * RoadmapView - Feature backlog and roadmap view
 * @prompt-id forge-v4.1:ui:view:roadmap:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState } from 'react';
import { FeatureBacklog } from '../components/features';

interface RoadmapViewProps {
  tenantId: string;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ tenantId }) => {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-6 overflow-auto">
        <FeatureBacklog
          tenantId={tenantId}
          onSelectFeature={setSelectedFeatureId}
        />
      </div>
      {selectedFeatureId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Feature Request Details</h2>
              <button
                onClick={() => setSelectedFeatureId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-500">Feature ID: {selectedFeatureId}</p>
              {/* Feature detail component would go here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapView;
