import { useCallback, useMemo, useState } from 'preact/hooks';
import {
  EnhancedElementSelector,
  type ElementMetadata,
  type ElementSelectorMode,
} from './enhanced-element-selector';
import { VisualEditingProposal } from './visual-editing-proposal';
import { ContextItemProposal } from './item-proposal';
import { ContextItem } from './item';
import { useChatState } from '@/hooks/use-chat-state';

interface EnhancedSelectorCanvasProps {
  mode: ElementSelectorMode;
  onElementSelected?: (
    element: HTMLElement,
    metadata?: ElementMetadata,
  ) => void;
  showStyleIndicators?: boolean;
}

export function EnhancedSelectorCanvas({
  mode,
  onElementSelected,
  showStyleIndicators = true,
}: EnhancedSelectorCanvasProps) {
  const {
    chats,
    currentChatId,
    addChatDomContext,
    isPromptCreationActive,
    promptState,
  } = useChatState();

  const currentChat = useMemo(
    () => chats.find((chat) => chat.id === currentChatId),
    [currentChatId, chats],
  );

  // For prompting mode, show only when prompt creation is active
  const shouldShowForPrompting =
    mode === 'prompting' && isPromptCreationActive && promptState !== 'loading';

  // For visual editing mode, always show when mode is visual-editing
  const shouldShow = mode === 'visual-editing' || shouldShowForPrompting;

  const contextElements = useMemo(() => {
    return currentChat?.domContextElements || [];
  }, [currentChat]);

  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(
    null,
  );
  const [hoveredMetadata, setHoveredMetadata] =
    useState<ElementMetadata | null>(null);

  const handleElementHovered = useCallback(
    (element: HTMLElement, metadata?: ElementMetadata) => {
      setHoveredElement(element);
      setHoveredMetadata(metadata || null);
    },
    [],
  );

  const handleElementUnhovered = useCallback(() => {
    setHoveredElement(null);
    setHoveredMetadata(null);
  }, []);

  const handleElementSelected = useCallback(
    (element: HTMLElement, metadata?: ElementMetadata) => {
      if (mode === 'prompting') {
        // Standard prompting mode behavior
        addChatDomContext(currentChatId, element);
      } else if (mode === 'visual-editing') {
        // Visual editing mode behavior
        if (onElementSelected) {
          onElementSelected(element, metadata);
        }
      }
    },
    [mode, addChatDomContext, currentChatId, onElementSelected],
  );

  if (!shouldShow) return null;

  return (
    <>
      {/* Show appropriate proposal based on mode */}
      {hoveredElement && mode === 'prompting' && (
        <ContextItemProposal refElement={hoveredElement} />
      )}

      {hoveredElement && mode === 'visual-editing' && hoveredMetadata && (
        <VisualEditingProposal
          refElement={hoveredElement}
          metadata={hoveredMetadata}
        />
      )}

      {/* Enhanced element selector */}
      <EnhancedElementSelector
        mode={mode}
        ignoreList={contextElements.map((el) => el.element)}
        onElementHovered={handleElementHovered}
        onElementSelected={handleElementSelected}
        onElementUnhovered={handleElementUnhovered}
        showStyleIndicators={showStyleIndicators}
      />

      {/* Show existing context items only in prompting mode */}
      {mode === 'prompting' &&
        contextElements.map((el) => (
          <ContextItem
            key={`context-item-${el.element.tagName}-${el.element.id || 'no-id'}`}
            refElement={el.element}
            pluginContext={el.pluginContext}
          />
        ))}
    </>
  );
}

// Hook for using enhanced selector in visual editing context
export function useVisualEditingSelector() {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null,
  );
  const [selectedMetadata, setSelectedMetadata] =
    useState<ElementMetadata | null>(null);

  const handleElementSelected = useCallback(
    (element: HTMLElement, metadata?: ElementMetadata) => {
      setSelectedElement(element);
      setSelectedMetadata(metadata || null);

      // Mark element as selected visually
      document.querySelectorAll('.visual-editor-selected').forEach((el) => {
        el.classList.remove('visual-editor-selected');
      });
      element.classList.add('visual-editor-selected');
    },
    [],
  );

  const clearSelection = useCallback(() => {
    if (selectedElement) {
      selectedElement.classList.remove('visual-editor-selected');
    }
    setSelectedElement(null);
    setSelectedMetadata(null);
  }, [selectedElement]);

  return {
    selectedElement,
    selectedMetadata,
    handleElementSelected,
    clearSelection,
  };
}
