import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';

class GenerateWorkflowDto {
  description: string;
}

class SuggestNodesDto {
  currentNodes: Array<{
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
  }>;
  currentEdges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

class ExplainErrorDto {
  error: string;
  nodeType: string;
  config: Record<string, unknown>;
}

class OptimizeWorkflowDto {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-workflow')
  @HttpCode(HttpStatus.OK)
  async generateWorkflow(@Body() dto: GenerateWorkflowDto) {
    return this.aiService.generateWorkflow(dto.description);
  }

  @Post('suggest-nodes')
  @HttpCode(HttpStatus.OK)
  async suggestNodes(@Body() dto: SuggestNodesDto) {
    return this.aiService.suggestNodes(dto.currentNodes, dto.currentEdges);
  }

  @Post('explain-error')
  @HttpCode(HttpStatus.OK)
  async explainError(@Body() dto: ExplainErrorDto) {
    return this.aiService.explainError(dto.error, dto.nodeType, dto.config);
  }

  @Post('optimize-workflow')
  @HttpCode(HttpStatus.OK)
  async optimizeWorkflow(@Body() dto: OptimizeWorkflowDto) {
    return this.aiService.optimizeWorkflow(dto.nodes, dto.edges);
  }
}
