import { useCallback, useMemo } from 'preact/hooks';
import type { ElementMetadata } from '../../dom-context/enhanced-element-selector';

interface SpacingPanelProps {
  element: HTMLElement;
  metadata: ElementMetadata;
  onStyleChange: (property: string, value: string) => void;
  previewMode: boolean;
}

interface SpacingValues {
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

export function SpacingPanel({
  element,
  metadata,
  onStyleChange,
  previewMode,
}: SpacingPanelProps) {
  const computedStyles = useMemo(
    () => window.getComputedStyle(element),
    [element],
  );

  const currentValues = useMemo(
    (): SpacingValues => ({
      marginTop: element.style.marginTop || computedStyles.marginTop,
      marginRight: element.style.marginRight || computedStyles.marginRight,
      marginBottom: element.style.marginBottom || computedStyles.marginBottom,
      marginLeft: element.style.marginLeft || computedStyles.marginLeft,
      paddingTop: element.style.paddingTop || computedStyles.paddingTop,
      paddingRight: element.style.paddingRight || computedStyles.paddingRight,
      paddingBottom:
        element.style.paddingBottom || computedStyles.paddingBottom,
      paddingLeft: element.style.paddingLeft || computedStyles.paddingLeft,
    }),
    [element, computedStyles],
  );

  const parsePixelValue = useCallback((value: string): number => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const handleSpacingChange = useCallback(
    (property: string) => (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      onStyleChange(property, `${value}px`);
    },
    [onStyleChange],
  );

  const handleAllMarginChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = `${target.value}px`;
      onStyleChange('margin-top', value);
      onStyleChange('margin-right', value);
      onStyleChange('margin-bottom', value);
      onStyleChange('margin-left', value);
    },
    [onStyleChange],
  );

  const handleAllPaddingChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = `${target.value}px`;
      onStyleChange('padding-top', value);
      onStyleChange('padding-right', value);
      onStyleChange('padding-bottom', value);
      onStyleChange('padding-left', value);
    },
    [onStyleChange],
  );

  return (
    <div className="space-y-8 p-4">
      {/* Margin Section */}
      <div>
        <h3 className="mb-4 font-medium text-gray-700 text-sm">Margin</h3>

        {/* All Margins Control */}
        <div className="mb-4">
          <label className="mb-2 block font-medium text-gray-600 text-xs">
            All Margins
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={parsePixelValue(currentValues.marginTop)}
            onChange={handleAllMarginChange}
            className="mb-1 w-full"
          />
          <div className="text-center text-gray-500 text-xs">
            {parsePixelValue(currentValues.marginTop)}px
          </div>
        </div>

        {/* Individual Margin Controls */}
        <div className="relative">
          {/* Visual Box Model */}
          <div className="mb-4 rounded-lg border-2 border-orange-200 bg-orange-100 p-6">
            <div className="rounded border border-gray-300 bg-white p-4 text-center text-gray-500 text-xs">
              Element Content
            </div>

            {/* Margin Labels */}
            <div className="-top-1 -translate-x-1/2 -translate-y-full absolute left-1/2 transform">
              <span className="font-medium text-orange-600 text-xs">
                {parsePixelValue(currentValues.marginTop)}px
              </span>
            </div>
            <div className="-right-1 -translate-y-1/2 absolute top-1/2 translate-x-full transform">
              <span className="font-medium text-orange-600 text-xs">
                {parsePixelValue(currentValues.marginRight)}px
              </span>
            </div>
            <div className="-bottom-1 -translate-x-1/2 absolute left-1/2 translate-y-full transform">
              <span className="font-medium text-orange-600 text-xs">
                {parsePixelValue(currentValues.marginBottom)}px
              </span>
            </div>
            <div className="-left-1 -translate-x-full -translate-y-1/2 absolute top-1/2 transform">
              <span className="font-medium text-orange-600 text-xs">
                {parsePixelValue(currentValues.marginLeft)}px
              </span>
            </div>
          </div>

          {/* Margin Input Controls */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <label className="mb-1 block text-gray-600">Top</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.marginTop)}
                onChange={handleSpacingChange('margin-top')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Right</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.marginRight)}
                onChange={handleSpacingChange('margin-right')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Bottom</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.marginBottom)}
                onChange={handleSpacingChange('margin-bottom')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Left</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.marginLeft)}
                onChange={handleSpacingChange('margin-left')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Padding Section */}
      <div>
        <h3 className="mb-4 font-medium text-gray-700 text-sm">Padding</h3>

        {/* All Padding Control */}
        <div className="mb-4">
          <label className="mb-2 block font-medium text-gray-600 text-xs">
            All Padding
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={parsePixelValue(currentValues.paddingTop)}
            onChange={handleAllPaddingChange}
            className="mb-1 w-full"
          />
          <div className="text-center text-gray-500 text-xs">
            {parsePixelValue(currentValues.paddingTop)}px
          </div>
        </div>

        {/* Individual Padding Controls */}
        <div className="relative">
          {/* Visual Box Model */}
          <div className="mb-4 rounded-lg border-2 border-green-200 bg-green-100 p-6">
            <div className="rounded border border-gray-300 bg-white p-4 text-center text-gray-500 text-xs">
              Element Content
            </div>

            {/* Padding Labels */}
            <div className="-translate-x-1/2 absolute top-2 left-1/2 transform">
              <span className="font-medium text-green-600 text-xs">
                {parsePixelValue(currentValues.paddingTop)}px
              </span>
            </div>
            <div className="-translate-y-1/2 absolute top-1/2 right-2 transform">
              <span className="font-medium text-green-600 text-xs">
                {parsePixelValue(currentValues.paddingRight)}px
              </span>
            </div>
            <div className="-translate-x-1/2 absolute bottom-2 left-1/2 transform">
              <span className="font-medium text-green-600 text-xs">
                {parsePixelValue(currentValues.paddingBottom)}px
              </span>
            </div>
            <div className="-translate-y-1/2 absolute top-1/2 left-2 transform">
              <span className="font-medium text-green-600 text-xs">
                {parsePixelValue(currentValues.paddingLeft)}px
              </span>
            </div>
          </div>

          {/* Padding Input Controls */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <label className="mb-1 block text-gray-600">Top</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.paddingTop)}
                onChange={handleSpacingChange('padding-top')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Right</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.paddingRight)}
                onChange={handleSpacingChange('padding-right')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Bottom</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.paddingBottom)}
                onChange={handleSpacingChange('padding-bottom')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-gray-600">Left</label>
              <input
                type="number"
                min="0"
                max="200"
                value={parsePixelValue(currentValues.paddingLeft)}
                onChange={handleSpacingChange('padding-left')}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
