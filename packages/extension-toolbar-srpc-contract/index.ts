export { getExtensionBridge } from './src/extension-bridge';
export { getToolbarBridge } from './src/toolbar-bridge';
export { contract } from './src/contract';
export { DEFAULT_PORT, PING_ENDPOINT, PING_RESPONSE } from './src/contract';
export type { 
  PromptRequest, 
  VSCodeContext,
  ElementSourceInfoRequest,
  ElementSourceInfoResponse,
  UpdateElementStylesRequest,
  UpdateElementStylesResponse,
  ValidateStyleChangesRequest,
  ValidateStyleChangesResponse
} from './src/contract';
