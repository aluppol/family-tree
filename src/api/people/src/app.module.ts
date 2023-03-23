import * as Joi from 'joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './data_access/database.module';
import { PeopleController } from './presentation/people/controller/people.controller';
import { PeopleService } from './business_logic';
import { ParseDatePipe } from './utils';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './data_access';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../../.env',
      validationSchema: Joi.object({
        DB_POSTGRESQL_HOST: Joi.string().required(),
        DB_POSTGRESQL_PORT: Joi.number().required(),
        DB_POSTGRESQL_USER: Joi.string().required(),
        DB_POSTGRESQL_PASSWORD: Joi.string().required(),
        DB_POSTGRESQL_DB_NAME: Joi.string().required(),
        PORT: Joi.number(),
      }),
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([Person]),
  ],
  controllers: [PeopleController],
  providers: [PeopleService, ParseDatePipe],
})
export class AppModule {}
