/**
 * Entity Browser - Browse and manage intent entities
 * @prompt-id forge-v4.1:web:components:intent:entity-browser:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Box,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  Link as LinkIcon,
  Workflow,
} from 'lucide-react';
import type { IntentEntity, EntityAttribute, EntityStateMachine } from '../../api/intent-graphs';

interface EntityBrowserProps {
  entities: IntentEntity[];
  onAddEntity: () => void;
  onEditEntity: (entity: IntentEntity) => void;
  selectedEntityId?: string;
  onSelectEntity: (entityId: string) => void;
}

export function EntityBrowser({
  entities,
  onAddEntity,
  onEditEntity,
  selectedEntityId,
  onSelectEntity,
}: EntityBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  const filteredEntities = entities.filter(
    (entity) =>
      searchQuery === '' ||
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpanded = (entityId: string) => {
    const newExpanded = new Set(expandedEntities);
    if (newExpanded.has(entityId)) {
      newExpanded.delete(entityId);
    } else {
      newExpanded.add(entityId);
    }
    setExpandedEntities(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-500" />
          Entities
        </h3>
        <button onClick={onAddEntity} className="claude-btn-ghost flex items-center gap-1 text-sm">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-3 py-2 text-sm rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-auto">
        {filteredEntities.length === 0 ? (
          <div className="text-center py-8 text-claude-neutral-500">
            <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No entities found</p>
          </div>
        ) : (
          <div className="divide-y divide-claude-cream-200 dark:divide-claude-neutral-700">
            {filteredEntities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                isExpanded={expandedEntities.has(entity.id)}
                onSelect={() => onSelectEntity(entity.id)}
                onToggleExpand={() => toggleExpanded(entity.id)}
                onEdit={() => onEditEntity(entity)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntityCard({
  entity,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onEdit,
}: {
  entity: IntentEntity;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={clsx(
        'transition-colors',
        isSelected && 'bg-claude-primary-50 dark:bg-claude-primary-900/20'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggleExpand} className="p-1">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-claude-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-claude-neutral-500" />
          )}
        </button>

        <button onClick={onSelect} className="flex-1 text-left">
          <p className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">{entity.name}</p>
          <p className="text-xs text-claude-neutral-500 line-clamp-1">{entity.description}</p>
        </button>

        <div className="flex items-center gap-2 text-xs text-claude-neutral-500">
          <span className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            {entity.attributes.length}
          </span>
          {entity.relationships && entity.relationships.length > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              {entity.relationships.length}
            </span>
          )}
          {entity.stateMachine && (
            <span className="flex items-center gap-1 text-purple-500">
              <Workflow className="w-3 h-3" />
            </span>
          )}
        </div>

        <button
          onClick={onEdit}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-600 rounded"
        >
          <Settings className="w-4 h-4 text-claude-neutral-500" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 ml-6 space-y-3">
          {/* Attributes */}
          <div>
            <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
              Attributes
            </p>
            <div className="flex flex-wrap gap-1">
              {entity.attributes.map((attr) => (
                <AttributeBadge key={attr.name} attribute={attr} />
              ))}
            </div>
          </div>

          {/* Relationships */}
          {entity.relationships && entity.relationships.length > 0 && (
            <div>
              <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                Relationships
              </p>
              <div className="space-y-1">
                {entity.relationships.map((rel, i) => (
                  <div key={i} className="text-xs text-claude-neutral-500 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>{rel.type}</span>
                    <span className="text-claude-neutral-400">→</span>
                    <span className="text-claude-primary-600 dark:text-claude-primary-400">{rel.targetEntityId}</span>
                    <span className="text-claude-neutral-400">({rel.cardinality})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State Machine */}
          {entity.stateMachine && (
            <div>
              <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                State Machine
              </p>
              <StateMachinePreview stateMachine={entity.stateMachine} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttributeBadge({ attribute }: { attribute: EntityAttribute }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
        'bg-claude-cream-200 dark:bg-claude-neutral-600',
        'text-claude-neutral-700 dark:text-claude-neutral-300'
      )}
    >
      <span className="font-medium">{attribute.name}</span>
      <span className="text-claude-neutral-500">:</span>
      <span className="text-blue-600 dark:text-blue-400">{attribute.type}</span>
      {attribute.required && <span className="text-claude-error">*</span>}
    </span>
  );
}

function StateMachinePreview({ stateMachine }: { stateMachine: EntityStateMachine }) {
  return (
    <div className="flex flex-wrap gap-1">
      {stateMachine.states.map((state) => (
        <span
          key={state}
          className={clsx(
            'px-2 py-0.5 rounded text-xs',
            state === stateMachine.initialState
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-400'
              : 'bg-claude-cream-200 dark:bg-claude-neutral-600 text-claude-neutral-700 dark:text-claude-neutral-300'
          )}
        >
          {state}
        </span>
      ))}
    </div>
  );
}
