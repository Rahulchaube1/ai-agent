import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsArray()
  nodes: Record<string, unknown>[];

  @IsArray()
  edges: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changelog?: string;
}
