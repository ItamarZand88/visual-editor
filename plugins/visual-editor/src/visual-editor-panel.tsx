import { Panel, Button } from '@stagewise/toolbar/plugin-ui';
import type { VisualEditorState } from './types';

interface VisualEditorPanelProps {
  state: VisualEditorState;
  onClose: () => void;
  onStateUpdate: (updates: Partial<VisualEditorState>) => void;
}

export function VisualEditorPanel({
  state,
  onClose,
  onStateUpdate,
}: VisualEditorPanelProps) {
  // Add element selector overlay when visual editor is active
  const renderElementSelector = () => {
    if (!state.isActive) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto',
          cursor: 'crosshair',
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't select elements inside the panel or toolbar
          if (
            target.closest('.companion') ||
            target.closest('[data-visual-editor]')
          ) {
            return;
          }

          // Create element data from the clicked element
          const elementData = {
            id: `${target.tagName.toLowerCase()}-${Date.now()}`,
            element: target,
            selector: generateCSSSelector(target),
            styles: window.getComputedStyle(target),
            sourceInfo: undefined,
          };

          // Update state with selected element
          onStateUpdate({ selectedElement: elementData });

          // Add visual selection
          document.querySelectorAll('.visual-editor-selected').forEach((el) => {
            el.classList.remove('visual-editor-selected');
          });
          target.classList.add('visual-editor-selected');

          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseMove={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest('.companion') ||
            target.closest('[data-visual-editor]')
          ) {
            return;
          }

          // Remove previous hover highlights
          document.querySelectorAll('.visual-editor-hover').forEach((el) => {
            el.classList.remove('visual-editor-hover');
          });

          // Add hover highlight
          target.classList.add('visual-editor-hover');
        }}
      />
    );
  };

  const generateCSSSelector = (element: HTMLElement): string => {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = Array.from(current.classList)
          .filter((cls) => cls.trim())
          .filter((cls) => !cls.startsWith('visual-editor-'))
          .sort()
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  };

  return (
    <>
      {/* Element selector overlay */}
      {renderElementSelector()}

      {/* Panel UI */}
      <Panel>
        <div data-visual-editor="panel">
          <Panel.Header
            title="Visual Editor"
            description="Click on elements to select and edit their styles"
          />

          {state.selectedElement ? (
            <>
              <Panel.Content>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Selected Element:</strong>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '4px',
                      padding: '8px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    &lt;{state.selectedElement.element.tagName.toLowerCase()}
                    {state.selectedElement.element.id &&
                      ` id="${state.selectedElement.element.id}"`}
                    {state.selectedElement.element.className &&
                      ` class="${state.selectedElement.element.className}"`}
                    &gt;
                  </div>
                </div>
              </Panel.Content>

              <Panel.Content>
                <div style={{ marginBottom: '16px' }}>
                  <strong>CSS Selector:</strong>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '4px',
                      padding: '6px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {state.selectedElement.selector}
                  </div>
                </div>
              </Panel.Content>

              <Panel.Content>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Style Properties:</strong>
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      Style editing panel coming soon...
                      <br />
                      <small>
                        Element:{' '}
                        {state.selectedElement.element.tagName.toLowerCase()}
                      </small>
                    </div>
                  </div>
                </div>
              </Panel.Content>

              <Panel.Content>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <Button disabled onClick={() => {}}>
                      Apply Changes
                    </Button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Button disabled onClick={() => {}}>
                      Reset
                    </Button>
                  </div>
                </div>
              </Panel.Content>

              <Panel.Content>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={() => {
                      // Clear selection
                      document
                        .querySelectorAll('.visual-editor-selected')
                        .forEach((el) => {
                          el.classList.remove('visual-editor-selected');
                        });
                      onStateUpdate({ selectedElement: null });
                    }}
                    style="secondary"
                  >
                    Clear Selection
                  </Button>
                </div>
              </Panel.Content>
            </>
          ) : (
            <Panel.Content>
              <div
                style={{
                  textAlign: 'center',
                  color: '#666',
                  padding: '32px 16px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>No element selected</div>
                <div style={{ fontSize: '12px' }}>
                  Click on any element on the page to select it for editing
                </div>
              </div>
            </Panel.Content>
          )}

          <Panel.Content>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#e8f4fd',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#0366d6',
              }}
            >
              <strong>Visual Editor Active</strong>
              <div style={{ marginTop: '4px' }}>
                Move your mouse over elements to see them highlighted, then
                click to select.
              </div>
            </div>
          </Panel.Content>

          <Panel.Footer>
            <Button onClick={onClose}>Close Visual Editor</Button>
          </Panel.Footer>
        </div>
      </Panel>
    </>
  );
}
