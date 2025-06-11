'use client';
import type { ToolbarPlugin } from '@stagewise/toolbar';
import {
  EnhancedSelectorCanvas,
  VisualEditorSidebar,
  useVisualEditingSelector,
} from '@stagewise/toolbar';
import {
  Fragment,
  useEffect,
  useState,
  useCallback,
} from '@stagewise/toolbar/plugin-ui';
import { useSRPCBridge, useVSCode } from '@stagewise/toolbar';
import type { StyleChange } from '@stagewise/toolbar';
import { VisualEditorIcon } from './visual-editor-icon';

function VisualEditorRoot() {
  const {
    selectedElement,
    selectedMetadata,
    handleElementSelected,
    clearSelection,
  } = useVisualEditingSelector();
  const { bridge } = useSRPCBridge();
  const { selectedSession } = useVSCode();
  const [sourceInfo, setSourceInfo] = useState<
    | import('@stagewise/extension-toolbar-srpc-contract').ElementSourceInfoResponse['result']
    | null
  >(null);

  useEffect(() => clearSelection, [clearSelection]);

  useEffect(() => {
    if (!bridge || !selectedMetadata) return;
    const selector = selectedMetadata.visualEditingInfo?.cssSelector;
    if (!selector) return;

    bridge.call
      .getElementSourceInfo(
        {
          elementSelector: selector,
          componentName: selectedMetadata.frameworkInfo?.componentName,
          frameworkType:
            selectedMetadata.frameworkInfo?.framework || 'unknown',
          ...(selectedSession && { sessionId: selectedSession.sessionId }),
        },
        { onUpdate: () => {} },
      )
      .then((res) => {
        setSourceInfo(res.result);
      })
      .catch(() => setSourceInfo(null));
  }, [bridge, selectedMetadata, selectedSession]);

  const handleApplyChanges = useCallback(
    async (changes: StyleChange[]) => {
      if (!bridge || !selectedMetadata) return;
      const selector = selectedMetadata.visualEditingInfo?.cssSelector;
      if (!selector) return;
      const styles: Record<string, string> = {};
      changes.forEach((c) => {
        styles[c.property] = c.value;
      });

      try {
        await bridge.call.updateElementStyles(
          {
            elementSelector: selector,
            styles,
            sourceFile: sourceInfo?.sourceFile,
            componentName: sourceInfo?.componentInfo?.name,
            updateType: sourceInfo?.styleType,
            ...(selectedSession && { sessionId: selectedSession.sessionId }),
          },
          { onUpdate: () => {} },
        );
      } catch (err) {
        console.error('Failed to update element styles', err);
      }
    },
    [bridge, selectedMetadata, selectedSession, sourceInfo],
  );

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
        onApplyChanges={handleApplyChanges}
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
