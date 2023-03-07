import { Injectable } from '@nestjs/common';
import { CreatePersonDto } from '../transport_layer/dto/create-person.dto';
import { UpdatePersonDto } from '../transport_layer/dto/update-person.dto';

@Injectable()
export class PeopleService {
  create(createPersonDto: CreatePersonDto) {
    return 'This action adds a new person';
  }

  findAll() {
    return `This action returns all people`;
  }

  findOne(id: number) {
    return `This action returns a #${id} person`;
  }

  update(id: number, updatePersonDto: UpdatePersonDto) {
    return `This action updates a #${id} person`;
  }

  remove(id: number) {
    return `This action removes a #${id} person`;
  }
}
