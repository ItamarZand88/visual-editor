'use client';
import type { ToolbarPlugin } from '@stagewise/toolbar';
import {
  EnhancedSelectorCanvas,
  VisualEditorSidebar,
  useVisualEditingSelector,
} from '@stagewise/toolbar';
import { Fragment, useEffect } from '@stagewise/toolbar/plugin-ui';
import { VisualEditorIcon } from './visual-editor-icon';

function VisualEditorRoot() {
  const {
    selectedElement,
    selectedMetadata,
    handleElementSelected,
    clearSelection,
  } = useVisualEditingSelector();

  useEffect(() => clearSelection, [clearSelection]);

  return (
    <Fragment>
      <EnhancedSelectorCanvas
        mode="visual-editing"
        onElementSelected={handleElementSelected}
      />
      <VisualEditorSidebar
        selectedElement={selectedElement}
        selectedMetadata={selectedMetadata}
        onClose={clearSelection}
      />
    </Fragment>
  );
}

export const VisualEditorPlugin: ToolbarPlugin = {
  displayName: 'Visual Editor',
  description:
    'Edit UI elements visually with real-time preview and automatic code synchronization',
  iconSvg: <VisualEditorIcon />,
  pluginName: 'visual-editor',
  onActionClick: () => <VisualEditorRoot />,
};
