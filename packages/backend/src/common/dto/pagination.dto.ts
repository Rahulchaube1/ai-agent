import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for pagination query parameters.
 *
 * @example
 * GET /api/v1/workflows?page=1&limit=20&sortBy=createdAt&sortOrder=desc
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

/**
 * Metadata for paginated responses.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic paginated response wrapper.
 *
 * @template T - The type of items in the data array
 */
export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Factory method to create a PaginatedResponseDto from query results.
   */
  static create<T>(
    data: T[],
    total: number,
    paginationDto: PaginationDto,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(
      data,
      total,
      paginationDto.page,
      paginationDto.limit,
    );
  }
}
