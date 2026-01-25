/**
 * Attribute Editor - Form for editing identity attributes
 * @prompt-id forge-v4.1:web:components:identity:attribute-editor:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { X, Save, Trash2 } from 'lucide-react';
import type { IdentityAttribute } from '../../api/identity';

interface AttributeEditorProps {
  attribute?: IdentityAttribute;
  onSave: (data: {
    key: string;
    value: string;
    category: IdentityAttribute['category'];
    confidence: number;
    source: IdentityAttribute['source'];
  }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const categories: IdentityAttribute['category'][] = [
  'demographic',
  'preference',
  'skill',
  'goal',
  'constraint',
  'context',
];

const sources: IdentityAttribute['source'][] = ['explicit', 'inferred', 'imported'];

// Helper to convert value to string for editing
function valueToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

export function AttributeEditor({ attribute, onSave, onDelete, onCancel }: AttributeEditorProps) {
  const [key, setKey] = useState(attribute?.key || '');
  const [value, setValue] = useState(valueToString(attribute?.value));
  const [category, setCategory] = useState<IdentityAttribute['category']>(attribute?.category || 'preference');
  const [confidence, setConfidence] = useState(attribute?.confidence ?? 0.8);
  const [source, setSource] = useState<IdentityAttribute['source']>(attribute?.source || 'explicit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ key, value, category, confidence, source });
  };

  const isEditing = !!attribute;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
          {isEditing ? 'Edit Attribute' : 'New Attribute'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-claude-neutral-500 hover:text-claude-neutral-700 dark:hover:text-claude-neutral-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
            Key
          </label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isEditing}
            placeholder="e.g., preferred_language"
            className={clsx(
              'w-full px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent',
              isEditing && 'opacity-60 cursor-not-allowed'
            )}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as IdentityAttribute['category'])}
            className={clsx(
              'w-full px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Value */}
      <div>
        <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
          Value
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter the attribute value..."
          rows={3}
          className={clsx(
            'w-full px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
            'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
            'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent',
            'resize-none'
          )}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
            Confidence: {Math.round(confidence * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full accent-claude-primary-500"
          />
          <div className="flex justify-between text-xs text-claude-neutral-500 mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as IdentityAttribute['source'])}
            className={clsx(
              'w-full px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          >
            {sources.map((src) => (
              <option key={src} value={src}>
                {src.charAt(0).toUpperCase() + src.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-claude-cream-300 dark:border-claude-neutral-600">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-2 text-claude-error hover:bg-claude-error/10 rounded-claude-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-claude-neutral-600 dark:text-claude-neutral-400 hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 rounded-claude-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-claude-primary-500 text-white rounded-claude-sm hover:bg-claude-primary-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
