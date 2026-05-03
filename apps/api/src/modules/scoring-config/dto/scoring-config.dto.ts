import { IsBoolean, IsInt, IsNumber, IsObject, IsString, Min, Max } from 'class-validator';

export class UpdateScoringConfigDto {
  @IsObject()
  rules!: Record<string, unknown>;
}

export class TuneConfigDto {
  @IsString()
  instruction!: string;
}
