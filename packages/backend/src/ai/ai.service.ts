import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface NodeSuggestion {
  type: string;
  label: string;
  description: string;
  reason: string;
  config: Record<string, unknown>;
}

interface OptimizationSuggestion {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details: string;
  affectedNodes?: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Generate a workflow from a natural language description.
   * Returns a mock workflow definition with nodes and edges.
   */
  async generateWorkflow(description: string): Promise<GeneratedWorkflow> {
    this.logger.log(`Generating workflow from description: "${description}"`);

    const lowerDesc = description.toLowerCase();

    // Analyze the description to determine workflow type
    if (lowerDesc.includes('email') && lowerDesc.includes('notification')) {
      return this.generateEmailNotificationWorkflow(description);
    }

    if (lowerDesc.includes('api') || lowerDesc.includes('http')) {
      return this.generateApiIntegrationWorkflow(description);
    }

    if (lowerDesc.includes('data') && (lowerDesc.includes('transform') || lowerDesc.includes('process'))) {
      return this.generateDataProcessingWorkflow(description);
    }

    if (lowerDesc.includes('schedule') || lowerDesc.includes('cron') || lowerDesc.includes('periodic')) {
      return this.generateScheduledWorkflow(description);
    }

    if (lowerDesc.includes('webhook')) {
      return this.generateWebhookWorkflow(description);
    }

    // Default: generic workflow
    return this.generateGenericWorkflow(description);
  }

