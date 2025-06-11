// Export existing components
export { ElementSelector } from './element-selector';
export { SelectorCanvas } from './selector-canvas';
export { ContextItemProposal } from './item-proposal';
export { ContextItem } from './item';

// Export enhanced visual editing components
export { EnhancedElementSelector } from './enhanced-element-selector';
export {
  EnhancedSelectorCanvas,
  useVisualEditingSelector,
} from './enhanced-selector-canvas';
export { VisualEditingProposal } from './visual-editing-proposal';

// Export types
export type { ElementSelectorProps } from './element-selector';
export type {
  ElementMetadata,
  ElementSelectorMode,
  EnhancedElementSelectorProps,
} from './enhanced-element-selector';
export type { VisualEditingProposalProps } from './visual-editing-proposal';

// Re-export visual editor components
export { VisualEditorSidebar } from '../visual-editor';
export type { VisualEditorSidebarProps, StyleChange } from '../visual-editor';
