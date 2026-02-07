import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Loop / Iterator Node
 *
 * Iterates over an array (or a range) and produces an output for each
 * item. The loop can optionally accumulate results and supports
 * break conditions.
 *
 * Config:
 *   - source:         string   (input field containing the array to iterate, e.g. "body.items")
 *   - range:          object?  ({ start: number; end: number; step?: number }) - generate a numeric range
 *   - itemVariable:   string?  (name for the current item variable, default "item")
 *   - indexVariable:  string?  (name for the current index variable, default "index")
 *   - maxIterations:  number?  (safety limit, default 1 000)
 *   - batchSize:      number?  (process items in batches for memory efficiency)
 *   - breakCondition: object?  ({ field: string; operator: string; value: any })
 *   - accumulate:     boolean? (collect all iteration results into an array, default true)
 *   - expression:     string?  (JS expression applied to each item to produce the output)
 */
export class LoopNode implements NodeHandler {
  readonly type = 'loop';
  readonly category = 'logic';
  readonly description =
    'Iterates over an array or range and processes each item';

  private static readonly MAX_ITERATIONS_DEFAULT = 1_000;

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const {
      source,
      range,
      itemVariable = 'item',
      indexVariable = 'index',
      maxIterations = LoopNode.MAX_ITERATIONS_DEFAULT,
      batchSize,
      breakCondition,
      accumulate = true,
      expression,
    } = config;

    // Determine the items to iterate over
    let items: any[];
    if (range) {
      items = this.generateRange(range.start, range.end, range.step);
    } else if (source) {
      const rawItems = this.getNestedValue(inputs, source);
      if (!Array.isArray(rawItems)) {
        throw new Error(
          `Loop node: source "${source}" is not an array (got ${typeof rawItems})`,
        );
      }
      items = rawItems;
    } else {
      throw new Error(
        'Loop node: either "source" or "range" must be specified',
      );
    }

    // Enforce iteration limit
    if (items.length > maxIterations) {
      items = items.slice(0, maxIterations);
    }

    const results: any[] = [];
    let breakTriggered = false;
    let processedCount = 0;

    // Process items (optionally in batches)
    const batches = batchSize
      ? this.chunk(items, batchSize)
      : [items];

    for (const batch of batches) {
      if (context.status === 'cancelled' || breakTriggered) break;

      for (const [batchIndex, item] of batch.entries()) {
        const globalIndex = processedCount;
        processedCount++;

        if (context.status === 'cancelled') break;

        // Set the current item and index on context variables so
        // downstream template expressions can reference them.
        context.variables[itemVariable] = item;
        context.variables[indexVariable] = globalIndex;

        // Evaluate the optional break condition
        if (breakCondition) {
          const shouldBreak = this.evaluateBreak(
            item,
            globalIndex,
            breakCondition,
          );
          if (shouldBreak) {
            breakTriggered = true;
            break;
          }
        }

        // Produce the iteration output
        let iterationResult: any;
        if (expression) {
          iterationResult = this.evaluateExpression(
            expression,
            item,
            globalIndex,
            inputs,
            context.variables,
          );
        } else {
          iterationResult = {
            [itemVariable]: item,
            [indexVariable]: globalIndex,
          };
        }

        if (accumulate) {
          results.push(iterationResult);
        }
      }
    }

    // Clean up context variables
    delete context.variables[itemVariable];
    delete context.variables[indexVariable];

    return {
      items: results,
      totalItems: items.length,
      processedCount,
      breakTriggered,
      batchSize: batchSize || null,
    };
  }

  /**
   * Generate a numeric range array [start, start+step, ..., end).
   */
  private generateRange(
    start: number,
    end: number,
    step: number = 1,
  ): number[] {
    if (step === 0) throw new Error('Loop node: range step cannot be zero');
    const result: number[] = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) result.push(i);
    } else {
      for (let i = start; i > end; i += step) result.push(i);
    }
    return result;
  }

  /**
   * Split an array into chunks of the given size.
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Evaluate the break condition for the current item.
   */
  private evaluateBreak(
    item: any,
    index: number,
    condition: { field: string; operator: string; value: any },
  ): boolean {
    let fieldValue: any;
    if (condition.field === '_index') {
      fieldValue = index;
    } else if (typeof item === 'object' && item !== null) {
      fieldValue = this.getNestedValue(item, condition.field);
    } else {
      fieldValue = item;
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue == condition.value; // eslint-disable-line eqeqeq
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_true':
        return !!fieldValue;
      default:
        return false;
    }
  }

  /**
   * Evaluate a JS expression for the current iteration.
   */
  private evaluateExpression(
    expression: string,
    item: any,
    index: number,
    inputs: Record<string, any>,
    variables: Record<string, any>,
  ): any {
    try {
      const fn = new Function(
        'item',
        'index',
        'inputs',
        'vars',
        `"use strict"; return (${expression});`,
      );
      return fn(item, index, inputs, variables);
    } catch (error: any) {
      throw new Error(
        `Loop node: expression evaluation failed at index ${index}: ${error.message}`,
      );
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
    if (!config.source && !config.range) return false;
    if (config.range) {
      if (typeof config.range.start !== 'number') return false;
      if (typeof config.range.end !== 'number') return false;
    }
    if (
      config.maxIterations &&
      (typeof config.maxIterations !== 'number' || config.maxIterations <= 0)
    ) {
      return false;
    }
    return true;
  }
}
