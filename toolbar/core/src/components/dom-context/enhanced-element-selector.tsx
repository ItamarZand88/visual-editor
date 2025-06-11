// Enhanced element selector that supports both prompting mode and visual editing mode
// with additional features for visual editing like style indicators and metadata extraction

import { getElementAtPoint } from '@/utils';
import { useCallback, useRef, useEffect } from 'preact/hooks';
import type { MouseEventHandler } from 'preact/compat';
import { usePlugins } from '@/hooks/use-plugins';

export type ElementSelectorMode = 'prompting' | 'visual-editing';

export interface ElementMetadata {
  tagName: string;
  id?: string;
  className?: string;
  computedStyles: CSSStyleDeclaration;
  // Framework-specific metadata will be added by plugins
  frameworkInfo?: {
    framework: 'react' | 'vue' | 'angular' | 'unknown';
    componentName?: string;
    componentHierarchy?: Array<{
      name: string;
      type: 'regular' | 'rsc';
    }>;
  };
  // Visual editing specific metadata
  visualEditingInfo?: {
    cssSelector: string;
    editableStyles: string[];
    hasInlineStyles: boolean;
    appliedClasses: string[];
  };
}

export interface EnhancedElementSelectorProps {
  mode: ElementSelectorMode;
  onElementHovered: (element: HTMLElement, metadata?: ElementMetadata) => void;
  onElementUnhovered: () => void;
  onElementSelected: (element: HTMLElement, metadata?: ElementMetadata) => void;
  ignoreList: HTMLElement[];
  // Visual editing specific props
  showStyleIndicators?: boolean;
  highlightEditableElements?: boolean;
}

