import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Transform / Map Node
 *
 * Transforms input data using field mappings, expressions, or
 * full custom transformations. Works on single objects or arrays.
 *
 * Config:
 *   - mode:         'map_fields' | 'expression' | 'template' | 'jq'   (default 'map_fields')
 *   - mappings:     Array<{
 *       from:       string;         // source field (dot-notation)
 *       to:         string;         // target field in output
 *       transform?: string;         // optional JS expression applied to the value
 *       default?:   any;            // default value if source is undefined
 *     }>                            // (used when mode is 'map_fields')
 *   - expression:   string?         // JS expression (used when mode is 'expression')
 *   - template:     object?         // output template with {{field}} placeholders (mode 'template')
 *   - source:       string?         // input field containing an array to transform item-by-item
 *   - flatten:      boolean?        // flatten nested arrays in the output (default false)
 *   - compact:      boolean?        // remove null/undefined values (default false)
 */
export class TransformNode implements NodeHandler {
  readonly type = 'transform';
  readonly category = 'actions';
  readonly description =
    'Transforms and reshapes data using mappings or expressions';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const {
      mode = 'map_fields',
      mappings = [],
      expression,
      template,
      source,
      flatten = false,
      compact = false,
    } = config;

    // If a source is specified, resolve the array and transform each item
    let data: any;
    if (source) {
      const rawData = this.getNestedValue(inputs, source);
      if (Array.isArray(rawData)) {
        data = rawData.map((item, index) =>
          this.transformItem(item, mode, mappings, expression, template, index, context.variables),
        );
      } else {
        data = this.transformItem(
          rawData,
          mode,
          mappings,
          expression,
          template,
          0,
          context.variables,
        );
      }
    } else {
      data = this.transformItem(
        inputs,
        mode,
        mappings,
        expression,
        template,
        0,
        context.variables,
      );
    }

    // Post-processing
    if (flatten && Array.isArray(data)) {
      data = data.flat(Infinity);
    }
    if (compact) {
      data = this.compactData(data);
    }

    return {
      data,
      mode,
      itemCount: Array.isArray(data) ? data.length : 1,
    };
  }

  /**
   * Transform a single item based on the configured mode.
   */
  private transformItem(
    item: any,
    mode: string,
    mappings: any[],
    expression: string | undefined,
    template: any,
    index: number,
    variables: Record<string, any>,
  ): any {
    switch (mode) {
      case 'map_fields':
        return this.mapFields(item, mappings);

      case 'expression':
        if (!expression) {
          throw new Error(
            'Transform node: "expression" is required in expression mode',
          );
        }
        return this.evaluateExpression(expression, item, index, variables);

      case 'template':
        if (!template) {
          throw new Error(
            'Transform node: "template" is required in template mode',
          );
        }
        return this.applyTemplate(template, item);

      default:
        throw new Error(`Transform node: unknown mode "${mode}"`);
    }
  }

  /**
   * Map fields from the input to new field names with optional transforms.
   */
  private mapFields(
    item: any,
    mappings: Array<{
      from: string;
      to: string;
      transform?: string;
      default?: any;
    }>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = this.getNestedValue(item, mapping.from);

      if (value === undefined || value === null) {
        value = mapping.default ?? null;
      }

      // Apply an optional transformation expression
      if (mapping.transform) {
        try {
          const fn = new Function(
            'value',
            'item',
            `"use strict"; return (${mapping.transform});`,
          );
          value = fn(value, item);
        } catch (error: any) {
          throw new Error(
            `Transform node: field transform failed for "${mapping.from}": ${error.message}`,
          );
        }
      }

      this.setNestedValue(result, mapping.to, value);
    }

    return result;
  }

  /**
   * Evaluate a JS expression against the item.
   */
  private evaluateExpression(
    expression: string,
    item: any,
    index: number,
    variables: Record<string, any>,
  ): any {
    try {
      const fn = new Function(
        'item',
        'index',
        'vars',
        `"use strict"; return (${expression});`,
      );
      return fn(item, index, variables);
    } catch (error: any) {
      throw new Error(
        `Transform node: expression evaluation failed: ${error.message}`,
      );
    }
  }

  /**
   * Apply a template object, replacing {{field}} placeholders with values.
   */
  private applyTemplate(template: any, item: any): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{(\S+?)\}\}/g, (_, path) => {
        const val = this.getNestedValue(item, path);
        return val !== undefined && val !== null ? String(val) : '';
      });
    }
    if (Array.isArray(template)) {
      return template.map((t) => this.applyTemplate(t, item));
    }
    if (template && typeof template === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.applyTemplate(value, item);
      }
      return result;
    }
    return template;
  }

  /**
   * Remove null and undefined values from an object or array.
   */
  private compactData(data: any): any {
    if (Array.isArray(data)) {
      return data
        .filter((item) => item !== null && item !== undefined)
        .map((item) => this.compactData(item));
    }
    if (data && typeof data === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          result[key] = this.compactData(value);
        }
      }
      return result;
    }
    return data;
  }

  /**
   * Resolve a dot-separated path into a nested object.
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }

  /**
   * Set a value at a dot-separated path, creating intermediate objects
   * as needed.
   */
  private setNestedValue(
    obj: Record<string, any>,
    path: string,
    value: any,
  ): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  validate(config: Record<string, any>): boolean {
    const validModes = ['map_fields', 'expression', 'template', 'jq'];
    if (config.mode && !validModes.includes(config.mode)) return false;

    if (config.mode === 'map_fields' || !config.mode) {
      if (!Array.isArray(config.mappings) || config.mappings.length === 0) {
        return false;
      }
      return config.mappings.every(
        (m: any) =>
          typeof m.from === 'string' && typeof m.to === 'string',
      );
    }

    if (config.mode === 'expression') {
      return typeof config.expression === 'string' && config.expression.length > 0;
    }

    if (config.mode === 'template') {
      return config.template !== undefined && config.template !== null;
    }

    return true;
  }
}
