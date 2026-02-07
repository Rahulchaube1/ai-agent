import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowExecutorService } from './workflow-executor.service';
import { NodeRegistry } from './node-registry.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [WorkflowExecutorService, NodeRegistry],
  exports: [WorkflowExecutorService, NodeRegistry],
})
export class EngineModule {}
