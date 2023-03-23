import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  IPersonCreateDto,
  IPersonUpdateDto,
  PeopleService,
} from 'src/business_logic';
import { ParseDatePipe } from 'src/utils';

@Controller('people')
export class PeopleController {
  constructor(private readonly _peopleService: PeopleService) {}

  @Post()
  create(@Body() createPersonDto: IPersonCreateDto) {
    return this._peopleService.create(createPersonDto);
  }

  @Get()
  findAll(
    @Query('ids', ParseIntPipe, ParseArrayPipe) ids?: number[],
    @Query('name') name?: string,
    @Query('familyName') familyName?: string,
    @Query('birthday', ParseDatePipe) birthday?: Date,
    @Query('fatherIds', ParseArrayPipe, ParseIntPipe) fatherIds?: number[],
    @Query('motherIds', ParseArrayPipe, ParseIntPipe) motherIds?: number[],
    @Query('limit', ParseIntPipe) limit?: number,
    @Query('offset', ParseIntPipe) offset?: number,
  ) {
    return this._peopleService.readMany(
      {
        ids,
        name,
        familyName,
        birthday,
        fatherIds,
        motherIds,
      },
      limit,
      offset,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this._peopleService.readOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonDto: IPersonUpdateDto,
  ) {
    return this._peopleService.update({ ...updatePersonDto, id });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this._peopleService.remove(id);
  }
}
