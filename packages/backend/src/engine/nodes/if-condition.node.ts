import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * If-Condition Node
 *
 * Evaluates one or more conditions against the input data and returns
 * a boolean result. Downstream edges can use the `result` field to
 * implement conditional branching.
 *
 * Config:
 *   - conditions: Array<{
 *       field:    string;           // path into the input data
 *       operator: string;           // comparison operator
 *       value:    any;              // expected value
 *     }>
 *   - combinator: 'AND' | 'OR'     // how multiple conditions are combined (default AND)
 *
 * Supported operators:
 *   equals, not_equals, greater_than, less_than, greater_equal, less_equal,
 *   contains, not_contains, starts_with, ends_with, is_empty, is_not_empty,
 *   regex, in, not_in, is_true, is_false, is_null, is_not_null, type_is
 */
export class IfConditionNode implements NodeHandler {
  readonly type = 'if-condition';
  readonly category = 'logic';
  readonly description =
    'Evaluates conditions and branches the workflow accordingly';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const { conditions = [], combinator = 'AND' } = config;

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new Error(
        'If-Condition node: at least one condition is required',
      );
    }

    const results = conditions.map(
      (condition: { field: string; operator: string; value?: any }) => {
        const fieldValue = this.getNestedValue(inputs, condition.field);
        return this.evaluate(fieldValue, condition.operator, condition.value);
      },
    );

    const result =
      combinator === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);

    return {
      result,
      conditionResults: conditions.map(
        (c: { field: string; operator: string; value?: any }, i: number) => ({
          field: c.field,
          operator: c.operator,
          expected: c.value,
          actual: this.getNestedValue(inputs, c.field),
          passed: results[i],
        }),
      ),
      combinator,
      data: inputs,
    };
  }

  /**
   * Evaluate a single condition.
   */
  private evaluate(
    fieldValue: any,
    operator: string,
    expected: any,
  ): boolean {
    switch (operator) {
      case 'equals':
      case 'eq':
        return fieldValue == expected; // eslint-disable-line eqeqeq

      case 'strict_equals':
        return fieldValue === expected;

      case 'not_equals':
      case 'neq':
        return fieldValue != expected; // eslint-disable-line eqeqeq

      case 'greater_than':
      case 'gt':
        return Number(fieldValue) > Number(expected);

      case 'less_than':
      case 'lt':
        return Number(fieldValue) < Number(expected);

      case 'greater_equal':
      case 'gte':
        return Number(fieldValue) >= Number(expected);

      case 'less_equal':
      case 'lte':
        return Number(fieldValue) <= Number(expected);

      case 'contains':
        return String(fieldValue).includes(String(expected));

      case 'not_contains':
        return !String(fieldValue).includes(String(expected));

      case 'starts_with':
        return String(fieldValue).startsWith(String(expected));

      case 'ends_with':
        return String(fieldValue).endsWith(String(expected));

      case 'is_empty':
        return (
          fieldValue === '' ||
          fieldValue === null ||
          fieldValue === undefined ||
          (Array.isArray(fieldValue) && fieldValue.length === 0) ||
          (typeof fieldValue === 'object' &&
            fieldValue !== null &&
            Object.keys(fieldValue).length === 0)
        );

      case 'is_not_empty':
        return !(
          fieldValue === '' ||
          fieldValue === null ||
          fieldValue === undefined ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );

      case 'regex':
        try {
          return new RegExp(String(expected)).test(String(fieldValue));
        } catch {
          return false;
        }

      case 'in':
        return Array.isArray(expected) && expected.includes(fieldValue);

      case 'not_in':
        return Array.isArray(expected) && !expected.includes(fieldValue);

      case 'is_true':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'is_false':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      case 'is_null':
        return fieldValue === null || fieldValue === undefined;

      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;

      case 'type_is':
        return typeof fieldValue === expected;

      default:
        throw new Error(`Unknown operator: "${operator}"`);
    }
  }

  /**
   * Resolve a dot-separated path into a nested object.
   * e.g. "body.data.name" retrieves inputs.body.data.name
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }

  validate(config: Record<string, any>): boolean {
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      return false;
    }
    return config.conditions.every(
      (c: any) =>
        typeof c.field === 'string' &&
        typeof c.operator === 'string',
    );
  }
}
