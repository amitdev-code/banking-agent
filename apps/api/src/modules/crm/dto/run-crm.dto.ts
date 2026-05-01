import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

import type { AgentMode, CustomerFilters } from '@banking-crm/types';

export class RunCrmDto {
  @IsEnum(['agent', 'custom'])
  mode!: AgentMode;

  @IsOptional()
  @IsString()
  naturalLanguageQuery?: string;

  @IsOptional()
  @IsObject()
  filters?: CustomerFilters;
}
