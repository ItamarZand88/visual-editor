import { useCallback, useMemo } from 'preact/hooks';
import type { ElementMetadata } from '../../dom-context/enhanced-element-selector';

interface ColorsPanelProps {
  element: HTMLElement;
  metadata: ElementMetadata;
  onStyleChange: (property: string, value: string) => void;
  previewMode: boolean;
}

const PRESET_COLORS = [
  '#000000',
  '#404040',
  '#808080',
  '#C0C0C0',
  '#FFFFFF',
  '#FF0000',
  '#FF8000',
  '#FFFF00',
  '#80FF00',
  '#00FF00',
  '#00FF80',
  '#00FFFF',
  '#0080FF',
  '#0000FF',
  '#8000FF',
  '#FF00FF',
  '#FF0080',
  '#800000',
  '#804000',
  '#808000',
];

export function ColorsPanel({
  element,
  metadata,
  onStyleChange,
  previewMode,
}: ColorsPanelProps) {
  const computedStyles = useMemo(
    () => window.getComputedStyle(element),
    [element],
  );

  const currentValues = useMemo(
    () => ({
      color: element.style.color || computedStyles.color,
      backgroundColor:
        element.style.backgroundColor || computedStyles.backgroundColor,
      borderColor: element.style.borderColor || computedStyles.borderColor,
      opacity: element.style.opacity || computedStyles.opacity,
    }),
    [element, computedStyles],
  );

  const rgbToHex = useCallback((rgb: string): string => {
    if (rgb.startsWith('#')) return rgb;
    if (rgb === 'transparent' || rgb === '') return '#ffffff';

    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = Number.parseInt(match[1]);
      const g = Number.parseInt(match[2]);
      const b = Number.parseInt(match[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return '#ffffff';
  }, []);

  const handleColorChange = useCallback(
    (property: string) => (e: Event) => {
      const target = e.target as HTMLInputElement;
      onStyleChange(property, target.value);
    },
    [onStyleChange],
  );

  const handlePresetColorClick = useCallback(
    (property: string, color: string) => () => {
      onStyleChange(property, color);
    },
    [onStyleChange],
  );

  const handleOpacityChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = Number.parseFloat(target.value) / 100;
      onStyleChange('opacity', value.toString());
    },
    [onStyleChange],
  );

  const renderColorSection = (
    title: string,
    property: string,
    currentValue: string,
    description: string,
  ) => (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-gray-700 text-sm">{title}</h4>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={rgbToHex(currentValue)}
            onChange={handleColorChange(property)}
            className="h-8 w-12 cursor-pointer rounded border border-gray-300"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={currentValue}
            onChange={handleColorChange(property)}
            placeholder="#000000 or rgb(0,0,0)"
            className="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Preset Colors */}
      <div>
        <div className="mb-2 font-medium text-gray-600 text-xs">
          Preset Colors
        </div>
        <div className="grid grid-cols-10 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={handlePresetColorClick(property, color)}
              className="h-6 w-6 rounded border border-gray-300 transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`Set ${title.toLowerCase()} to ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-4">
      {/* Text Color */}
      {renderColorSection(
        'Text Color',
        'color',
        currentValues.color,
        'Controls the color of text content',
      )}

      {/* Background Color */}
      {renderColorSection(
        'Background Color',
        'background-color',
        currentValues.backgroundColor,
        'Controls the background color of the element',
      )}

      {/* Border Color */}
      {renderColorSection(
        'Border Color',
        'border-color',
        currentValues.borderColor,
        'Controls the color of element borders',
      )}

      {/* Opacity */}
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-700 text-sm">Opacity</h4>
          <p className="text-gray-500 text-xs">Controls element transparency</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={(Number.parseFloat(currentValues.opacity) || 1) * 100}
              onChange={handleOpacityChange}
              className="flex-1"
            />
            <div className="w-12 text-right text-gray-600 text-sm">
              {Math.round(
                (Number.parseFloat(currentValues.opacity) || 1) * 100,
              )}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Color Utilities */}
      <div className="border-gray-200 border-t pt-4">
        <div className="mb-3 font-medium text-gray-700 text-sm">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePresetColorClick('background-color', 'transparent')}
            className="rounded border border-gray-300 px-3 py-2 text-xs transition-colors hover:bg-gray-50"
          >
            Clear Background
          </button>
          <button
            type="button"
            onClick={handlePresetColorClick('color', 'inherit')}
            className="rounded border border-gray-300 px-3 py-2 text-xs transition-colors hover:bg-gray-50"
          >
            Inherit Text Color
          </button>
        </div>
      </div>
    </div>
  );
}
