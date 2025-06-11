import type {
  ComponentLibraryName,
  ComponentMappingRule,
  ComponentDefinition,
} from './types';

export class ComponentMapper {
  private mappingRules: Map<string, ComponentMappingRule[]> = new Map();
  private componentDefinitions: Map<
    ComponentLibraryName,
    ComponentDefinition[]
  > = new Map();

  constructor() {
    this.initializeMappingRules();
    this.initializeComponentDefinitions();
  }

  /**
   * Map a component from one library to another
   */
  public mapComponent(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
    componentName: string,
  ): ComponentMappingRule | null {
    const mappingKey = `${sourceLibrary}->${targetLibrary}`;
    const rules = this.mappingRules.get(mappingKey) || [];

    return rules.find((rule) => rule.sourceComponent === componentName) || null;
  }

  /**
   * Get all available mappings for a library pair
   */
  public getLibraryMappings(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
  ): ComponentMappingRule[] {
    const mappingKey = `${sourceLibrary}->${targetLibrary}`;
    return this.mappingRules.get(mappingKey) || [];
  }

  /**
   * Generate migration code for component transformation
   */
  public generateMigrationCode(
    mappingRule: ComponentMappingRule,
    originalCode: string,
  ): {
    transformedCode: string;
    imports: string[];
    notes: string[];
  } {
    const transformation = mappingRule.transformation;
    const imports: string[] = [];
    const notes: string[] = [];
    let transformedCode = originalCode;

    // Transform component name
    transformedCode = transformedCode.replace(
      new RegExp(`<${mappingRule.sourceComponent}`, 'g'),
      `<${mappingRule.targetComponent}`,
    );
    transformedCode = transformedCode.replace(
      new RegExp(`</${mappingRule.sourceComponent}>`, 'g'),
      `</${mappingRule.targetComponent}>`,
    );

    // Transform props
    for (const [sourceProp, targetProp] of Object.entries(
      mappingRule.propMapping,
    )) {
      transformedCode = transformedCode.replace(
        new RegExp(`\\b${sourceProp}=`, 'g'),
        `${targetProp}=`,
      );
    }

    // Add imports
    const targetLibraryImport = this.getLibraryImport(
      mappingRule.targetLibrary,
    );
    if (targetLibraryImport) {
      imports.push(
        `import { ${mappingRule.targetComponent} } from '${targetLibraryImport}';`,
      );
    }

    // Add transformation notes
    if (transformation) {
      notes.push(`Transformation type: ${transformation.type}`);
      if (transformation.notes) {
        notes.push(transformation.notes);
      }
    }

    return {
      transformedCode,
      imports,
      notes,
    };
  }

