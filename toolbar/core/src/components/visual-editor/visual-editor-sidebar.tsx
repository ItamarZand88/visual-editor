import { useState, useCallback, useMemo } from 'preact/hooks';
import type { ElementMetadata } from '../dom-context/enhanced-element-selector';
import {
  TypographyPanel,
  ColorsPanel,
  SpacingPanel,
  BordersPanel,
  LayoutPanel,
  EffectsPanel,
} from './style-panels';
import {
  TypeIcon,
  PaletteIcon,
  SpaceIcon,
  BoxIcon,
  LayoutIcon,
  WandIcon,
  XIcon,
  CheckIcon,
  RotateCcwIcon,
  CodeIcon,
} from 'lucide-react';

export interface StyleChange {
  property: string;
  value: string;
  previousValue: string;
}

export interface VisualEditorSidebarProps {
  selectedElement: HTMLElement | null;
  selectedMetadata: ElementMetadata | null;
  onClose: () => void;
  onApplyChanges?: (changes: StyleChange[]) => void;
  onResetChanges?: () => void;
}

type StylePanelTab =
  | 'typography'
  | 'colors'
  | 'spacing'
  | 'borders'
  | 'layout'
  | 'effects';

export function VisualEditorSidebar({
  selectedElement,
  selectedMetadata,
  onClose,
  onApplyChanges,
  onResetChanges,
}: VisualEditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<StylePanelTab>('typography');
  const [pendingChanges, setPendingChanges] = useState<StyleChange[]>([]);
  const [previewMode, setPreviewMode] = useState(true);

  const tabs = useMemo(
    () => [
      { id: 'typography' as const, label: 'Text', icon: TypeIcon },
      { id: 'colors' as const, label: 'Colors', icon: PaletteIcon },
      { id: 'spacing' as const, label: 'Spacing', icon: SpaceIcon },
      { id: 'borders' as const, label: 'Borders', icon: BoxIcon },
      { id: 'layout' as const, label: 'Layout', icon: LayoutIcon },
      { id: 'effects' as const, label: 'Effects', icon: WandIcon },
    ],
    [],
  );

  const handleStyleChange = useCallback(
    (property: string, value: string) => {
      if (!selectedElement) return;

      const previousValue =
        selectedElement.style.getPropertyValue(property) ||
        window.getComputedStyle(selectedElement).getPropertyValue(property);

      // Apply change immediately if in preview mode
      if (previewMode) {
        selectedElement.style.setProperty(property, value);
      }

      // Track the change
      setPendingChanges((prev) => {
        const existing = prev.find((change) => change.property === property);
        if (existing) {
          return prev.map((change) =>
            change.property === property ? { ...change, value } : change,
          );
        }
        return [...prev, { property, value, previousValue }];
      });
    },
    [selectedElement, previewMode],
  );

  const handleApplyChanges = useCallback(() => {
    if (pendingChanges.length > 0 && onApplyChanges) {
      onApplyChanges(pendingChanges);
      setPendingChanges([]);
    }
  }, [pendingChanges, onApplyChanges]);

  const handleResetChanges = useCallback(() => {
    if (!selectedElement) return;

    // Revert all pending changes
    pendingChanges.forEach((change) => {
      selectedElement.style.setProperty(change.property, change.previousValue);
    });

    setPendingChanges([]);

    if (onResetChanges) {
      onResetChanges();
    }
  }, [selectedElement, pendingChanges, onResetChanges]);

  const renderActivePanel = () => {
    if (!selectedElement || !selectedMetadata) {
      return (
        <div className="flex h-64 flex-col items-center justify-center text-gray-500">
          <CodeIcon className="mb-2 h-8 w-8" />
          <div className="font-medium text-sm">No Element Selected</div>
          <div className="mt-1 text-center text-xs">
            Select an element to start editing its styles
          </div>
        </div>
      );
    }

    const commonProps = {
      element: selectedElement,
      metadata: selectedMetadata,
      onStyleChange: handleStyleChange,
      previewMode,
    };

    switch (activeTab) {
      case 'typography':
        return <TypographyPanel {...commonProps} />;
      case 'colors':
        return <ColorsPanel {...commonProps} />;
      case 'spacing':
        return <SpacingPanel {...commonProps} />;
      case 'borders':
        return <BordersPanel {...commonProps} />;
      case 'layout':
        return <LayoutPanel {...commonProps} />;
      case 'effects':
        return <EffectsPanel {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-4 right-4 bottom-4 z-[10000] flex w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-gray-200 border-b p-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Visual Editor</h2>
          {selectedElement && (
            <div className="mt-1 text-gray-500 text-xs">
              &lt;
              {selectedMetadata?.tagName ||
                selectedElement.tagName.toLowerCase()}
              &gt;
              {selectedElement.id && ` #${selectedElement.id}`}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 transition-colors hover:bg-gray-100"
          aria-label="Close visual editor"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-gray-200 border-b bg-gray-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-1 px-1 py-2 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 border-b-2 bg-white text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto">{renderActivePanel()}</div>

      {/* Footer Actions */}
      {selectedElement && pendingChanges.length > 0 && (
        <div className="border-gray-200 border-t bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-gray-600 text-sm">
              {pendingChanges.length} change
              {pendingChanges.length !== 1 ? 's' : ''} pending
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.currentTarget.checked)}
                className="rounded"
              />
              Live Preview
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyChanges}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <CheckIcon className="h-4 w-4" />
              Apply Changes
            </button>
            <button
              type="button"
              onClick={handleResetChanges}
              className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <RotateCcwIcon className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
