export interface ComponentLibrary {
  name: ComponentLibraryName;
  version?: string;
  packageName: string;
  isDetected: boolean;
  confidence: number;
  metadata: ComponentLibraryMetadata;
  components: ComponentDefinition[];
  designSystem?: DesignSystemInfo;
  integration: LibraryIntegration;
}

export type ComponentLibraryName =
  | 'material-ui'
  | 'ant-design'
  | 'chakra-ui'
  | 'react-bootstrap'
  | 'semantic-ui'
  | 'mantine'
  | 'headless-ui'
  | 'shadcn-ui'
  | 'next-ui'
  | 'element-plus'
  | 'quasar'
  | 'vuetify'
  | 'bootstrap-vue'
  | 'custom';

export interface ComponentLibraryMetadata {
  displayName: string;
  description: string;
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'universal';
  category:
    | 'ui-library'
    | 'design-system'
    | 'component-collection'
    | 'utility-library';
  features: LibraryFeature[];
  documentation: {
    url: string;
    apiReference?: string;
    examples?: string;
  };
  repository?: {
    url: string;
    stars?: number;
    lastUpdate?: number;
  };
}

export interface LibraryFeature {
  name: string;
  type:
    | 'theming'
    | 'styling'
    | 'accessibility'
    | 'responsive'
    | 'animation'
    | 'icons'
    | 'layout';
  supported: boolean;
  configuration?: Record<string, any>;
}

export interface ComponentDefinition {
  name: string;
  displayName: string;
  category: ComponentCategory;
  variants: ComponentVariant[];
  props: ComponentProp[];
  styles: ComponentStyleDefinition;
  examples: ComponentExample[];
  dependencies: string[];
  accessibility: AccessibilityInfo;
  responsive: ResponsiveInfo;
}

export type ComponentCategory =
  | 'input'
  | 'display'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'data-display'
  | 'overlay'
  | 'typography'
  | 'media'
  | 'other';

export interface ComponentVariant {
  name: string;
  displayName: string;
  description?: string;
  props: Record<string, any>;
  previewCode: string;
  styleOverrides?: Record<string, string>;
  designTokens?: string[];
}

export interface ComponentProp {
  name: string;
  type: PropType;
  required: boolean;
  defaultValue?: any;
  description?: string;
  examples?: any[];
  validation?: PropValidation;
  styling?: PropStylingInfo;
}

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'function'
  | 'enum'
  | 'color'
  | 'size'
  | 'spacing'
  | 'responsive';

export interface PropValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: any[];
  custom?: (value: any) => boolean;
}

export interface PropStylingInfo {
  cssProperty?: string;
  designToken?: string;
  responsive?: boolean;
  variants?: Record<string, string>;
}

export interface ComponentStyleDefinition {
  baseStyles: Record<string, string>;
  variants: Record<string, Record<string, string>>;
  modifiers: Record<string, Record<string, string>>;
  responsive: Record<string, Record<string, string>>;
  designTokens: ComponentDesignTokens;
}

export interface ComponentDesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, string>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  animation: Record<string, string>;
}

export interface ComponentExample {
  name: string;
  description?: string;
  code: string;
  preview?: string;
  props: Record<string, any>;
  category?: string;
}

export interface AccessibilityInfo {
  ariaLabels: string[];
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  colorContrast: boolean;
  focusManagement: boolean;
  guidelines: string[];
}

export interface ResponsiveInfo {
  breakpoints: string[];
  responsiveProps: string[];
  mobileOptimized: boolean;
  touchSupport: boolean;
}

export interface LibraryIntegration {
  importStrategy: ImportStrategy;
  themeIntegration: ThemeIntegration;
  styleStrategy: StyleStrategy;
  customization: CustomizationOptions;
  compatibility: CompatibilityInfo;
}

export interface ImportStrategy {
  type: 'named' | 'default' | 'namespace' | 'dynamic';
  modulePath: string;
  submodules?: Record<string, string>;
  treeshaking: boolean;
  bundleSize?: {
    minified: number;
    gzipped: number;
  };
}

export interface ThemeIntegration {
  supported: boolean;
  themeProvider?: string;
  themeStructure?: Record<string, any>;
  customization: {
    colors: boolean;
    typography: boolean;
    spacing: boolean;
    components: boolean;
  };
  designTokens?: {
    format: 'css-variables' | 'js-object' | 'scss-variables' | 'less-variables';
    mapping: Record<string, string>;
  };
}

export interface StyleStrategy {
  approach:
    | 'css-in-js'
    | 'css-modules'
    | 'styled-components'
    | 'emotion'
    | 'sass'
    | 'css';
  runtime: boolean;
  ssr: boolean;
  optimization: {
    criticalCSS: boolean;
    purgeCSS: boolean;
    autoprefixer: boolean;
  };
}

export interface CustomizationOptions {
  themes: ThemeOption[];
  variants: VariantOption[];
  globalStyles: boolean;
  componentOverrides: boolean;
  cssVariables: boolean;
}

export interface ThemeOption {
  name: string;
  displayName: string;
  description?: string;
  preview?: string;
  configuration: Record<string, any>;
}

