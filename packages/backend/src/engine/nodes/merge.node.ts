import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Merge Node
 *
 * Combines outputs from multiple upstream nodes into a single output.
 * Useful after parallel branches or conditional splits to reunify data
 * before passing it downstream.
 *
 * Config:
 *   - mode:       'combine' | 'append' | 'merge_by_key' | 'zip' | 'wait_all'
 *                 (default: 'combine')
 *   - sources:    string[]?   (node IDs to merge; if omitted, all direct inputs are used)
 *   - mergeKey:   string?     (key to merge on when mode is 'merge_by_key')
 *   - waitForAll: boolean?    (wait for all inputs before merging, default true)
 */
export class MergeNode implements NodeHandler {
  readonly type = 'merge';
  readonly category = 'logic';
  readonly description =
    'Combines outputs from multiple upstream nodes into a single output';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const {
      mode = 'combine',
      sources = [],
      mergeKey,
    } = config;

    // Collect the outputs from the source nodes
    let sourceOutputs: Record<string, any> = {};

    if (sources.length > 0) {
      for (const sourceId of sources) {
        const output = context.nodeOutputs.get(sourceId);
        if (output !== undefined) {
          sourceOutputs[sourceId] = output;
        }
      }
    } else {
      // Use all available inputs (everything passed from upstream)
      sourceOutputs = { ...inputs };
    }

    switch (mode) {
      case 'combine':
        return this.combineMode(sourceOutputs);

      case 'append':
        return this.appendMode(sourceOutputs);

      case 'merge_by_key':
        if (!mergeKey) {
          throw new Error(
            'Merge node: "mergeKey" is required when using merge_by_key mode',
          );
        }
        return this.mergeByKeyMode(sourceOutputs, mergeKey);

      case 'zip':
        return this.zipMode(sourceOutputs);

      case 'wait_all':
        return this.waitAllMode(sourceOutputs);

      default:
        throw new Error(`Merge node: unknown mode "${mode}"`);
    }
  }

  /**
   * Combine mode: merge all source outputs into a single flat object.
   * Conflicting keys are overwritten by the last source.
   */
  private combineMode(
    sourceOutputs: Record<string, any>,
  ): Record<string, any> {
    const combined: Record<string, any> = {};
    for (const [sourceId, output] of Object.entries(sourceOutputs)) {
      if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
        Object.assign(combined, output);
      } else {
        combined[sourceId] = output;
      }
    }
    return {
      mode: 'combine',
      data: combined,
      sourceCount: Object.keys(sourceOutputs).length,
    };
  }

  /**
   * Append mode: concatenate all source outputs into a single array.
   */
  private appendMode(
    sourceOutputs: Record<string, any>,
  ): Record<string, any> {
    const items: any[] = [];
    for (const output of Object.values(sourceOutputs)) {
      if (Array.isArray(output)) {
        items.push(...output);
      } else if (
        typeof output === 'object' &&
        output !== null &&
        Array.isArray(output.data)
      ) {
        items.push(...output.data);
      } else {
        items.push(output);
      }
    }
    return {
      mode: 'append',
      data: items,
      totalItems: items.length,
      sourceCount: Object.keys(sourceOutputs).length,
    };
  }

  /**
   * Merge-by-key mode: join arrays from different sources on a common key.
   */
  private mergeByKeyMode(
    sourceOutputs: Record<string, any>,
    mergeKey: string,
  ): Record<string, any> {
    const merged = new Map<any, Record<string, any>>();

    for (const [sourceId, output] of Object.entries(sourceOutputs)) {
      const items = Array.isArray(output)
        ? output
        : Array.isArray(output?.data)
          ? output.data
          : [output];

      for (const item of items) {
        if (item && typeof item === 'object') {
          const keyValue = item[mergeKey];
          if (keyValue !== undefined) {
            const existing = merged.get(keyValue) || {};
            merged.set(keyValue, { ...existing, ...item, __sources: [...(existing.__sources || []), sourceId] });
          }
        }
      }
    }

    const data = [...merged.values()];
    return {
      mode: 'merge_by_key',
      mergeKey,
      data,
      totalItems: data.length,
      sourceCount: Object.keys(sourceOutputs).length,
    };
  }

  /**
   * Zip mode: pair items from sources by index position.
   */
  private zipMode(
    sourceOutputs: Record<string, any>,
  ): Record<string, any> {
    const arrays: any[][] = [];
    const sourceIds: string[] = [];

    for (const [sourceId, output] of Object.entries(sourceOutputs)) {
      const items = Array.isArray(output) ? output : [output];
      arrays.push(items);
      sourceIds.push(sourceId);
    }

    const maxLength = Math.max(...arrays.map((a) => a.length), 0);
    const zipped: Record<string, any>[] = [];

    for (let i = 0; i < maxLength; i++) {
      const entry: Record<string, any> = { index: i };
      sourceIds.forEach((sourceId, j) => {
        entry[sourceId] = arrays[j]?.[i] ?? null;
      });
      zipped.push(entry);
    }

    return {
      mode: 'zip',
      data: zipped,
      totalItems: zipped.length,
      sourceCount: sourceIds.length,
    };
  }

  /**
   * Wait-all mode: simply returns all outputs keyed by source node ID.
   */
  private waitAllMode(
    sourceOutputs: Record<string, any>,
  ): Record<string, any> {
    return {
      mode: 'wait_all',
      data: sourceOutputs,
      sourceCount: Object.keys(sourceOutputs).length,
    };
  }

  validate(config: Record<string, any>): boolean {
    const validModes = [
      'combine', 'append', 'merge_by_key', 'zip', 'wait_all',
    ];
    if (config.mode && !validModes.includes(config.mode)) return false;
    if (config.mode === 'merge_by_key' && !config.mergeKey) return false;
    return true;
  }
}
