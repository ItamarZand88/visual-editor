# Visual Editor Plugin

The Visual Editor plugin allows Stagewise users to edit UI elements directly in the browser. When the plugin icon is clicked a sidebar opens and an overlay enables element selection, providing a Figma‑like editing experience.

## Loading the Plugin

Add `VisualEditorPlugin` to the `plugins` array passed to `StagewiseToolbar`:

```tsx
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import { VisualEditorPlugin } from '@stagewise-plugins/visual-editor';

const toolbarConfig = {
  plugins: [VisualEditorPlugin],
};
```

## How It Works

`VisualEditorPlugin` renders an `EnhancedSelectorCanvas` to capture hover and click events. Selected element data is displayed in a `VisualEditorSidebar`. These components come from `@stagewise/toolbar`.

The sidebar displays basic information about the chosen element and exposes hooks for applying style changes. Future versions will send those changes to the VS Code extension via the SRPC contract methods `getElementSourceInfo`, `updateElementStyles` and `validateStyleChanges`.

## Requirements

- The toolbar must be initialized on the page.
- The `@stagewise/toolbar` package provides DOM‑context components used by the plugin.
- SRPC connectivity is required for style synchronization with the editor backend.
