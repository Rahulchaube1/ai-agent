import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PluginsService {
  private readonly logger = new Logger(PluginsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all plugins, optionally filtered by organization.
   */
  async findAll(query?: {
    organizationId?: string;
    category?: string;
    isEnabled?: boolean;
  }) {
    const where: Record<string, unknown> = {};

    if (query?.organizationId) {
      where.OR = [
        { organizationId: query.organizationId },
        { organizationId: null },
      ];
    }

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    return this.prisma.plugin.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single plugin by ID.
   */
  async findOne(id: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`);
    }

    return plugin;
  }

  /**
   * Enable a plugin for an organization.
   */
  async enable(id: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`);
    }

    if (plugin.isEnabled) {
      throw new ConflictException(`Plugin "${plugin.name}" is already enabled`);
    }

    const updated = await this.prisma.plugin.update({
      where: { id },
      data: { isEnabled: true },
    });

    this.logger.log(`Plugin "${plugin.name}" (${id}) enabled`);
    return updated;
  }

  /**
   * Disable a plugin.
   */
  async disable(id: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      throw new NotFoundException(`Plugin with ID ${id} not found`);
    }

    if (!plugin.isEnabled) {
      throw new ConflictException(
        `Plugin "${plugin.name}" is already disabled`,
      );
    }

    const updated = await this.prisma.plugin.update({
      where: { id },
      data: { isEnabled: false },
    });

    this.logger.log(`Plugin "${plugin.name}" (${id}) disabled`);
    return updated;
  }

  /**
   * Get the plugin marketplace listing.
   * Returns a curated list of available plugins with metadata.
   */
  getMarketplace() {
    return {
      featured: [
        {
          slug: 'slack-integration',
          name: 'Slack Integration',
          version: '1.2.0',
          description:
            'Send messages, receive events, and interact with Slack workspaces from your workflows.',
          author: 'FlowForge',
          icon: 'slack',
          category: 'communication',
          downloads: 12450,
          rating: 4.8,
        },
        {
          slug: 'github-integration',
          name: 'GitHub Integration',
          version: '2.0.1',
          description:
            'Automate GitHub workflows: create issues, manage PRs, trigger deployments, and more.',
          author: 'FlowForge',
          icon: 'github',
          category: 'developer-tools',
          downloads: 9870,
          rating: 4.7,
        },
        {
          slug: 'openai-connector',
          name: 'OpenAI Connector',
          version: '1.5.0',
          description:
            'Integrate GPT models, DALL-E, and Whisper into your automation workflows.',
          author: 'FlowForge',
          icon: 'openai',
          category: 'ai',
          downloads: 15200,
          rating: 4.9,
        },
      ],
      categories: [
        {
          slug: 'communication',
          name: 'Communication',
          count: 8,
          plugins: [
            {
              slug: 'slack-integration',
              name: 'Slack Integration',
              version: '1.2.0',
              description: 'Send messages and interact with Slack workspaces.',
              author: 'FlowForge',
              category: 'communication',
            },
            {
              slug: 'email-advanced',
              name: 'Advanced Email',
              version: '1.0.3',
              description:
                'HTML templates, attachments, and scheduled email sending.',
              author: 'FlowForge',
              category: 'communication',
            },
            {
              slug: 'discord-bot',
              name: 'Discord Bot',
              version: '0.9.0',
              description:
                'Send messages and respond to events in Discord servers.',
              author: 'Community',
              category: 'communication',
            },
          ],
        },
        {
          slug: 'developer-tools',
          name: 'Developer Tools',
          count: 6,
          plugins: [
            {
              slug: 'github-integration',
              name: 'GitHub Integration',
              version: '2.0.1',
              description: 'Automate GitHub workflows and repository management.',
              author: 'FlowForge',
              category: 'developer-tools',
            },
            {
              slug: 'jira-connector',
              name: 'Jira Connector',
              version: '1.1.0',
              description: 'Create and manage Jira issues from your workflows.',
              author: 'FlowForge',
              category: 'developer-tools',
            },
          ],
        },
        {
          slug: 'ai',
          name: 'AI & Machine Learning',
          count: 4,
          plugins: [
            {
              slug: 'openai-connector',
              name: 'OpenAI Connector',
              version: '1.5.0',
              description:
                'Integrate GPT models, DALL-E, and Whisper into workflows.',
              author: 'FlowForge',
              category: 'ai',
            },
            {
              slug: 'huggingface-models',
              name: 'Hugging Face Models',
              version: '0.8.0',
              description: 'Run inference on Hugging Face models.',
              author: 'Community',
              category: 'ai',
            },
          ],
        },
        {
          slug: 'data',
          name: 'Data & Storage',
          count: 5,
          plugins: [
            {
              slug: 'postgres-advanced',
              name: 'PostgreSQL Advanced',
              version: '1.3.0',
              description:
                'Advanced PostgreSQL operations including transactions and migrations.',
              author: 'FlowForge',
              category: 'data',
            },
            {
              slug: 's3-storage',
              name: 'AWS S3 Storage',
              version: '1.0.2',
              description:
                'Upload, download, and manage files in AWS S3 buckets.',
              author: 'FlowForge',
              category: 'data',
            },
          ],
        },
      ],
    };
  }
}
