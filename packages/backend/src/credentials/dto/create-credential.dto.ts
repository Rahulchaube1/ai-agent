import {
  IsString,
  IsNotEmpty,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;
}

export class UpdateCredentialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsObject()
  data?: Record<string, unknown>;
}
