import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/create-credential.dto';

interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get('types')
  getTypes() {
    return this.credentialsService.getAvailableTypes();
  }

  @Post()
  async create(
    @Body() dto: CreateCredentialDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.credentialsService.create(
      dto,
      user.organizationId,
      user.id,
    );
  }

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.credentialsService.findAll(user.organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.credentialsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredentialDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.credentialsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.credentialsService.delete(id, user.organizationId);
  }
}
