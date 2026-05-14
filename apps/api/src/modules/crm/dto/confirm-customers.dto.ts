import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ConfirmCustomersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedCustomerIds!: string[];
}
