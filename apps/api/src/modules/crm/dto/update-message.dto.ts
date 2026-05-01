import { IsString, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @MinLength(10)
  editedMessage!: string;
}
