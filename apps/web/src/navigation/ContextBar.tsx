/**
 * ContextBar - Bottom bar showing pinned context items
 * Shows pinned goals, constraints, documents, and allows pin/unpin
 */

import { clsx } from 'clsx';
import {
  X,
  Plus,
  Target,
  Shield,
  Zap,
  FileText,
  Layers,
  Pin,
} from 'lucide-react';
import { useWorkspace, type PinnedItem } from '../contexts';

const typeIcons: Record<string, React.ReactNode> = {
  intent: <Target className="w-3 h-3" />,
  context: <FileText className="w-3 h-3" />,
  artifact: <Layers className="w-3 h-3" />,
  goal: <Target className="w-3 h-3" />,
  constraint: <Shield className="w-3 h-3" />,
  behavior: <Zap className="w-3 h-3" />,
};

const typeColors: Record<string, string> = {
  intent: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  context: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  artifact: 'bg-green-500/10 text-green-400 border-green-500/30',
  goal: 'bg-green-500/10 text-green-400 border-green-500/30',
  constraint: 'bg-red-500/10 text-red-400 border-red-500/30',
  behavior: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

interface ContextBarProps {
  onAddContext?: () => void;
}

export function ContextBar({ onAddContext }: ContextBarProps) {
  const { pinnedItems, unpinItem, projectIntents, projectContext } = useWorkspace();

  // Get counts for context summary
  const goalCount = projectIntents.filter(i => i.type === 'goal').length;
  const constraintCount = projectIntents.filter(i => i.type === 'constraint').length;
  const docCount = projectContext.length;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-claude-neutral-900 border-t border-claude-neutral-800">
      {/* Left: Context Summary */}
      <div className="flex items-center gap-3 text-xs text-claude-neutral-500">
        <span className="flex items-center gap-1">
          <Target className="w-3 h-3 text-green-500" />
          {goalCount} goals
        </span>
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-red-500" />
          {constraintCount} constraints
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-blue-500" />
          {docCount} docs
        </span>
      </div>

      {/* Center: Pinned Items */}
      <div className="flex items-center gap-2">
        {pinnedItems.length > 0 ? (
          <>
            <Pin className="w-3 h-3 text-claude-neutral-500" />
            <div className="flex items-center gap-1.5">
              {pinnedItems.map(item => (
                <PinnedItemChip
                  key={item.id}
                  item={item}
                  onRemove={() => unpinItem(item.id)}
                  onClick={() => {
                    // Find the actual item and open detail
                    // This would need to be enhanced to find the actual item
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <span className="text-xs text-claude-neutral-600">
            Pin items to keep context while you work
          </span>
        )}

        {/* Add Context */}
        <button
          onClick={onAddContext}
          className="flex items-center gap-1 px-2 py-1 text-xs text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2">
        {pinnedItems.length > 0 && (
          <button
            onClick={() => pinnedItems.forEach(item => unpinItem(item.id))}
            className="text-xs text-claude-neutral-500 hover:text-claude-neutral-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

interface PinnedItemChipProps {
  item: PinnedItem;
  onRemove: () => void;
  onClick?: () => void;
}

function PinnedItemChip({ item, onRemove, onClick }: PinnedItemChipProps) {
  const colorClass = typeColors[item.subtype || item.type] || typeColors.intent;
  const icon = typeIcons[item.subtype || item.type] || typeIcons.intent;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors group',
        colorClass,
        'hover:opacity-80'
      )}
    >
      {icon}
      <span className="max-w-32 truncate">{item.name}</span>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </button>
  );
}