  /**
   * Get component suggestions for a given component
   */
  public getComponentSuggestions(
    currentLibrary: ComponentLibraryName,
    componentName: string,
    targetLibraries: ComponentLibraryName[],
  ): Array<{
    library: ComponentLibraryName;
    component: string;
    confidence: number;
    mapping: ComponentMappingRule | null;
  }> {
    const suggestions = [];

    for (const targetLibrary of targetLibraries) {
      const mapping = this.mapComponent(
        currentLibrary,
        targetLibrary,
        componentName,
      );

      if (mapping) {
        suggestions.push({
          library: targetLibrary,
          component: mapping.targetComponent,
          confidence: 0.9,
          mapping,
        });
      } else {
        // Try fuzzy matching
        const fuzzyMatch = this.findFuzzyMatch(componentName, targetLibrary);
        if (fuzzyMatch) {
          suggestions.push({
            library: targetLibrary,
            component: fuzzyMatch.component,
            confidence: fuzzyMatch.confidence,
            mapping: null,
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze migration complexity
   */
  public analyzeMigrationComplexity(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
    components: string[],
  ): {
    complexity: 'low' | 'medium' | 'high';
    mappableComponents: number;
    unmappableComponents: string[];
    requiredManualWork: string[];
    estimatedEffort: string;
  } {
    let mappableComponents = 0;
    const unmappableComponents: string[] = [];
    const requiredManualWork: string[] = [];

    for (const component of components) {
      const mapping = this.mapComponent(
        sourceLibrary,
        targetLibrary,
        component,
      );

      if (mapping) {
        mappableComponents++;

        if (mapping.transformation?.type === 'custom') {
          requiredManualWork.push(
            `${component} requires custom transformation`,
          );
        }
      } else {
        unmappableComponents.push(component);
      }
    }

    const mappableRatio = mappableComponents / components.length;
    let complexity: 'low' | 'medium' | 'high';
    let estimatedEffort: string;

    if (mappableRatio > 0.8 && requiredManualWork.length === 0) {
      complexity = 'low';
      estimatedEffort = '1-2 days';
    } else if (mappableRatio > 0.6 && requiredManualWork.length < 3) {
      complexity = 'medium';
      estimatedEffort = '3-5 days';
    } else {
      complexity = 'high';
      estimatedEffort = '1-2 weeks';
    }

    return {
      complexity,
      mappableComponents,
      unmappableComponents,
      requiredManualWork,
      estimatedEffort,
    };
  }

  /**
   * Initialize mapping rules between popular libraries
   */
  private initializeMappingRules(): void {
    // Material-UI to Ant Design mappings
    this.mappingRules.set('material-ui->ant-design', [
      {
        sourceLibrary: 'material-ui',
        targetLibrary: 'ant-design',
        sourceComponent: 'Button',
        targetComponent: 'Button',
        propMapping: {
          variant: 'type',
          color: 'type',
          startIcon: 'icon',
        },
        styleMapping: {
          contained: 'primary',
          outlined: 'default',
          text: 'link',
        },
        transformation: {
          type: 'direct',
          implementation: 'Direct component replacement with prop mapping',
        },
      },
      {
        sourceLibrary: 'material-ui',
        targetLibrary: 'ant-design',
        sourceComponent: 'TextField',
        targetComponent: 'Input',
        propMapping: {
          label: 'placeholder',
          helperText: 'extra',
          error: 'status',
        },
        styleMapping: {},
        transformation: {
          type: 'wrapper',
          implementation: 'Wrap with Form.Item for label support',
        },
      },
      {
        sourceLibrary: 'material-ui',
        targetLibrary: 'ant-design',
        sourceComponent: 'Card',
        targetComponent: 'Card',
        propMapping: {},
        styleMapping: {},
        transformation: {
          type: 'direct',
          implementation: 'Direct replacement',
        },
      },
    ]);

    // Ant Design to Material-UI mappings
    this.mappingRules.set('ant-design->material-ui', [
      {
        sourceLibrary: 'ant-design',
        targetLibrary: 'material-ui',
        sourceComponent: 'Button',
        targetComponent: 'Button',
        propMapping: {
          type: 'variant',
          icon: 'startIcon',
        },
        styleMapping: {
          primary: 'contained',
          default: 'outlined',
          link: 'text',
        },
        transformation: {
          type: 'direct',
          implementation: 'Direct component replacement with prop mapping',
        },
      },
      {
        sourceLibrary: 'ant-design',
        targetLibrary: 'material-ui',
        sourceComponent: 'Input',
        targetComponent: 'TextField',
        propMapping: {
          placeholder: 'label',
          extra: 'helperText',
          status: 'error',
        },
        styleMapping: {},
        transformation: {
          type: 'composition',
          implementation:
            'Combine Input with FormControl for full feature parity',
        },
      },
    ]);

    // Material-UI to Chakra UI mappings
    this.mappingRules.set('material-ui->chakra-ui', [
      {
        sourceLibrary: 'material-ui',
        targetLibrary: 'chakra-ui',
        sourceComponent: 'Button',
        targetComponent: 'Button',
        propMapping: {
          variant: 'variant',
          color: 'colorScheme',
          startIcon: 'leftIcon',
          endIcon: 'rightIcon',
        },
        styleMapping: {
          contained: 'solid',
          outlined: 'outline',
          text: 'ghost',
        },
        transformation: {
          type: 'direct',
          implementation: 'Direct component replacement',
        },
      },
      {
        sourceLibrary: 'material-ui',
        targetLibrary: 'chakra-ui',
        sourceComponent: 'TextField',
        targetComponent: 'Input',
        propMapping: {
          label: 'placeholder',
          helperText: 'helperText',
          error: 'isInvalid',
        },
        styleMapping: {},
        transformation: {
          type: 'wrapper',
          implementation:
            'Wrap with FormControl and FormLabel for full feature support',
        },
      },
    ]);

    // Chakra UI to Material-UI mappings
    this.mappingRules.set('chakra-ui->material-ui', [
      {
        sourceLibrary: 'chakra-ui',
        targetLibrary: 'material-ui',
        sourceComponent: 'Button',
        targetComponent: 'Button',
        propMapping: {
          variant: 'variant',
          colorScheme: 'color',
          leftIcon: 'startIcon',
          rightIcon: 'endIcon',
        },
        styleMapping: {
          solid: 'contained',
          outline: 'outlined',
          ghost: 'text',
        },
        transformation: {
          type: 'direct',
          implementation: 'Direct component replacement',
        },
      },
    ]);

    // React Bootstrap to Material-UI mappings
    this.mappingRules.set('react-bootstrap->material-ui', [
      {
        sourceLibrary: 'react-bootstrap',
        targetLibrary: 'material-ui',
        sourceComponent: 'Button',
        targetComponent: 'Button',
        propMapping: {
          variant: 'variant',
        },
        styleMapping: {
          primary: 'contained',
          secondary: 'outlined',
          'outline-primary': 'outlined',
        },
        transformation: {
          type: 'direct',
          implementation: 'Direct component replacement with style mapping',
        },
      },
    ]);
  }

  /**
   * Initialize component definitions for fuzzy matching
   */
  private initializeComponentDefinitions(): void {
    // Material-UI components
    this.componentDefinitions.set('material-ui', [
      {
        name: 'Button',
        displayName: 'Button',
        category: 'input',
        variants: [],
        props: [],
        styles: {
          baseStyles: {},
          variants: {},
          modifiers: {},
          responsive: {},
          designTokens: {
            colors: {},
            spacing: {},
            typography: {},
            shadows: {},
            borders: {},
            animation: {},
          },
        },
        examples: [],
        dependencies: [],
        accessibility: {
          ariaLabels: [],
          keyboardNavigation: true,
          screenReaderSupport: true,
          colorContrast: true,
          focusManagement: true,
          guidelines: [],
        },
        responsive: {
          breakpoints: [],
          responsiveProps: [],
          mobileOptimized: true,
          touchSupport: true,
        },
      },
      {
        name: 'TextField',
        displayName: 'Text Field',
        category: 'input',
        variants: [],
        props: [],
        styles: {
          baseStyles: {},
          variants: {},
          modifiers: {},
          responsive: {},
          designTokens: {
            colors: {},
            spacing: {},
            typography: {},
            shadows: {},
            borders: {},
            animation: {},
          },
        },
        examples: [],
        dependencies: [],
        accessibility: {
          ariaLabels: [],
          keyboardNavigation: true,
          screenReaderSupport: true,
          colorContrast: true,
          focusManagement: true,
          guidelines: [],
        },
        responsive: {
          breakpoints: [],
          responsiveProps: [],
          mobileOptimized: true,
          touchSupport: true,
        },
      },
    ]);

    // Ant Design components
    this.componentDefinitions.set('ant-design', [
      {
        name: 'Button',
        displayName: 'Button',
        category: 'input',
        variants: [],
        props: [],
        styles: {
          baseStyles: {},
          variants: {},
          modifiers: {},
          responsive: {},
          designTokens: {
            colors: {},
            spacing: {},
            typography: {},
            shadows: {},
            borders: {},
            animation: {},
          },
        },
        examples: [],
        dependencies: [],
        accessibility: {
          ariaLabels: [],
          keyboardNavigation: true,
          screenReaderSupport: true,
          colorContrast: true,
          focusManagement: true,
          guidelines: [],
        },
        responsive: {
          breakpoints: [],
          responsiveProps: [],
          mobileOptimized: true,
          touchSupport: true,
        },
      },
      {
        name: 'Input',
        displayName: 'Input',
        category: 'input',
        variants: [],
        props: [],
        styles: {
          baseStyles: {},
          variants: {},
          modifiers: {},
          responsive: {},
          designTokens: {
            colors: {},
            spacing: {},
            typography: {},
            shadows: {},
            borders: {},
            animation: {},
          },
        },
        examples: [],
        dependencies: [],
        accessibility: {
          ariaLabels: [],
          keyboardNavigation: true,
          screenReaderSupport: true,
          colorContrast: true,
          focusManagement: true,
          guidelines: [],
        },
        responsive: {
          breakpoints: [],
          responsiveProps: [],
          mobileOptimized: true,
          touchSupport: true,
        },
      },
    ]);
  }

  /**
   * Find fuzzy match for component name
   */
  private findFuzzyMatch(
    componentName: string,
    targetLibrary: ComponentLibraryName,
  ): { component: string; confidence: number } | null {
    const components = this.componentDefinitions.get(targetLibrary) || [];

    for (const component of components) {
      const similarity = this.calculateStringSimilarity(
        componentName.toLowerCase(),
        component.name.toLowerCase(),
      );

      if (similarity > 0.7) {
        return {
          component: component.name,
          confidence: similarity,
        };
      }
    }

    return null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Get library import path
   */
  private getLibraryImport(library: ComponentLibraryName): string {
    const importMap: Record<ComponentLibraryName, string> = {
      'material-ui': '@mui/material',
      'ant-design': 'antd',
      'chakra-ui': '@chakra-ui/react',
      'react-bootstrap': 'react-bootstrap',
      'semantic-ui': 'semantic-ui-react',
      mantine: '@mantine/core',
      'headless-ui': '@headlessui/react',
      'shadcn-ui': './components/ui',
      'next-ui': '@nextui-org/react',
      'element-plus': 'element-plus',
      quasar: 'quasar',
      vuetify: 'vuetify',
      'bootstrap-vue': 'bootstrap-vue',
      custom: '',
    };

    return importMap[library] || '';
  }

  /**
   * Add custom mapping rule
   */
  public addMappingRule(rule: ComponentMappingRule): void {
    const mappingKey = `${rule.sourceLibrary}->${rule.targetLibrary}`;
    const existingRules = this.mappingRules.get(mappingKey) || [];

    // Remove existing rule for the same component if it exists
    const filteredRules = existingRules.filter(
      (r) => r.sourceComponent !== rule.sourceComponent,
    );
    filteredRules.push(rule);

    this.mappingRules.set(mappingKey, filteredRules);
  }

  /**
   * Get all supported libraries
   */
  public getSupportedLibraries(): ComponentLibraryName[] {
    return Array.from(this.componentDefinitions.keys());
  }
}
