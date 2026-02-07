import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
