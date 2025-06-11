export interface StyleFramework {
  name:
    | 'vanilla-css'
    | 'scss'
    | 'less'
    | 'postcss'
    | 'styled-components'
    | 'emotion'
    | 'tailwind'
    | 'css-modules';
  version?: string;
  configFile?: string;
  isDetected: boolean;
  confidence: number;
  capabilities: StyleFrameworkCapabilities;
}

export interface StyleFrameworkCapabilities {
  variables: boolean;
  nesting: boolean;
  mixins: boolean;
  functions: boolean;
  imports: boolean;
  dynamicGeneration: boolean;
  themeSupport: boolean;
  conditionalStyles: boolean;
}

export interface CSSPreprocessorConfig {
  type: 'scss' | 'less' | 'postcss';
  configFile: string;
  includePaths: string[];
  variables: Record<string, string>;
  plugins: string[];
  customFunctions: Record<string, (...args: any[]) => any>;
}

export interface StyleGenerationStrategy {
  framework: StyleFramework['name'];
  approach:
    | 'inline'
    | 'class-based'
    | 'css-in-js'
    | 'utility-first'
    | 'component-scoped';
  outputFormat: 'css' | 'scss' | 'less' | 'js' | 'ts';
  classNaming: ClassNamingStrategy;
  optimization: StyleOptimization;
}

export interface ClassNamingStrategy {
  convention: 'bem' | 'atomic' | 'semantic' | 'component-based' | 'utility';
  prefix: string;
  suffix: string;
  separator: string;
  caseStyle: 'camelCase' | 'kebab-case' | 'snake_case' | 'PascalCase';
}

export interface StyleOptimization {
  minify: boolean;
  purgeUnused: boolean;
  autoprefixer: boolean;
  cssnano: boolean;
  sortProperties: boolean;
  mergeSelectors: boolean;
}

export interface DesignToken {
  name: string;
  value: string | number;
  type:
    | 'color'
    | 'spacing'
    | 'typography'
    | 'shadow'
    | 'border'
    | 'animation'
    | 'breakpoint';
  category: string;
  description?: string;
  alias?: string;
  metadata: {
    source: 'figma' | 'sketch' | 'manual' | 'computed';
    lastUpdated: number;
    usage: number;
  };
}

export interface DesignSystem {
  name: string;
  version: string;
  tokens: DesignToken[];
  components: ComponentDefinition[];
  themes: ThemeDefinition[];
  breakpoints: BreakpointDefinition[];
  typography: TypographyScale[];
}

export interface ComponentDefinition {
  name: string;
  variants: ComponentVariant[];
  defaultProps: Record<string, any>;
  styleProps: StyleProp[];
  documentation?: string;
  examples: ComponentExample[];
}

export interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  styles: Record<string, string>;
  conditions?: StyleCondition[];
}

export interface StyleProp {
  name: string;
  type: 'color' | 'spacing' | 'size' | 'typography' | 'boolean' | 'enum';
  values?: string[];
  defaultValue?: any;
  responsive: boolean;
  description?: string;
}

export interface ComponentExample {
  name: string;
  code: string;
  preview?: string;
  description?: string;
}

export interface ThemeDefinition {
  name: string;
  extends?: string;
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, TypographyDefinition>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  animations: Record<string, AnimationDefinition>;
}

export interface TypographyDefinition {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
  textTransform?: string;
}

export interface AnimationDefinition {
  keyframes: Record<string, Record<string, string>>;
  duration: string;
  timing: string;
  delay?: string;
  iteration?: string | number;
  direction?: string;
  fillMode?: string;
}

export interface BreakpointDefinition {
  name: string;
  minWidth?: number;
  maxWidth?: number;
  orientation?: 'portrait' | 'landscape';
  resolution?: string;
}

export interface TypographyScale {
  name: string;
  sizes: Record<string, TypographyDefinition>;
  weights: Record<string, number>;
  families: Record<string, string>;
}

