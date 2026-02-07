import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { ExecutionGateway } from './execution.gateway';

@Module({
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionGateway],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
