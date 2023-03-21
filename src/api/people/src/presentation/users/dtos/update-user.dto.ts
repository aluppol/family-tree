import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-user.dto';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
