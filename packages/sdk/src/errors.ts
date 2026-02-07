/**
 * Thrown when node configuration or input validation fails.
 */
export class ValidationError extends Error {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;

    // Restore prototype chain (necessary when extending built-ins in TS)
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Thrown when a node fails during execution.
 * The `retryable` flag indicates whether the workflow engine should
 * attempt to re-execute this node automatically.
 */
export class ExecutionError extends Error {
  public readonly retryable: boolean;
  public readonly nodeType?: string;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      retryable?: boolean;
      nodeType?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ExecutionError';
    this.retryable = options.retryable ?? false;
    this.nodeType = options.nodeType;
    this.cause = options.cause;

    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}

/**
 * Thrown when there is a problem with the node or plugin configuration
 * (e.g. missing required config fields, invalid schema).
 */
export class ConfigError extends Error {
  public readonly field?: string;
  public readonly expected?: string;

  constructor(
    message: string,
    options: {
      field?: string;
      expected?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ConfigError';
    this.field = options.field;
    this.expected = options.expected;

    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}
