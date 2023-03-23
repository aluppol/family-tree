import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './people';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_POSTGRESQL_HOST'),
        port: configService.get('DB_POSTGRESQL_PORT'),
        username: configService.get('DB_POSTGRESQL_USER'),
        password: configService.get('DB_POSTGRESQL_PASSWORD'),
        database: configService.get('DB_POSTGRESQL_DB_NAME'),
        entities: [Person],
        ssl: false,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
