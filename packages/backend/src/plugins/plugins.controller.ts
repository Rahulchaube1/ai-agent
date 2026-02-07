import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PluginsService } from './plugins.service';

interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get('marketplace')
  getMarketplace() {
    return this.pluginsService.getMarketplace();
  }

  @Get()
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('category') category?: string,
    @Query('isEnabled') isEnabled?: string,
  ) {
    return this.pluginsService.findAll({
      organizationId: user.organizationId,
      category,
      isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginsService.findOne(id);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginsService.enable(id);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.pluginsService.disable(id);
  }
}