export function EnhancedElementSelector(props: EnhancedElementSelectorProps) {
  const lastHoveredElement = useRef<HTMLElement | null>(null);
  const { plugins } = usePlugins();

  // Generate CSS selector for an element
  const generateCSSSelector = useCallback((element: HTMLElement): string => {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // ID is unique
      }

      if (current.className) {
        const classes = Array.from(current.classList)
          .filter((cls) => cls.trim() && !cls.startsWith('visual-editor-'))
          .sort()
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName,
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current as Element) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ') || 'body';
  }, []);

  // Extract element metadata
  const extractMetadata = useCallback(
    (element: HTMLElement): ElementMetadata => {
      const computedStyles = window.getComputedStyle(element);

      // Base metadata
      const metadata: ElementMetadata = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || undefined,
        className: element.className || undefined,
        computedStyles,
      };

      // Visual editing specific metadata
      if (props.mode === 'visual-editing') {
        const editableStyleProperties = [
          'color',
          'background-color',
          'font-size',
          'font-weight',
          'font-family',
          'margin',
          'padding',
          'border',
          'border-radius',
          'width',
          'height',
          'display',
          'position',
          'top',
          'left',
          'right',
          'bottom',
          'box-shadow',
          'opacity',
          'transform',
          'text-align',
          'line-height',
        ];

        metadata.visualEditingInfo = {
          cssSelector: generateCSSSelector(element),
          editableStyles: editableStyleProperties.filter((prop) => {
            const value = computedStyles.getPropertyValue(prop);
            return value && value !== 'initial' && value !== 'inherit';
          }),
          hasInlineStyles: !!element.style.cssText,
          appliedClasses: Array.from(element.classList),
        };
      }

      // Get framework-specific metadata from plugins
      const reactPlugin = plugins.find((p) => p.pluginName === 'react');
      if (reactPlugin?.onContextElementHover) {
        const reactContext = reactPlugin.onContextElementHover(element);
        if (reactContext.annotation) {
          metadata.frameworkInfo = {
            framework: 'react',
            componentName: reactContext.annotation,
            // Additional React-specific data could be extracted here
          };
        }
      }

      // Check for Vue.js
      if ((element as any).__vue__) {
        metadata.frameworkInfo = {
          framework: 'vue',
          componentName:
            (element as any).__vue__?.$options?.name || 'VueComponent',
        };
      }

      // Check for Angular
      if ((element as any).ng) {
        metadata.frameworkInfo = {
          framework: 'angular',
          componentName: 'AngularComponent', // More sophisticated detection could be added
        };
      }

      return metadata;
    },
    [plugins, props.mode, generateCSSSelector],
  );

  // Enhanced highlighting for visual editing mode
  const addVisualEditingHighlight = useCallback(
    (element: HTMLElement) => {
      // Remove existing highlights
      document
        .querySelectorAll('.visual-editor-hover-highlight')
        .forEach((el) => {
          el.classList.remove('visual-editor-hover-highlight');
        });

      // Add highlight class
      element.classList.add('visual-editor-hover-highlight');

      // Add style indicators if enabled
      if (props.showStyleIndicators) {
        const computedStyles = window.getComputedStyle(element);
        const hasCustomStyles =
          element.style.cssText ||
          computedStyles.color !== 'rgb(0, 0, 0)' ||
          computedStyles.backgroundColor !== 'rgba(0, 0, 0, 0)';

        if (hasCustomStyles) {
          element.classList.add('visual-editor-has-styles');
        }
      }
    },
    [props.showStyleIndicators],
  );

  const removeVisualEditingHighlight = useCallback(() => {
    document
      .querySelectorAll(
        '.visual-editor-hover-highlight, .visual-editor-has-styles',
      )
      .forEach((el) => {
        el.classList.remove(
          'visual-editor-hover-highlight',
          'visual-editor-has-styles',
        );
      });
  }, []);

  // Handle mouse move with mode-specific behavior
  const handleMouseMove = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.companion')) return;

      const refElement = getElementAtPoint(event.clientX, event.clientY);
      if (props.ignoreList.includes(refElement)) return;

      if (lastHoveredElement.current !== refElement) {
        lastHoveredElement.current = refElement;

        // Mode-specific highlighting
        if (props.mode === 'visual-editing') {
          addVisualEditingHighlight(refElement);
        }

        // Extract and pass metadata
        const metadata = extractMetadata(refElement);
        props.onElementHovered(refElement, metadata);
      }
    },
    [props, addVisualEditingHighlight, extractMetadata],
  );

  const handleMouseLeave = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(() => {
    lastHoveredElement.current = null;

    if (props.mode === 'visual-editing') {
      removeVisualEditingHighlight();
    }

    props.onElementUnhovered();
  }, [props, removeVisualEditingHighlight]);

  const handleMouseClick = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(() => {
    if (!lastHoveredElement.current) return;
    if (props.ignoreList.includes(lastHoveredElement.current)) return;

    const metadata = extractMetadata(lastHoveredElement.current);
    props.onElementSelected(lastHoveredElement.current, metadata);
  }, [props, extractMetadata]);

  // Add visual editing styles when component mounts
  useEffect(() => {
    if (props.mode === 'visual-editing') {
      addVisualEditingStyles();
    }

    return () => {
      removeVisualEditingStyles();
    };
  }, [props.mode]);

  return (
    <div
      className={`pointer-events-auto fixed inset-0 h-screen w-screen ${
        props.mode === 'visual-editing' ? 'cursor-crosshair' : 'cursor-copy'
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseClick}
      role="button"
      tabIndex={0}
    />
  );
}

// Utility functions for visual editing styles
function addVisualEditingStyles() {
  if (document.getElementById('enhanced-visual-editor-styles')) return;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'enhanced-visual-editor-styles';
  styleSheet.textContent = `
    .visual-editor-hover-highlight {
      outline: 2px solid #007acc !important;
      outline-offset: 2px !important;
      position: relative !important;
    }
    
    .visual-editor-hover-highlight::before {
      content: "";
      position: absolute !important;
      top: -2px !important;
      left: -2px !important;
      right: -2px !important;
      bottom: -2px !important;
      background: rgba(0, 122, 204, 0.1) !important;
      pointer-events: none !important;
      z-index: 9998 !important;
    }
    
    .visual-editor-has-styles {
      box-shadow: inset 0 0 0 1px rgba(255, 193, 7, 0.6) !important;
    }
    
    .visual-editor-selected {
      outline: 3px solid #ff6b35 !important;
      outline-offset: 2px !important;
      position: relative !important;
    }
    
    .visual-editor-selected::before {
      content: "";
      position: absolute !important;
      top: -3px !important;
      left: -3px !important;
      right: -3px !important;
      bottom: -3px !important;
      background: rgba(255, 107, 53, 0.15) !important;
      pointer-events: none !important;
      z-index: 9999 !important;
    }
  `;

  document.head.appendChild(styleSheet);
}

function removeVisualEditingStyles() {
  const styleSheet = document.getElementById('enhanced-visual-editor-styles');
  if (styleSheet) {
    styleSheet.remove();
  }

  // Clean up any lingering classes
  document
    .querySelectorAll(
      '.visual-editor-hover-highlight, .visual-editor-has-styles, .visual-editor-selected',
    )
    .forEach((el) => {
      el.classList.remove(
        'visual-editor-hover-highlight',
        'visual-editor-has-styles',
        'visual-editor-selected',
      );
    });
}
