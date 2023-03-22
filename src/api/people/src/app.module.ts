import Joi from 'joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './data_access/database.module';
import { PeopleController } from './presentation/people/controller/people.controller';
import { PeopleService } from './business_logic';

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
  ],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class AppModule {}
