import type { ElementMetadata } from '../../dom-context/enhanced-element-selector';

interface LayoutPanelProps {
  element: HTMLElement;
  metadata: ElementMetadata;
  onStyleChange: (property: string, value: string) => void;
  previewMode: boolean;
}

export function LayoutPanel({
  element,
  metadata,
  onStyleChange,
  previewMode,
}: LayoutPanelProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="text-center text-gray-500">
        <div className="text-sm">Layout Panel</div>
        <div className="mt-1 text-xs">Coming soon...</div>
      </div>
    </div>
  );
}
