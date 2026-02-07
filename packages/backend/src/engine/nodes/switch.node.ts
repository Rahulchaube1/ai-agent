import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Switch / Router Node
 *
 * Evaluates a value against multiple cases and routes the workflow
 * to the matching branch. Similar to a switch/case statement.
 *
 * Config:
 *   - field:        string   (the input field to evaluate)
 *   - cases:        Array<{
 *       label:     string;      // human-readable label for this branch
 *       operator:  string;      // comparison operator (equals, contains, regex, etc.)
 *       value:     any;         // value to compare against
 *       output:    string;      // output handle identifier for downstream routing
 *     }>
 *   - defaultCase:  string?     // output handle for the default/fallback route
 *   - mode:         'first_match' | 'all_matches'  (default: first_match)
 */
export class SwitchNode implements NodeHandler {
  readonly type = 'switch';
  readonly category = 'logic';
  readonly description =
    'Routes the workflow to different branches based on matching conditions';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const {
      field,
      cases = [],
      defaultCase = 'default',
      mode = 'first_match',
    } = config;

    if (!field) {
      throw new Error('Switch node: "field" configuration is required');
    }

    if (!Array.isArray(cases) || cases.length === 0) {
      throw new Error(
        'Switch node: at least one case is required',
      );
    }

    const fieldValue = this.getNestedValue(inputs, field);

    // Evaluate each case
    const caseResults = cases.map(
      (switchCase: {
        label: string;
        operator: string;
        value: any;
        output: string;
      }) => ({
        ...switchCase,
        matched: this.evaluateCase(
          fieldValue,
          switchCase.operator,
          switchCase.value,
        ),
      }),
    );

    let matchedCases: typeof caseResults;
    if (mode === 'all_matches') {
      matchedCases = caseResults.filter((c) => c.matched);
    } else {
      const firstMatch = caseResults.find((c) => c.matched);
      matchedCases = firstMatch ? [firstMatch] : [];
    }

    const matchedOutputs = matchedCases.map((c) => c.output);

    // If no case matched, use the default
    const hasMatch = matchedCases.length > 0;
    const activeOutputs = hasMatch ? matchedOutputs : [defaultCase];

    return {
      field,
      fieldValue,
      matchedCases: matchedCases.map((c) => ({
        label: c.label,
        output: c.output,
        value: c.value,
      })),
      activeOutputs,
      defaultUsed: !hasMatch,
      mode,
      caseEvaluations: caseResults.map((c) => ({
        label: c.label,
        output: c.output,
        operator: c.operator,
        value: c.value,
        matched: c.matched,
      })),
      data: inputs,
    };
  }

  /**
   * Evaluate a single case against the field value.
   */
  private evaluateCase(
    fieldValue: any,
    operator: string,
    expected: any,
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue == expected; // eslint-disable-line eqeqeq
      case 'strict_equals':
        return fieldValue === expected;
      case 'not_equals':
        return fieldValue != expected; // eslint-disable-line eqeqeq
      case 'contains':
        return String(fieldValue).includes(String(expected));
      case 'not_contains':
        return !String(fieldValue).includes(String(expected));
      case 'starts_with':
        return String(fieldValue).startsWith(String(expected));
      case 'ends_with':
        return String(fieldValue).endsWith(String(expected));
      case 'greater_than':
        return Number(fieldValue) > Number(expected);
      case 'less_than':
        return Number(fieldValue) < Number(expected);
      case 'greater_equal':
        return Number(fieldValue) >= Number(expected);
      case 'less_equal':
        return Number(fieldValue) <= Number(expected);
      case 'regex':
        try {
          return new RegExp(String(expected)).test(String(fieldValue));
        } catch {
          return false;
        }
      case 'in':
        return Array.isArray(expected) && expected.includes(fieldValue);
      case 'is_true':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
      case 'is_false':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'type_is':
        return typeof fieldValue === expected;
      default:
        throw new Error(`Switch node: unknown operator "${operator}"`);
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
    if (!config.field || typeof config.field !== 'string') return false;
    if (!Array.isArray(config.cases) || config.cases.length === 0) return false;
    return config.cases.every(
      (c: any) =>
        typeof c.operator === 'string' && typeof c.output === 'string',
    );
  }
}
