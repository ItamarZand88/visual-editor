'use client';
import type { ToolbarPlugin, ContextElementContext } from '@stagewise/toolbar';
import type { VisualEditorState, VisualElementData } from './types';
import { VisualEditorIcon } from './visual-editor-icon';
import { VisualEditorPanel } from './visual-editor-panel';

// Plugin state - using a more minimal approach
let visualEditorState: VisualEditorState = {
  selectedElement: null,
  isActive: false,
  isEditing: false,
  pendingChanges: [],
  panelOpen: false,
};

// State management functions
function updateState(updates: Partial<VisualEditorState>) {
  visualEditorState = { ...visualEditorState, ...updates };
  console.log('Visual Editor State Updated:', visualEditorState);
}

function setSelectedElement(element: HTMLElement | null): void {
  if (!element) {
    updateState({ selectedElement: null });
    removeSelectedHighlight();
    return;
  }

  // Generate unique ID for the element
  const elementId = generateElementId(element);

  // Get CSS selector for the element
  const selector = generateCSSSelector(element);

  // Get computed styles
  const styles = window.getComputedStyle(element);

  const elementData: VisualElementData = {
    id: elementId,
    element,
    selector,
    styles,
    sourceInfo: undefined, // Will be populated later via SRPC
  };

  updateState({ selectedElement: elementData });
  highlightSelectedElement(element);
}

function generateElementId(element: HTMLElement): string {
  // Create a stable ID based on element properties
  const tagName = element.tagName.toLowerCase();
  const id = element.id;
  const classes = Array.from(element.classList)
    .filter((cls) => !cls.startsWith('visual-editor-'))
    .sort()
    .join('.');
  const position = Array.from(element.parentElement?.children || []).indexOf(
    element,
  );

  return `${tagName}${id ? `#${id}` : ''}${classes ? `.${classes}` : ''}-${position}`;
}

function generateCSSSelector(element: HTMLElement): string {
  // Generate a unique CSS selector for the element
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, so we can stop here
    }

    if (current.className) {
      const classes = Array.from(current.classList)
        .filter((cls) => cls.trim())
        .filter((cls) => !cls.startsWith('visual-editor-')) // Exclude our own classes
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

  return path.join(' > ');
}

function highlightHoverElement(element: HTMLElement): void {
  // Remove existing hover highlights
  document.querySelectorAll('.visual-editor-hover').forEach((el) => {
    el.classList.remove('visual-editor-hover');
  });

  // Add hover highlight to current element
  element.classList.add('visual-editor-hover');
}

function highlightSelectedElement(element: HTMLElement): void {
  // Remove existing selected highlights
  document.querySelectorAll('.visual-editor-selected').forEach((el) => {
    el.classList.remove('visual-editor-selected');
  });

  // Add selected highlight to current element
  element.classList.add('visual-editor-selected');
}

function removeSelectedHighlight(): void {
  // Remove all highlights
  document
    .querySelectorAll('.visual-editor-selected, .visual-editor-hover')
    .forEach((el) => {
      el.classList.remove('visual-editor-selected', 'visual-editor-hover');
    });
}

function addVisualEditorStyles(): void {
  if (document.getElementById('visual-editor-styles')) return;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'visual-editor-styles';
  styleSheet.textContent = `
    .visual-editor-hover {
      outline: 2px dashed #007acc !important;
      outline-offset: 2px !important;
      background: rgba(0, 122, 204, 0.1) !important;
      cursor: crosshair !important;
    }
    
    .visual-editor-selected {
      outline: 3px solid #ff6b35 !important;
      outline-offset: 2px !important;
      position: relative !important;
      background: rgba(255, 107, 53, 0.15) !important;
    }
    
    .visual-editor-selected::before {
      content: "";
      position: absolute !important;
      top: -3px !important;
      left: -3px !important;
      right: -3px !important;
      bottom: -3px !important;
      background: rgba(255, 107, 53, 0.1) !important;
      pointer-events: none !important;
      z-index: 9998 !important;
    }
  `;

  document.head.appendChild(styleSheet);
}

function removeVisualEditorStyles(): void {
  const styleSheet = document.getElementById('visual-editor-styles');
  if (styleSheet) {
    styleSheet.remove();
  }

  removeSelectedHighlight();
}

export const VisualEditorPlugin: ToolbarPlugin = {
  displayName: 'Visual Editor',
  description:
    'Edit UI elements visually with real-time preview and automatic code synchronization',
  iconSvg: <VisualEditorIcon />,
  pluginName: 'visual-editor',

  onActionClick: () => {
    console.log('Visual Editor button clicked!');
    
    // Toggle active state
    const newActiveState = !visualEditorState.isActive;
    updateState({ 
      isActive: newActiveState,
      panelOpen: true 
    });
    
    if (newActiveState) {
      addVisualEditorStyles();
    } else {
      removeVisualEditorStyles();
    }

    // Return the panel component - it will manage its own state
    return (
      <VisualEditorPanel
        state={visualEditorState}
        onClose={() => {
          updateState({ 
            isActive: false, 
            selectedElement: null,
            panelOpen: false 
          });
          removeVisualEditorStyles();
        }}
        onStateUpdate={updateState}
      />
    );
  },

  onLoad: (toolbar) => {
    console.log('Visual Editor Plugin loaded successfully!');
    // Initialize styles on load
    addVisualEditorStyles();
  },

  // Always respond to hover events to provide visual feedback
  onContextElementHover: (element: HTMLElement) => {
    // If visual editor is active, show our hover styles
    if (visualEditorState.isActive) {
      highlightHoverElement(element);
      return {
        annotation: 'Visual Editor: Click to select for editing',
      };
    }
    
    return { annotation: null };
  },

  // Always respond to select events
  onContextElementSelect: (element: HTMLElement) => {
    // If visual editor is active, handle selection
    if (visualEditorState.isActive) {
      setSelectedElement(element);
      console.log('Visual Editor: Element selected', element);
      return {
        annotation: 'Visual Editor: Element selected for editing',
      };
    }
    
    return { annotation: null };
  },
};
