import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Create a new credential, encrypting its data before storage.
   */
  async create(
    dto: CreateCredentialDto,
    organizationId: string,
    createdById: string,
  ) {
    const { encrypted, iv } = this.encryption.encrypt(
      JSON.stringify(dto.data),
    );

    const credential = await this.prisma.credential.create({
      data: {
        name: dto.name,
        type: dto.type,
        encryptedData: encrypted,
        iv,
        organizationId,
        createdById,
      },
      select: {
        id: true,
        name: true,
        type: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `Credential "${dto.name}" (${dto.type}) created by user ${createdById}`,
    );
    return credential;
  }

  /**
   * List all credentials for an organization. Does NOT return decrypted data.
   */
  async findAll(organizationId: string) {
    return this.prisma.credential.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get credential metadata by ID. Does NOT return decrypted data.
   */
  async findOne(id: string, organizationId: string) {
    const credential = await this.prisma.credential.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return credential;
  }

  /**
   * Get decrypted credential data. For internal engine use only.
   */
  async getDecrypted(id: string): Promise<Record<string, unknown>> {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    const decryptedData = this.encryption.decrypt(
      credential.encryptedData,
      credential.iv,
    );

    return JSON.parse(decryptedData);
  }

  /**
   * Update a credential. If new data is provided, re-encrypts it.
   */
  async update(
    id: string,
    dto: UpdateCredentialDto,
    organizationId: string,
  ) {
    const credential = await this.prisma.credential.findFirst({
      where: { id, organizationId },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.data !== undefined) {
      const { encrypted, iv } = this.encryption.encrypt(
        JSON.stringify(dto.data),
      );
      updateData.encryptedData = encrypted;
      updateData.iv = iv;
    }

    const updated = await this.prisma.credential.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Credential ${id} updated`);
    return updated;
  }

  /**
   * Delete a credential.
   */
  async delete(id: string, organizationId: string) {
    const credential = await this.prisma.credential.findFirst({
      where: { id, organizationId },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    await this.prisma.credential.delete({
      where: { id },
    });

    this.logger.log(`Credential ${id} deleted`);
    return { message: 'Credential deleted successfully' };
  }

  /**
   * Get the list of available credential types with metadata.
   */
  getAvailableTypes() {
    return [
      {
        type: 'api_key',
        label: 'API Key',
        description: 'Generic API key authentication',
        fields: [
          { name: 'apiKey', label: 'API Key', type: 'password', required: true },
          { name: 'headerName', label: 'Header Name', type: 'text', required: false, default: 'Authorization' },
        ],
      },
      {
        type: 'oauth2',
        label: 'OAuth2',
        description: 'OAuth 2.0 client credentials or authorization code flow',
        fields: [
          { name: 'clientId', label: 'Client ID', type: 'text', required: true },
          { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
          { name: 'tokenUrl', label: 'Token URL', type: 'text', required: true },
          { name: 'scopes', label: 'Scopes', type: 'text', required: false },
        ],
      },
      {
        type: 'basic_auth',
        label: 'Basic Auth',
        description: 'HTTP Basic Authentication',
        fields: [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
        ],
      },
      {
        type: 'bearer_token',
        label: 'Bearer Token',
        description: 'Bearer token authentication',
        fields: [
          { name: 'token', label: 'Token', type: 'password', required: true },
        ],
      },
      {
        type: 'database',
        label: 'Database',
        description: 'Database connection credentials',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: true },
          { name: 'database', label: 'Database', type: 'text', required: true },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
        ],
      },
      {
        type: 'smtp',
        label: 'SMTP',
        description: 'Email SMTP server credentials',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: true },
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'secure', label: 'Use TLS', type: 'boolean', required: false },
        ],
      },
      {
        type: 'aws',
        label: 'AWS',
        description: 'Amazon Web Services credentials',
        fields: [
          { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
          { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
          { name: 'region', label: 'Region', type: 'text', required: false, default: 'us-east-1' },
        ],
      },
      {
        type: 'openai',
        label: 'OpenAI',
        description: 'OpenAI API credentials',
        fields: [
          { name: 'apiKey', label: 'API Key', type: 'password', required: true },
          { name: 'organization', label: 'Organization ID', type: 'text', required: false },
        ],
      },
    ];
  }
}
