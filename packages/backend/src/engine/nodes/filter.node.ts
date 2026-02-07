import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Filter Node
 *
 * Filters an array of items based on one or more conditions.
 * Only items that satisfy the conditions are included in the output.
 *
 * Config:
 *   - source:      string          (input field containing the array, e.g. "body.items")
 *   - conditions:  Array<{
 *       field:    string;          // dot-separated path within each item
 *       operator: string;          // comparison operator
 *       value:    any;             // value to compare against
 *     }>
 *   - combinator:  'AND' | 'OR'   (how multiple conditions combine, default 'AND')
 *   - limit:       number?        (max items to return)
 *   - offset:      number?        (items to skip before returning)
 *   - sortBy:      string?        (field to sort results by)
 *   - sortOrder:   'asc' | 'desc' (default 'asc')
 */
export class FilterNode implements NodeHandler {
  readonly type = 'filter';
  readonly category = 'actions';
  readonly description =
    'Filters an array of items based on conditions';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const {
      source,
      conditions = [],
      combinator = 'AND',
      limit,
      offset = 0,
      sortBy,
      sortOrder = 'asc',
    } = config;

    if (!source) {
      throw new Error('Filter node: "source" is required');
    }

    const rawItems = this.getNestedValue(inputs, source);
    if (!Array.isArray(rawItems)) {
      throw new Error(
        `Filter node: source "${source}" is not an array (got ${typeof rawItems})`,
      );
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new Error(
        'Filter node: at least one condition is required',
      );
    }

    // Apply filter conditions
    let filtered = rawItems.filter((item) => {
      const results = conditions.map(
        (condition: { field: string; operator: string; value?: any }) => {
          const fieldValue = this.getNestedValue(item, condition.field);
          return this.evaluate(fieldValue, condition.operator, condition.value);
        },
      );
      return combinator === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);
    });

    // Sort if requested
    if (sortBy) {
      filtered.sort((a: any, b: any) => {
        const aVal = this.getNestedValue(a, sortBy);
        const bVal = this.getNestedValue(b, sortBy);
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply offset and limit
    const totalFiltered = filtered.length;
    if (offset > 0) {
      filtered = filtered.slice(offset);
    }
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return {
      items: filtered,
      totalInput: rawItems.length,
      totalFiltered,
      returnedCount: filtered.length,
      offset,
      limit: limit || null,
      conditions: conditions.map((c: any) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      combinator,
    };
  }

  /**
   * Evaluate a single condition against a value.
   */
  private evaluate(fieldValue: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue == expected; // eslint-disable-line eqeqeq
      case 'strict_equals':
        return fieldValue === expected;
      case 'not_equals':
        return fieldValue != expected; // eslint-disable-line eqeqeq
      case 'greater_than':
        return Number(fieldValue) > Number(expected);
      case 'less_than':
        return Number(fieldValue) < Number(expected);
      case 'greater_equal':
        return Number(fieldValue) >= Number(expected);
      case 'less_equal':
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
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );
      case 'is_not_empty':
        return (
          fieldValue !== '' &&
          fieldValue !== null &&
          fieldValue !== undefined &&
          !(Array.isArray(fieldValue) && fieldValue.length === 0)
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
        throw new Error(`Filter node: unknown operator "${operator}"`);
    }
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

  validate(config: Record<string, any>): boolean {
    if (!config.source || typeof config.source !== 'string') return false;
    if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
      return false;
    }
    return config.conditions.every(
      (c: any) =>
        typeof c.field === 'string' && typeof c.operator === 'string',
    );
  }
}