export interface VariantOption {
  component: string;
  variant: string;
  displayName: string;
  props: Record<string, any>;
  preview: string;
}

export interface CompatibilityInfo {
  react?: {
    minVersion: string;
    maxVersion?: string;
    hooks: boolean;
    concurrent: boolean;
  };
  vue?: {
    minVersion: string;
    maxVersion?: string;
    composition: boolean;
  };
  nextjs?: {
    supported: boolean;
    ssr: boolean;
    staticExport: boolean;
  };
  typescript: boolean;
  nodejs?: {
    minVersion: string;
  };
}

export interface DesignSystemInfo {
  name: string;
  version: string;
  tokens: DesignSystemToken[];
  themes: DesignSystemTheme[];
  components: DesignSystemComponent[];
  guidelines: DesignGuideline[];
}

export interface DesignSystemToken {
  name: string;
  category:
    | 'color'
    | 'spacing'
    | 'typography'
    | 'shadow'
    | 'border'
    | 'animation';
  value: string | number;
  description?: string;
  usage: string[];
  semantic?: boolean;
}

export interface DesignSystemTheme {
  name: string;
  displayName: string;
  tokens: Record<string, string>;
  isDark: boolean;
  preview?: string;
}

export interface DesignSystemComponent {
  name: string;
  tokens: string[];
  variants: string[];
  states: string[];
}

export interface DesignGuideline {
  category:
    | 'spacing'
    | 'typography'
    | 'color'
    | 'layout'
    | 'interaction'
    | 'accessibility';
  title: string;
  description: string;
  examples?: string[];
  rules?: string[];
}

export interface ComponentLibraryDetectionResult {
  libraries: ComponentLibrary[];
  primary?: ComponentLibrary;
  conflicts: LibraryConflict[];
  recommendations: LibraryRecommendation[];
  compatibility: CrossLibraryCompatibility;
}

export interface LibraryConflict {
  libraries: ComponentLibraryName[];
  type: 'version' | 'dependency' | 'styling' | 'theming';
  description: string;
  resolution: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LibraryRecommendation {
  type:
    | 'upgrade'
    | 'migration'
    | 'integration'
    | 'optimization'
    | 'alternative';
  library?: ComponentLibraryName;
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  implementation?: {
    steps: string[];
    codeChanges?: string[];
    configChanges?: string[];
  };
}

export interface CrossLibraryCompatibility {
  compatible: boolean;
  issues: CompatibilityIssue[];
  solutions: CompatibilitySolution[];
}

export interface CompatibilityIssue {
  type: 'styling' | 'theming' | 'imports' | 'naming' | 'version';
  description: string;
  affectedComponents: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface CompatibilitySolution {
  issue: string;
  solution: string;
  implementation: 'automatic' | 'manual' | 'configuration';
  effort: 'low' | 'medium' | 'high';
}

export interface ComponentMappingRule {
  sourceLibrary: ComponentLibraryName;
  targetLibrary: ComponentLibraryName;
  sourceComponent: string;
  targetComponent: string;
  propMapping: Record<string, string>;
  styleMapping: Record<string, string>;
  transformation?: ComponentTransformation;
}

export interface ComponentTransformation {
  type: 'direct' | 'wrapper' | 'composition' | 'custom';
  implementation: string;
  dependencies?: string[];
  notes?: string;
}

export interface LibraryIntegrationConfig {
  library: ComponentLibraryName;
  enabled: boolean;
  version?: string;
  theme?: string;
  customization: Record<string, any>;
  components: {
    enabled: string[];
    disabled: string[];
    customized: Record<string, any>;
  };
  optimization: {
    treeshaking: boolean;
    bundleSplitting: boolean;
    cssOptimization: boolean;
  };
}

export interface ComponentLibraryAnalysis {
  usage: ComponentUsageAnalysis;
  performance: LibraryPerformanceMetrics;
  maintenance: MaintenanceInfo;
  security: SecurityInfo;
}

export interface ComponentUsageAnalysis {
  totalComponents: number;
  usedComponents: string[];
  unusedComponents: string[];
  mostUsed: Array<{ component: string; count: number }>;
  customizations: Array<{ component: string; modifications: string[] }>;
}

export interface LibraryPerformanceMetrics {
  bundleSize: {
    total: number;
    used: number;
    unused: number;
  };
  loadTime: {
    initial: number;
    lazy: number;
  };
  runtime: {
    renderTime: number;
    memoryUsage: number;
  };
}

export interface MaintenanceInfo {
  lastUpdate: number;
  version: string;
  dependencies: {
    outdated: string[];
    vulnerable: string[];
    breaking: string[];
  };
  migration: {
    available: boolean;
    version?: string;
    effort: 'low' | 'medium' | 'high';
  };
}

export interface SecurityInfo {
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  score: number;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVersions: string;
  fixedIn?: string;
  cve?: string;
}

export interface SecurityRecommendation {
  type: 'update' | 'replace' | 'configure' | 'monitor';
  description: string;
  urgency: 'low' | 'medium' | 'high';
  implementation: string;
}
