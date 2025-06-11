import { useCallback, useMemo } from 'preact/hooks';
import type { ElementMetadata } from '../../dom-context/enhanced-element-selector';

interface TypographyPanelProps {
  element: HTMLElement;
  metadata: ElementMetadata;
  onStyleChange: (property: string, value: string) => void;
  previewMode: boolean;
}

const FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  {
    value: '-apple-system, BlinkMacSystemFont, sans-serif',
    label: 'System Default',
  },
];

const FONT_WEIGHTS = [
  { value: '', label: 'Default' },
  { value: '100', label: 'Thin' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '900', label: 'Black' },
];

const TEXT_ALIGNS = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

export function TypographyPanel({
  element,
  metadata,
  onStyleChange,
  previewMode,
}: TypographyPanelProps) {
  const computedStyles = useMemo(
    () => window.getComputedStyle(element),
    [element],
  );

  const currentValues = useMemo(
    () => ({
      fontFamily: element.style.fontFamily || computedStyles.fontFamily,
      fontSize: element.style.fontSize || computedStyles.fontSize,
      fontWeight: element.style.fontWeight || computedStyles.fontWeight,
      lineHeight: element.style.lineHeight || computedStyles.lineHeight,
      letterSpacing:
        element.style.letterSpacing || computedStyles.letterSpacing,
      textAlign: element.style.textAlign || computedStyles.textAlign,
      textDecoration:
        element.style.textDecoration || computedStyles.textDecoration,
      color: element.style.color || computedStyles.color,
    }),
    [element, computedStyles],
  );

  const handleFontSizeChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      if (value) {
        onStyleChange('font-size', value + 'px');
      }
    },
    [onStyleChange],
  );

  const handleLineHeightChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      if (value) {
        onStyleChange('line-height', value);
      }
    },
    [onStyleChange],
  );

  const handleLetterSpacingChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      onStyleChange('letter-spacing', value + 'px');
    },
    [onStyleChange],
  );

  const handleSelectChange = useCallback(
    (property: string) => (e: Event) => {
      const target = e.target as HTMLSelectElement;
      onStyleChange(property, target.value);
    },
    [onStyleChange],
  );

  const handleCheckboxChange = useCallback(
    (property: string, checkedValue: string, uncheckedValue = '') =>
      (e: Event) => {
        const target = e.target as HTMLInputElement;
        onStyleChange(property, target.checked ? checkedValue : uncheckedValue);
      },
    [onStyleChange],
  );

  return (
    <div className="space-y-6 p-4">
      {/* Font Family */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Font Family
        </label>
        <select
          value={currentValues.fontFamily}
          onChange={handleSelectChange('font-family')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Font Size
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="8"
            max="72"
            value={Number.parseInt(currentValues.fontSize) || 16}
            onChange={handleFontSizeChange}
            className="flex-1"
          />
          <div className="w-16 text-gray-600 text-sm">
            {Number.parseInt(currentValues.fontSize) || 16}px
          </div>
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Font Weight
        </label>
        <select
          value={currentValues.fontWeight}
          onChange={handleSelectChange('font-weight')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FONT_WEIGHTS.map((weight) => (
            <option key={weight.value} value={weight.value}>
              {weight.label}
            </option>
          ))}
        </select>
      </div>

      {/* Line Height */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Line Height
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.1"
            value={Number.parseFloat(currentValues.lineHeight) || 1.5}
            onChange={handleLineHeightChange}
            className="flex-1"
          />
          <div className="w-16 text-gray-600 text-sm">
            {Number.parseFloat(currentValues.lineHeight) || 1.5}
          </div>
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Letter Spacing
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="-2"
            max="10"
            step="0.1"
            value={Number.parseFloat(currentValues.letterSpacing) || 0}
            onChange={handleLetterSpacingChange}
            className="flex-1"
          />
          <div className="w-16 text-gray-600 text-sm">
            {Number.parseFloat(currentValues.letterSpacing) || 0}px
          </div>
        </div>
      </div>

      {/* Text Align */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Text Align
        </label>
        <select
          value={currentValues.textAlign}
          onChange={handleSelectChange('text-align')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TEXT_ALIGNS.map((align) => (
            <option key={align.value} value={align.value}>
              {align.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text Decoration */}
      <div>
        <label className="mb-2 block font-medium text-gray-700 text-sm">
          Text Decoration
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentValues.textDecoration.includes('underline')}
              onChange={handleCheckboxChange(
                'text-decoration',
                'underline',
                'none',
              )}
              className="rounded"
            />
            <span className="text-sm">Underline</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentValues.textDecoration.includes('line-through')}
              onChange={handleCheckboxChange(
                'text-decoration',
                'line-through',
                'none',
              )}
              className="rounded"
            />
            <span className="text-sm">Strike-through</span>
          </label>
        </div>
      </div>
    </div>
  );
}