  /**
   * Suggest next nodes based on the current workflow state.
   */
  async suggestNodes(
    currentNodes: WorkflowNode[],
    currentEdges: WorkflowEdge[],
  ): Promise<NodeSuggestion[]> {
    this.logger.log(
      `Suggesting nodes for workflow with ${currentNodes.length} nodes`,
    );

    const suggestions: NodeSuggestion[] = [];
    const nodeTypes = new Set(currentNodes.map((n) => n.type));

    // Find leaf nodes (nodes that have no outgoing edges)
    const sourceNodeIds = new Set(currentEdges.map((e) => e.sourceNodeId));
    const leafNodes = currentNodes.filter((n) => !sourceNodeIds.has(n.id));
    const lastNodeType = leafNodes.length > 0 ? leafNodes[0].type : null;

    // Suggest based on the last node type
    if (lastNodeType === 'http-request') {
      suggestions.push(
        {
          type: 'if-condition',
          label: 'Check Response Status',
          description: 'Add a condition to check the HTTP response status code.',
          reason: 'HTTP requests often need response validation.',
          config: { field: '{{previousNode.statusCode}}', operator: 'equals', value: '200' },
        },
        {
          type: 'transform',
          label: 'Transform Response',
          description: 'Transform the API response data into a desired format.',
          reason: 'API responses often need to be mapped to a different structure.',
          config: {},
        },
      );
    }

    if (lastNodeType === 'if-condition' || lastNodeType === 'switch') {
      suggestions.push(
        {
          type: 'email',
          label: 'Send Notification',
          description: 'Send an email notification based on the condition result.',
          reason: 'Conditional branches often end with notifications.',
          config: {},
        },
        {
          type: 'set-variable',
          label: 'Set Status Variable',
          description: 'Store the result of the condition for later use.',
          reason: 'Condition outcomes are often needed downstream.',
          config: {},
        },
      );
    }

    if (lastNodeType === 'trigger-webhook' || lastNodeType === 'trigger-cron') {
      suggestions.push(
        {
          type: 'http-request',
          label: 'Fetch Data',
          description: 'Make an HTTP request to fetch data from an external API.',
          reason: 'Triggers typically kick off data retrieval.',
          config: { method: 'GET', url: '' },
        },
        {
          type: 'code',
          label: 'Process Input',
          description: 'Run custom code to process the trigger input.',
          reason: 'Trigger data often needs preprocessing.',
          config: {},
        },
      );
    }

    // General suggestions if we have few nodes
    if (!nodeTypes.has('if-condition') && currentNodes.length >= 2) {
      suggestions.push({
        type: 'if-condition',
        label: 'Add Condition',
        description: 'Add conditional branching to your workflow.',
        reason: 'Your workflow could benefit from conditional logic.',
        config: {},
      });
    }

    if (!nodeTypes.has('email') && currentNodes.length >= 3) {
      suggestions.push({
        type: 'email',
        label: 'Email Notification',
        description: 'Send an email notification when the workflow completes.',
        reason: 'Workflows often need to notify stakeholders of results.',
        config: {},
      });
    }

    // Error handling suggestion
    if (currentNodes.length >= 2 && !nodeTypes.has('if-condition')) {
      suggestions.push({
        type: 'if-condition',
        label: 'Error Handler',
        description: 'Add error handling to check for failures.',
        reason: 'Error handling improves workflow reliability.',
        config: { field: '{{previousNode.error}}', operator: 'is_not_empty', value: '' },
      });
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Explain an error in human-readable terms.
   */
  async explainError(
    error: string,
    nodeType: string,
    config: Record<string, unknown>,
  ): Promise<{
    explanation: string;
    possibleCauses: string[];
    suggestedFixes: string[];
  }> {
    this.logger.log(`Explaining error for node type "${nodeType}": ${error}`);

    const lowerError = error.toLowerCase();

    // HTTP request errors
    if (nodeType === 'http-request') {
      if (lowerError.includes('timeout') || lowerError.includes('econnrefused')) {
        return {
          explanation: `The HTTP request to "${config.url || 'the configured URL'}" failed because the remote server did not respond in time or refused the connection.`,
          possibleCauses: [
            'The target server is down or unreachable.',
            'The URL is incorrect or has a typo.',
            'A firewall is blocking the outgoing connection.',
            'The request timeout is set too low for the endpoint.',
          ],
          suggestedFixes: [
            'Verify the URL is correct and the server is running.',
            'Check network connectivity and firewall rules.',
            'Increase the timeout value in the node configuration.',
            'Try accessing the URL manually to confirm it is reachable.',
          ],
        };
      }

      if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
        return {
          explanation: 'The HTTP request was rejected because the server requires authentication and the provided credentials were invalid or missing.',
          possibleCauses: [
            'The API key or token is expired or revoked.',
            'The Authorization header is missing or malformed.',
            'The credentials do not have permission for this endpoint.',
          ],
          suggestedFixes: [
            'Check that the correct credentials are configured in the node.',
            'Verify the API key or token is still valid.',
            'Ensure the Authorization header format matches what the API expects.',
            'Regenerate the API key if it may have been compromised.',
          ],
        };
      }

      if (lowerError.includes('404') || lowerError.includes('not found')) {
        return {
          explanation: `The HTTP request returned a 404 Not Found error. The resource at "${config.url || 'the configured URL'}" does not exist.`,
          possibleCauses: [
            'The URL path is incorrect.',
            'The resource has been deleted or moved.',
            'The API version in the URL may be outdated.',
          ],
          suggestedFixes: [
            'Double-check the URL for typos.',
            'Consult the API documentation for the correct endpoint.',
            'Verify the resource ID or path parameters are correct.',
          ],
        };
      }
    }

    // Code node errors
    if (nodeType === 'code') {
      if (lowerError.includes('syntaxerror') || lowerError.includes('unexpected token')) {
        return {
          explanation: 'The custom code in this node contains a syntax error and cannot be executed.',
          possibleCauses: [
            'Missing or extra brackets, parentheses, or braces.',
            'Unterminated string literal.',
            'Invalid JavaScript/TypeScript syntax.',
          ],
          suggestedFixes: [
            'Review the code for missing closing brackets or parentheses.',
            'Check for unclosed string quotes.',
            'Test the code in a standalone environment first.',
            'Use a linter to identify syntax issues.',
          ],
        };
      }

      if (lowerError.includes('referenceerror') || lowerError.includes('is not defined')) {
        return {
          explanation: 'The code references a variable or function that has not been declared.',
          possibleCauses: [
            'A variable name is misspelled.',
            'The variable was declared in a different scope.',
            'A required module or import is missing.',
          ],
          suggestedFixes: [
            'Check the spelling of all variable and function names.',
            'Ensure variables are declared before use.',
            'Verify that input data from previous nodes is available.',
          ],
        };
      }
    }

    // Email node errors
    if (nodeType === 'email') {
      if (lowerError.includes('smtp') || lowerError.includes('mail')) {
        return {
          explanation: 'The email could not be sent due to an SMTP server connection or authentication issue.',
          possibleCauses: [
            'SMTP server credentials are incorrect.',
            'The SMTP server is unreachable.',
            'TLS/SSL configuration mismatch.',
            'The email address is invalid or blocked.',
          ],
          suggestedFixes: [
            'Verify the SMTP server host, port, and credentials.',
            'Check if TLS is required and properly configured.',
            'Ensure the sender email address is authorized.',
            'Try connecting to the SMTP server manually to test.',
          ],
        };
      }
    }

    // Generic fallback
    return {
      explanation: `The "${nodeType}" node encountered an error: ${error}`,
      possibleCauses: [
        'Invalid or missing configuration for this node.',
        'Input data from a previous node is in an unexpected format.',
        'An external service or dependency is unavailable.',
        'A runtime error occurred during node execution.',
      ],
      suggestedFixes: [
        'Review the node configuration for missing required fields.',
        'Check the input data format matches what this node expects.',
        'Verify external service connectivity and credentials.',
        'Enable "Continue on Error" if this node is non-critical.',
        'Check the execution logs for more detailed error information.',
      ],
    };
  }

  /**
   * Analyze a workflow and suggest optimizations.
   */
  async optimizeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): Promise<OptimizationSuggestion[]> {
    this.logger.log(
      `Analyzing workflow with ${nodes.length} nodes and ${edges.length} edges for optimization`,
    );

    const suggestions: OptimizationSuggestion[] = [];

    // Check for sequential HTTP requests that could be parallelized
    const httpNodes = nodes.filter((n) => n.type === 'http-request');
    if (httpNodes.length >= 2) {
      // Find HTTP nodes in a chain with no dependencies between them
      const chainedHttp: string[] = [];
      for (let i = 0; i < httpNodes.length - 1; i++) {
        const edge = edges.find(
          (e) =>
            e.sourceNodeId === httpNodes[i].id &&
            e.targetNodeId === httpNodes[i + 1].id,
        );
        if (edge) {
          chainedHttp.push(httpNodes[i].id, httpNodes[i + 1].id);
        }
      }

      if (chainedHttp.length >= 2) {
        suggestions.push({
          type: 'parallelization',
          severity: 'info',
          message: 'Sequential HTTP requests could be parallelized',
          details:
            'Multiple HTTP request nodes are chained sequentially. If they do not depend on each other\'s output, consider running them in parallel to reduce total execution time.',
          affectedNodes: [...new Set(chainedHttp)],
        });
      }
    }

    // Check for missing error handling
    const hasErrorHandling = nodes.some(
      (n) =>
        n.type === 'if-condition' &&
        JSON.stringify(n.config).includes('error'),
    );
    if (!hasErrorHandling && nodes.length >= 3) {
      suggestions.push({
        type: 'error-handling',
        severity: 'warning',
        message: 'No error handling detected',
        details:
          'This workflow does not appear to have error handling nodes. Consider adding condition nodes to check for errors after critical operations like HTTP requests or code execution.',
      });
    }

    // Check for nodes without any connections
    const connectedNodeIds = new Set([
      ...edges.map((e) => e.sourceNodeId),
      ...edges.map((e) => e.targetNodeId),
    ]);
    const disconnectedNodes = nodes.filter(
      (n) => !connectedNodeIds.has(n.id) && nodes.length > 1,
    );

    if (disconnectedNodes.length > 0) {
      suggestions.push({
        type: 'disconnected-nodes',
        severity: 'error',
        message: `${disconnectedNodes.length} disconnected node(s) found`,
        details:
          'Some nodes are not connected to the workflow graph. They will never execute. Connect them or remove them.',
        affectedNodes: disconnectedNodes.map((n) => n.id),
      });
    }

    // Check for very long linear chains
    if (nodes.length > 10) {
      const linearChainLength = this.findLongestLinearChain(nodes, edges);
      if (linearChainLength > 8) {
        suggestions.push({
          type: 'complexity',
          severity: 'info',
          message: 'Long linear chain detected',
          details:
            `This workflow has a linear chain of ${linearChainLength} nodes. Consider breaking it into smaller sub-workflows or using parallel branches where possible.`,
        });
      }
    }

    // Check for delay nodes that could be replaced with schedules
    const delayNodes = nodes.filter((n) => n.type === 'delay');
    if (delayNodes.length > 0) {
      for (const delayNode of delayNodes) {
        const delayMs = (delayNode.config.delayMs as number) || 0;
        if (delayMs > 60000) {
          suggestions.push({
            type: 'scheduling',
            severity: 'info',
            message: 'Long delay could use scheduled triggers',
            details:
              `The delay node "${delayNode.label}" waits for ${Math.round(delayMs / 1000)}s. For delays longer than 1 minute, consider splitting the workflow and using a scheduled trigger instead.`,
            affectedNodes: [delayNode.id],
          });
        }
      }
    }

    // Check for duplicate node configurations
    const configHashes = new Map<string, string[]>();
    for (const node of nodes) {
      const hash = JSON.stringify({ type: node.type, config: node.config });
      if (!configHashes.has(hash)) {
        configHashes.set(hash, []);
      }
      configHashes.get(hash)!.push(node.id);
    }

    for (const [, nodeIds] of configHashes) {
      if (nodeIds.length > 1) {
        suggestions.push({
          type: 'deduplication',
          severity: 'info',
          message: 'Duplicate node configurations detected',
          details:
            'Multiple nodes have identical type and configuration. Consider merging them or using a loop node to reduce redundancy.',
          affectedNodes: nodeIds,
        });
      }
    }

    // Suggest adding a notification at the end
    const targetNodeIds = new Set(edges.map((e) => e.targetNodeId));
    const terminalNodes = nodes.filter((n) => !edges.some((e) => e.sourceNodeId === n.id));
    const hasNotification = terminalNodes.some(
      (n) => n.type === 'email' || n.type === 'slack',
    );

    if (!hasNotification && nodes.length >= 3) {
      suggestions.push({
        type: 'notification',
        severity: 'info',
        message: 'Consider adding completion notification',
        details:
          'This workflow does not end with a notification node. Adding an email or messaging notification at the end helps track workflow completion.',
      });
    }

    return suggestions;
  }

