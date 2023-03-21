import { IsDate, IsInt, validateOrReject } from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

export class Base {
  @PrimaryGeneratedColumn()
  @IsInt()
  id: number;

  @Column({ type: 'timestamptz' })
  @IsDate()
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  @IsDate()
  updatedAt?: Date;

  @Column({ type: 'timestamptz' })
  @IsDate()
  deletedAt?: Date;

  @BeforeInsert()
  onCreate() {
    this.createdAt = new Date();
  }

  @BeforeUpdate()
  onUpdate() {
    this.updatedAt = new Date();
  }

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }

  constructor(entity: Partial<IBase>) {
    Object.getOwnPropertyNames(this).forEach((prop) => {
      if (
        this[prop] !== undefined &&
        this[prop] !== null &&
        typeof this[prop] !== 'function'
      ) {
        this[prop] = entity[prop];
      }
    });
  }
}

export interface IBase {
  id: number;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
