import {
  IsDate,
  IsInt,
  IsString,
  MaxLength,
  validateOrReject,
} from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Base, IBase } from '../base/base.model';

@Entity({ schema: 'src', name: 'People' })
export class Person extends Base implements IPerson {
  @Column({ type: 'varchar' })
  @IsString()
  @MaxLength(255)
  name: string;

  @Column({ type: 'varchar' })
  @IsString()
  @MaxLength(255)
  familyName: string;

  @Column({ type: 'timestamptz' })
  @IsDate()
  birthday: Date;

  @Column({ type: 'bigint' })
  @IsInt()
  fatherId?: number;

  @Column({ type: 'bigint' })
  @IsInt()
  motherId?: number;

  // @Column({ type: 'bigint' })
  // @IsInt()
  // createdBy: number;

  // @Column({ type: 'bigint' })
  // @IsInt()
  // updatedBy?: number;

  // @Column({ type: 'bigint' })
  // @IsInt()
  // deletedBy?: number;

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }

  @ManyToOne(() => Person, (father) => father.children)
  @JoinColumn()
  father?: Person;

  @ManyToOne(() => Person, (mother) => mother.children)
  @JoinColumn()
  mother?: Person;

  @OneToMany(() => Person, (person) => person.children)
  @JoinColumn()
  children?: Person[];

  // @OneToOne(() => User, (user) => user.person)
  // @JoinColumn()
  // user?: User;

  constructor(entity: IPersonPayload & Partial<IBase>) {
    super(entity);
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

export interface IPerson extends IPersonPayload, IBase {}

export interface IPersonPayload {
  name: string;
  familyName: string;
  birthday: Date;
  fatherId?: number;
  motherId?: number;

  father?: Person;
  mother?: Person;
  children?: Person[];
  // user?: User;
}
