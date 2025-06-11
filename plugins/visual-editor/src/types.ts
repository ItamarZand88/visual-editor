export interface VisualElementData {
  /** Unique identifier for the element */
  id: string;
  /** The HTML element */
  element: HTMLElement;
  /** CSS selector for the element */
  selector: string;
  /** Current computed styles */
  styles: CSSStyleDeclaration;
  /** Source file information if available */
  sourceInfo?: ElementSourceInfo;
}

export interface ElementSourceInfo {
  /** File path where the element is defined */
  filePath: string;
  /** Line number in the file */
  lineNumber?: number;
  /** Column number in the file */
  columnNumber?: number;
  /** Component name if applicable */
  componentName?: string;
  /** Framework type */
  framework: 'react' | 'vue' | 'angular' | 'html';
}

export interface StyleProperty {
  /** CSS property name */
  property: string;
  /** CSS property value */
  value: string;
  /** Whether this is a computed style or inline style */
  type: 'computed' | 'inline' | 'class';
  /** CSS class name if applicable */
  className?: string;
}

export interface EditableStyle extends StyleProperty {
  /** Whether this style can be edited */
  editable: boolean;
  /** Original value before editing */
  originalValue?: string;
  /** Whether this style has been modified */
  modified: boolean;
}

export interface VisualEditorState {
  /** Currently selected element */
  selectedElement: VisualElementData | null;
  /** Whether the visual editor is active */
  isActive: boolean;
  /** Whether we're in editing mode */
  isEditing: boolean;
  /** List of modified styles pending save */
  pendingChanges: EditableStyle[];
  /** UI panel state */
  panelOpen: boolean;
}

export interface StyleCategory {
  /** Category name */
  name: string;
  /** Display label */
  label: string;
  /** CSS properties in this category */
  properties: string[];
  /** Icon for the category */
  icon?: string;
}

// Style categories for the UI
export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    name: 'typography',
    label: 'Typography',
    properties: [
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'text-align',
      'text-decoration',
      'color',
    ],
  },
  {
    name: 'layout',
    label: 'Layout',
    properties: [
      'display',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
    ],
  },
  {
    name: 'spacing',
    label: 'Spacing',
    properties: [
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
    ],
  },
  {
    name: 'background',
    label: 'Background',
    properties: [
      'background-color',
      'background-image',
      'background-size',
      'background-position',
      'background-repeat',
    ],
  },
  {
    name: 'border',
    label: 'Border',
    properties: [
      'border',
      'border-width',
      'border-style',
      'border-color',
      'border-radius',
      'border-top',
      'border-right',
      'border-bottom',
      'border-left',
    ],
  },
  {
    name: 'effects',
    label: 'Effects',
    properties: [
      'box-shadow',
      'opacity',
      'transform',
      'transition',
      'filter',
      'backdrop-filter',
    ],
  },
];
