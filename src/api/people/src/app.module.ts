import { Neo4jModule } from 'nest-neo4j';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeopleService } from './services_layer';
import { PeopleController } from './transport_layer/controllers';

@Module({
  imports: [
    ConfigModule.forRoot(),
    Neo4jModule.forRootAsync({
      scheme: process.env.DB_NEO4J_SCHEME,
      host: process.env.DB_NEO4J_HOST,
      port: process.env.DB_NEO4J_PORT,
      username: process.env.DB_NEO4J_USERNAME,
      password: process.env.DB_NEO4J_PASSWORD,
    }),
    TypeOrmModule.forRoot({
      type: 'neo4j',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      entities: [],
      synchronize: true,
    }),
  ],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class AppModule {}
