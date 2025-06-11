import { useWindowSize } from '@/hooks/use-window-size';
import { useCyclicUpdate } from '@/hooks/use-cyclic-update';
import { useCallback, useMemo, useRef } from 'preact/hooks';
import type { HTMLAttributes } from 'preact/compat';
import { EditIcon, CodeIcon, PaletteIcon } from 'lucide-react';
import type { ElementMetadata } from './enhanced-element-selector';

export interface VisualEditingProposalProps
  extends HTMLAttributes<HTMLDivElement> {
  refElement: HTMLElement;
  metadata: ElementMetadata;
}

export function VisualEditingProposal({
  refElement,
  metadata,
  ...props
}: VisualEditingProposalProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const windowSize = useWindowSize();

  const updateBoxPosition = useCallback(() => {
    if (boxRef.current && refElement) {
      const referenceRect = refElement.getBoundingClientRect();

      // Position the proposal box above the element if there's space, otherwise below
      const spaceAbove = referenceRect.top;
      const spaceBelow = windowSize.height - referenceRect.bottom;
      const boxHeight = 120; // Estimated height of the proposal box

      let top: number;
      if (spaceAbove >= boxHeight) {
        // Position above
        top = referenceRect.top - boxHeight - 8;
      } else if (spaceBelow >= boxHeight) {
        // Position below
        top = referenceRect.bottom + 8;
      } else {
        // Center vertically if neither space is sufficient
        top = Math.max(8, (windowSize.height - boxHeight) / 2);
      }

      // Keep horizontal position within viewport
      let left = referenceRect.left;
      const boxWidth = 280; // Estimated width
      if (left + boxWidth > windowSize.width) {
        left = Math.max(8, windowSize.width - boxWidth - 8);
      }

      boxRef.current.style.top = `${top}px`;
      boxRef.current.style.left = `${left}px`;
      boxRef.current.style.display = 'block';
    }
  }, [refElement, windowSize]);

  useCyclicUpdate(updateBoxPosition, 30);

  const editableStylesCount = useMemo(() => {
    return metadata.visualEditingInfo?.editableStyles.length || 0;
  }, [metadata]);

  const frameworkInfo = useMemo(() => {
    if (metadata.frameworkInfo) {
      return `${metadata.frameworkInfo.framework}${
        metadata.frameworkInfo.componentName
          ? ` • ${metadata.frameworkInfo.componentName}`
          : ''
      }`;
    }
    return null;
  }, [metadata.frameworkInfo]);

  return (
    <div
      {...props}
      className="fixed z-[10000] w-70 max-w-xs rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{
        zIndex: 10000,
        fontSize: '13px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      ref={boxRef}
    >
      {/* Header */}
      <div className="rounded-t-lg border-blue-100 border-b bg-blue-50 p-3">
        <div className="mb-1 flex items-center gap-2">
          <EditIcon className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-900">Visual Editor</span>
        </div>
        <div className="text-blue-700 text-xs">
          Click to select and edit this element
        </div>
      </div>

      {/* Element Info */}
      <div className="space-y-3 p-3">
        {/* Element Details */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CodeIcon className="h-3 w-3 text-gray-500" />
            <span className="font-medium text-gray-700">Element</span>
          </div>
          <div className="rounded bg-gray-50 px-2 py-1 font-mono text-gray-600 text-xs">
            &lt;{metadata.tagName}
            {metadata.id && ` id="${metadata.id}"`}
            {metadata.className && ` class="${metadata.className}"`}
            &gt;
          </div>
        </div>

        {/* Framework Info */}
        {frameworkInfo && (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="font-medium text-gray-700 text-xs">
                Framework
              </span>
            </div>
            <div className="rounded bg-green-50 px-2 py-1 text-green-700 text-xs">
              {frameworkInfo}
            </div>
          </div>
        )}

        {/* Styling Info */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <PaletteIcon className="h-3 w-3 text-purple-500" />
            <span className="font-medium text-gray-700 text-xs">Styling</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Editable properties:</span>
              <span className="font-medium text-purple-600">
                {editableStylesCount}
              </span>
            </div>
            {metadata.visualEditingInfo?.hasInlineStyles && (
              <div className="rounded bg-orange-50 px-2 py-1 text-orange-600 text-xs">
                Has inline styles
              </div>
            )}
            {metadata.visualEditingInfo &&
              metadata.visualEditingInfo.appliedClasses.length > 0 && (
                <div className="rounded bg-blue-50 px-2 py-1 text-blue-600 text-xs">
                  CSS classes:{' '}
                  {metadata.visualEditingInfo.appliedClasses.length}
                </div>
              )}
          </div>
        </div>

        {/* Quick Actions Hint */}
        <div className="border-gray-100 border-t pt-2">
          <div className="text-center text-gray-500 text-xs">
            Click to open style editor
          </div>
        </div>
      </div>
    </div>
  );
}