  // -------------------------------------------------------
  // Private helper methods for workflow generation
  // -------------------------------------------------------

  private generateEmailNotificationWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const conditionId = uuid();
    const emailId = uuid();
    const logId = uuid();

    return {
      name: 'Email Notification Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-webhook',
          label: 'Webhook Trigger',
          config: { path: '/notifications' },
          position: { x: 100, y: 200 },
        },
        {
          id: conditionId,
          type: 'if-condition',
          label: 'Check Priority',
          config: {
            field: '{{trigger.priority}}',
            operator: 'equals',
            value: 'high',
          },
          position: { x: 400, y: 200 },
        },
        {
          id: emailId,
          type: 'email',
          label: 'Send Email',
          config: {
            to: '{{trigger.recipient}}',
            subject: '{{trigger.subject}}',
            body: '{{trigger.message}}',
          },
          position: { x: 700, y: 100 },
        },
        {
          id: logId,
          type: 'set-variable',
          label: 'Log Result',
          config: {
            variableName: 'notificationStatus',
            value: 'sent',
          },
          position: { x: 1000, y: 200 },
        },
      ],
      edges: [
        {
          id: uuid(),
          sourceNodeId: triggerId,
          targetNodeId: conditionId,
        },
        {
          id: uuid(),
          sourceNodeId: conditionId,
          targetNodeId: emailId,
          sourceHandle: 'true',
        },
        {
          id: uuid(),
          sourceNodeId: emailId,
          targetNodeId: logId,
        },
      ],
    };
  }

  private generateApiIntegrationWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const httpId = uuid();
    const transformId = uuid();
    const conditionId = uuid();
    const successId = uuid();
    const errorId = uuid();

    return {
      name: 'API Integration Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-cron',
          label: 'Schedule Trigger',
          config: { cronExpression: '0 */6 * * *' },
          position: { x: 100, y: 200 },
        },
        {
          id: httpId,
          type: 'http-request',
          label: 'Fetch API Data',
          config: {
            method: 'GET',
            url: 'https://api.example.com/data',
            headers: { 'Content-Type': 'application/json' },
          },
          position: { x: 400, y: 200 },
        },
        {
          id: transformId,
          type: 'transform',
          label: 'Transform Response',
          config: {
            mapping: { items: '{{httpNode.data.results}}' },
          },
          position: { x: 700, y: 200 },
        },
        {
          id: conditionId,
          type: 'if-condition',
          label: 'Check Status',
          config: {
            field: '{{httpNode.statusCode}}',
            operator: 'equals',
            value: '200',
          },
          position: { x: 1000, y: 200 },
        },
        {
          id: successId,
          type: 'set-variable',
          label: 'Set Success',
          config: { variableName: 'status', value: 'success' },
          position: { x: 1300, y: 100 },
        },
        {
          id: errorId,
          type: 'email',
          label: 'Notify Error',
          config: {
            to: 'admin@example.com',
            subject: 'API Integration Failed',
            body: 'The API returned an error: {{httpNode.error}}',
          },
          position: { x: 1300, y: 300 },
        },
      ],
      edges: [
        { id: uuid(), sourceNodeId: triggerId, targetNodeId: httpId },
        { id: uuid(), sourceNodeId: httpId, targetNodeId: transformId },
        { id: uuid(), sourceNodeId: transformId, targetNodeId: conditionId },
        {
          id: uuid(),
          sourceNodeId: conditionId,
          targetNodeId: successId,
          sourceHandle: 'true',
        },
        {
          id: uuid(),
          sourceNodeId: conditionId,
          targetNodeId: errorId,
          sourceHandle: 'false',
        },
      ],
    };
  }

  private generateDataProcessingWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const fetchId = uuid();
    const filterId = uuid();
    const transformId = uuid();
    const loopId = uuid();
    const outputId = uuid();

    return {
      name: 'Data Processing Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-webhook',
          label: 'Data Input Trigger',
          config: { path: '/process-data' },
          position: { x: 100, y: 200 },
        },
        {
          id: fetchId,
          type: 'http-request',
          label: 'Fetch Source Data',
          config: {
            method: 'GET',
            url: '{{trigger.sourceUrl}}',
          },
          position: { x: 400, y: 200 },
        },
        {
          id: filterId,
          type: 'filter',
          label: 'Filter Records',
          config: {
            field: 'status',
            operator: 'equals',
            value: 'active',
          },
          position: { x: 700, y: 200 },
        },
        {
          id: transformId,
          type: 'transform',
          label: 'Transform Data',
          config: {
            mapping: {
              id: '{{item.id}}',
              name: '{{item.fullName}}',
              email: '{{item.emailAddress}}',
            },
          },
          position: { x: 1000, y: 200 },
        },
        {
          id: loopId,
          type: 'loop',
          label: 'Process Each Item',
          config: {
            itemsPath: '{{transformedData}}',
            batchSize: 10,
          },
          position: { x: 1300, y: 200 },
        },
        {
          id: outputId,
          type: 'set-variable',
          label: 'Set Result',
          config: {
            variableName: 'processedCount',
            value: '{{loop.processedItems.length}}',
          },
          position: { x: 1600, y: 200 },
        },
      ],
      edges: [
        { id: uuid(), sourceNodeId: triggerId, targetNodeId: fetchId },
        { id: uuid(), sourceNodeId: fetchId, targetNodeId: filterId },
        { id: uuid(), sourceNodeId: filterId, targetNodeId: transformId },
        { id: uuid(), sourceNodeId: transformId, targetNodeId: loopId },
        { id: uuid(), sourceNodeId: loopId, targetNodeId: outputId },
      ],
    };
  }

  private generateScheduledWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const codeId = uuid();
    const conditionId = uuid();
    const notifyId = uuid();

    return {
      name: 'Scheduled Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-cron',
          label: 'Scheduled Trigger',
          config: { cronExpression: '0 9 * * 1-5' },
          position: { x: 100, y: 200 },
        },
        {
          id: codeId,
          type: 'code',
          label: 'Run Task',
          config: {
            language: 'javascript',
            code: '// Add your scheduled task logic here\nreturn { result: "completed", timestamp: new Date().toISOString() };',
          },
          position: { x: 400, y: 200 },
        },
        {
          id: conditionId,
          type: 'if-condition',
          label: 'Check Result',
          config: {
            field: '{{codeNode.result}}',
            operator: 'equals',
            value: 'completed',
          },
          position: { x: 700, y: 200 },
        },
        {
          id: notifyId,
          type: 'email',
          label: 'Send Report',
          config: {
            to: 'team@example.com',
            subject: 'Scheduled Task Report',
            body: 'Task completed at {{codeNode.timestamp}}',
          },
          position: { x: 1000, y: 200 },
        },
      ],
      edges: [
        { id: uuid(), sourceNodeId: triggerId, targetNodeId: codeId },
        { id: uuid(), sourceNodeId: codeId, targetNodeId: conditionId },
        {
          id: uuid(),
          sourceNodeId: conditionId,
          targetNodeId: notifyId,
          sourceHandle: 'true',
        },
      ],
    };
  }

  private generateWebhookWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const validateId = uuid();
    const processId = uuid();
    const respondId = uuid();

    return {
      name: 'Webhook Handler Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-webhook',
          label: 'Webhook Trigger',
          config: { path: '/incoming', method: 'POST' },
          position: { x: 100, y: 200 },
        },
        {
          id: validateId,
          type: 'if-condition',
          label: 'Validate Payload',
          config: {
            field: '{{trigger.body}}',
            operator: 'is_not_empty',
            value: '',
          },
          position: { x: 400, y: 200 },
        },
        {
          id: processId,
          type: 'code',
          label: 'Process Data',
          config: {
            language: 'javascript',
            code: '// Process the webhook payload\nconst data = inputs.body;\nreturn { processed: true, data };',
          },
          position: { x: 700, y: 200 },
        },
        {
          id: respondId,
          type: 'set-variable',
          label: 'Set Response',
          config: {
            variableName: 'webhookResponse',
            value: '{ "status": "received", "processed": true }',
          },
          position: { x: 1000, y: 200 },
        },
      ],
      edges: [
        { id: uuid(), sourceNodeId: triggerId, targetNodeId: validateId },
        {
          id: uuid(),
          sourceNodeId: validateId,
          targetNodeId: processId,
          sourceHandle: 'true',
        },
        { id: uuid(), sourceNodeId: processId, targetNodeId: respondId },
      ],
    };
  }

  private generateGenericWorkflow(
    description: string,
  ): GeneratedWorkflow {
    const triggerId = uuid();
    const processId = uuid();
    const outputId = uuid();

    return {
      name: 'New Workflow',
      description,
      nodes: [
        {
          id: triggerId,
          type: 'trigger-webhook',
          label: 'Trigger',
          config: { path: '/start' },
          position: { x: 100, y: 200 },
        },
        {
          id: processId,
          type: 'code',
          label: 'Process',
          config: {
            language: 'javascript',
            code: '// Add your processing logic\nreturn { success: true };',
          },
          position: { x: 400, y: 200 },
        },
        {
          id: outputId,
          type: 'set-variable',
          label: 'Output',
          config: {
            variableName: 'result',
            value: '{{processNode.success}}',
          },
          position: { x: 700, y: 200 },
        },
      ],
      edges: [
        { id: uuid(), sourceNodeId: triggerId, targetNodeId: processId },
        { id: uuid(), sourceNodeId: processId, targetNodeId: outputId },
      ],
    };
  }

  /**
   * Find the longest linear chain of nodes in the workflow graph.
   */
  private findLongestLinearChain(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): number {
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      inDegree.set(
        edge.targetNodeId,
        (inDegree.get(edge.targetNodeId) || 0) + 1,
      );
    }

    // Find start nodes (in-degree 0)
    const startNodes = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);

    let maxChain = 0;

    const dfs = (nodeId: string, depth: number) => {
      maxChain = Math.max(maxChain, depth);
      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1);
      }
    };

    for (const start of startNodes) {
      dfs(start.id, 1);
    }

    return maxChain;
  }
}
