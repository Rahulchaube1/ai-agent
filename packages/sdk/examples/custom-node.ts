/**
 * FlowForge SDK - Example Custom Nodes & Plugin
 *
 * This file demonstrates three patterns:
 *   1. Creating a node with the `createNode()` factory (Slack notification)
 *   2. Creating a node by extending `BaseNode` (GitHub star node)
 *   3. Bundling nodes into a plugin with `createPlugin()`
 */

import {
  createNode,
  createPlugin,
  BaseNode,
  NodeCategory,
  NodeInput,
  NodeOutput,
  NodeConfig,
  ExecutionContext,
  ExecutionError,
  ValidationError,
} from '../src';

// ---------------------------------------------------------------------------
// 1. Slack Notification Node  (factory pattern)
// ---------------------------------------------------------------------------

const slackNotificationNode = createNode({
  type: 'slack-send-message',
  name: 'Slack Send Message',
  description: 'Sends a message to a Slack channel via the Slack Web API',
  category: 'integration',
  icon: 'slack',
  version: '1.0.0',

  inputs: [
    {
      name: 'message',
      type: 'string',
      required: true,
      description: 'The message text to send (supports Slack mrkdwn)',
    },
    {
      name: 'channelOverride',
      type: 'string',
      required: false,
      description: 'Optional channel override (uses config channel by default)',
    },
  ],

  outputs: [
    { name: 'response', type: 'object', description: 'Slack API response' },
    { name: 'messageId', type: 'string', description: 'Timestamp ID of the posted message' },
  ],

  config: {
    fields: [
      {
        name: 'channel',
        label: 'Channel',
        type: 'string',
        required: true,
        placeholder: '#general',
        description: 'Default Slack channel to post to',
      },
      {
        name: 'username',
        label: 'Bot Username',
        type: 'string',
        required: false,
        default: 'FlowForge Bot',
        description: 'Display name for the bot',
      },
      {
        name: 'iconEmoji',
        label: 'Icon Emoji',
        type: 'string',
        required: false,
        default: ':robot_face:',
        placeholder: ':rocket:',
        description: 'Emoji to use as the bot avatar',
      },
      {
        name: 'unfurlLinks',
        label: 'Unfurl Links',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Whether to expand URL previews',
      },
    ],
  },

  async execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const channel = (inputs.channelOverride as string) || (config.channel as string);
    const message = inputs.message as string;
    const token = context.credentials?.['slack_bot_token'];

    if (!token) {
      throw new ExecutionError('Slack bot token is not configured in credentials.', {
        retryable: false,
        nodeType: 'slack-send-message',
      });
    }

    context.logger.info(`Sending message to ${channel}`);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: message,
        username: config.username ?? 'FlowForge Bot',
        icon_emoji: config.iconEmoji ?? ':robot_face:',
        unfurl_links: config.unfurlLinks ?? true,
      }),
    });

    if (!response.ok) {
      throw new ExecutionError(
        `Slack API returned HTTP ${response.status}: ${response.statusText}`,
        { retryable: response.status >= 500, nodeType: 'slack-send-message' }
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!data.ok) {
      throw new ExecutionError(`Slack API error: ${data.error as string}`, {
        retryable: false,
        nodeType: 'slack-send-message',
      });
    }

    context.logger.info(`Message posted successfully: ${data.ts as string}`);

    return {
      response: data,
      messageId: data.ts as string,
    };
  },

  validate(config: Record<string, unknown>): void {
    const channel = config.channel as string | undefined;
    if (!channel || channel.trim().length === 0) {
      throw new ValidationError('Channel is required', 'channel', channel);
    }
    if (!channel.startsWith('#') && !channel.startsWith('C')) {
      throw new ValidationError(
        'Channel must start with "#" (name) or "C" (ID)',
        'channel',
        channel
      );
    }
  },
});

// ---------------------------------------------------------------------------
// 2. GitHub Star Node  (class-based pattern)
// ---------------------------------------------------------------------------

class GitHubStarNode extends BaseNode {
  type = 'github-star-repo';
  name = 'GitHub Star Repository';
  description = 'Stars or unstars a GitHub repository using the GitHub REST API';
  category: NodeCategory = 'integration';
  icon = 'github';
  version = '1.0.0';

  inputs: NodeInput[] = [
    {
      name: 'owner',
      type: 'string',
      required: true,
      description: 'Repository owner (user or organisation)',
    },
    {
      name: 'repo',
      type: 'string',
      required: true,
      description: 'Repository name',
    },
  ];

  outputs: NodeOutput[] = [
    { name: 'success', type: 'boolean', description: 'Whether the operation succeeded' },
    { name: 'starred', type: 'boolean', description: 'Current star state after the operation' },
  ];

  config: NodeConfig = {
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        default: 'star',
        options: [
          { label: 'Star', value: 'star' },
          { label: 'Unstar', value: 'unstar' },
        ],
        description: 'Whether to star or unstar the repository',
      },
    ],
  };

  async execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const owner = inputs.owner as string;
    const repo = inputs.repo as string;
    const action = (config.action as string) || 'star';
    const token = context.credentials?.['github_token'];

    if (!token) {
      throw new ExecutionError('GitHub personal access token is not configured.', {
        retryable: false,
        nodeType: this.type,
      });
    }

    const url = `https://api.github.com/user/starred/${owner}/${repo}`;
    const method = action === 'star' ? 'PUT' : 'DELETE';

    context.logger.info(`${action === 'star' ? 'Starring' : 'Unstarring'} ${owner}/${repo}`);

    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new ExecutionError(
        `GitHub API returned HTTP ${response.status}: ${response.statusText}`,
        {
          retryable: response.status >= 500 || response.status === 429,
          nodeType: this.type,
        }
      );
    }

    const starred = action === 'star';
    context.logger.info(`Repository ${owner}/${repo} is now ${starred ? 'starred' : 'unstarred'}`);

    return {
      success: true,
      starred,
    };
  }

  override validate(config: Record<string, unknown>): void {
    // Run the base required-field checks first
    super.validate(config);

    const action = config.action as string | undefined;
    if (action && !['star', 'unstar'].includes(action)) {
      throw new ValidationError(
        'Action must be either "star" or "unstar"',
        'action',
        action
      );
    }
  }
}

const gitHubStarNode = new GitHubStarNode();

// ---------------------------------------------------------------------------
// 3. Plugin Bundle
// ---------------------------------------------------------------------------

const integrationPlugin = createPlugin({
  name: '@flowforge/integration-pack',
  version: '1.0.0',
  description: 'A collection of integration nodes for Slack and GitHub',
  author: 'FlowForge Team',
  icon: 'puzzle-piece',
  nodes: [slackNotificationNode, gitHubStarNode],

  async onInstall() {
    console.log('[integration-pack] Plugin installed successfully.');
  },

  async onUninstall() {
    console.log('[integration-pack] Plugin uninstalled. Cleaning up resources...');
  },
});

// ---------------------------------------------------------------------------
// Exports (useful when this file is consumed as a module)
// ---------------------------------------------------------------------------

export { slackNotificationNode, gitHubStarNode, integrationPlugin };
