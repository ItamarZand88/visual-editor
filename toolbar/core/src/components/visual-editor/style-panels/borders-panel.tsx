import type { ElementMetadata } from '../../dom-context/enhanced-element-selector';

interface BordersPanelProps {
  element: HTMLElement;
  metadata: ElementMetadata;
  onStyleChange: (property: string, value: string) => void;
  previewMode: boolean;
}

export function BordersPanel({
  element,
  metadata,
  onStyleChange,
  previewMode,
}: BordersPanelProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="text-center text-gray-500">
        <div className="text-sm">Borders Panel</div>
        <div className="mt-1 text-xs">Coming soon...</div>
      </div>
    </div>
  );
}