export interface StyleCondition {
  type: 'media' | 'container' | 'supports' | 'pseudo' | 'attribute';
  query: string;
  styles: Record<string, string>;
}

export interface ResponsiveStyleValue {
  default: string;
  breakpoints: Record<string, string>;
}

export interface StyleGeneration {
  input: StyleGenerationInput;
  output: StyleGenerationOutput;
  metadata: StyleGenerationMetadata;
}

export interface StyleGenerationInput {
  properties: Record<string, string | ResponsiveStyleValue>;
  designTokens: DesignToken[];
  component?: ComponentDefinition;
  theme?: ThemeDefinition;
  conditions?: StyleCondition[];
}

export interface StyleGenerationOutput {
  css: string;
  classes: string[];
  variables: Record<string, string>;
  imports: string[];
  dependencies: string[];
  sourceMap?: string;
}

export interface StyleGenerationMetadata {
  strategy: StyleGenerationStrategy;
  timestamp: number;
  hash: string;
  performance: {
    generationTime: number;
    outputSize: number;
    optimizationSavings: number;
  };
}

export interface StyleValidation {
  isValid: boolean;
  errors: StyleValidationError[];
  warnings: StyleValidationWarning[];
  suggestions: StyleSuggestion[];
  performance: StylePerformanceMetrics;
}

export interface StyleValidationError {
  type:
    | 'syntax'
    | 'property'
    | 'value'
    | 'conflict'
    | 'accessibility'
    | 'performance';
  property?: string;
  value?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fix?: {
    description: string;
    replacement: string;
  };
}

export interface StyleValidationWarning {
  type: 'deprecated' | 'browser-support' | 'performance' | 'best-practice';
  property: string;
  message: string;
  suggestion?: string;
}

export interface StyleSuggestion {
  type: 'optimization' | 'design-token' | 'responsive' | 'accessibility';
  description: string;
  before: string;
  after: string;
  impact: 'low' | 'medium' | 'high';
}

export interface StylePerformanceMetrics {
  selectors: number;
  declarations: number;
  specificity: {
    average: number;
    max: number;
    problematic: string[];
  };
  size: {
    original: number;
    compressed: number;
    savings: number;
  };
  complexity: {
    score: number;
    factors: string[];
  };
}

export interface StyleTransformation {
  from: StyleFramework['name'];
  to: StyleFramework['name'];
  rules: TransformationRule[];
  options: TransformationOptions;
}

export interface TransformationRule {
  type:
    | 'property-rename'
    | 'value-convert'
    | 'selector-transform'
    | 'structure-change';
  pattern: string | RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  conditions?: string[];
}

export interface TransformationOptions {
  preserveComments: boolean;
  maintainFormatting: boolean;
  addSourceMaps: boolean;
  validateOutput: boolean;
  optimizeResult: boolean;
}

export interface StyleFrameworkDetectionResult {
  frameworks: StyleFramework[];
  primary: StyleFramework;
  conflicts: StyleFrameworkConflict[];
  recommendations: FrameworkRecommendation[];
}

export interface StyleFrameworkConflict {
  frameworks: StyleFramework['name'][];
  type: 'version' | 'configuration' | 'methodology';
  description: string;
  resolution: string;
}

export interface FrameworkRecommendation {
  type: 'migration' | 'optimization' | 'integration' | 'upgrade';
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

export interface StyleBundlingConfig {
  entry: string[];
  output: {
    path: string;
    filename: string;
    publicPath?: string;
  };
  optimization: {
    splitChunks: boolean;
    extractCss: boolean;
    purgeUnused: boolean;
    minify: boolean;
  };
  sourceMap: boolean;
  watch: boolean;
}

export interface StyleCacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'memory' | 'disk' | 'hybrid';
  invalidation: CacheInvalidationRule[];
}

export interface CacheInvalidationRule {
  trigger: 'file-change' | 'dependency-update' | 'config-change' | 'manual';
  pattern: string | RegExp;
  action: 'clear-all' | 'clear-specific' | 'refresh';
}
