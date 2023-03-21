import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPerson, Person } from 'src/data_access';
import { In, Like, Repository } from 'typeorm';
import { ContextService } from '../context/context.service';
import { IPersonCreateDto, IPersonUpdateDto } from './people.dto';

@Injectable()
export class PeopleService extends ContextService {
  constructor(
    @InjectRepository(Person) private _peopleRepository: Repository<Person>,
  ) {
    super();
  }

  public async create(createPersonDto: IPersonCreateDto): Promise<IPerson> {
    const { user } = this.context;
    const personPayload = new Person({
      ...createPersonDto,
      createdBy: user.id,
    });
    return this._peopleRepository.create(personPayload);
  }

  public async readOne(id: number): Promise<IPerson> {
    return this._peopleRepository.findOne({ where: { id } });
  }

  public async readMany(
    options: IPeopleReadManyOptions,
    limit = 10,
    offset = 0,
  ): Promise<IPerson[]> {
    const { ids, name, familyName, birthday, fatherIds, motherIds, createdBy } =
      options;
    return this._peopleRepository.find({
      where: {
        id: In(ids),
        name: Like(name),
        familyName: Like(familyName),
        birthday,
        fatherId: In(fatherIds),
        motherId: In(motherIds),
        createdBy: In(createdBy),
      },
      take: limit,
      skip: offset,
    });
  }

  public async update(payload: IPersonUpdateDto): Promise<IPerson> {
    const outdatedPerson = await this._peopleRepository.findOne({
      where: { id: payload.id },
    });
    if (!outdatedPerson) {
      throw new NotFoundException(
        `Can't update person with id = ${payload.id}`,
      );
    }

    const person = new Person({ ...outdatedPerson, ...payload });
    await this._peopleRepository.update({ id: payload.id }, person);
    return this.readOne(payload.id);
  }

  public async remove(id: number): Promise<void> {
    await this._peopleRepository.softDelete({ id });
  }
}

export interface IPeopleReadManyOptions {
  ids?: number[];
  name?: string;
  familyName?: string;
  birthday?: Date;
  fatherIds?: number[];
  motherIds?: number[];
  createdBy?: number[];
}