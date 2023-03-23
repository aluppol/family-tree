// import { IsInt, validateOrReject } from 'class-validator';
// import {
//   BeforeInsert,
//   BeforeUpdate,
//   Column,
//   Entity,
//   JoinColumn,
//   OneToOne,
// } from 'typeorm';
// import { Base, IBase } from '../base/base.model';
// import { Person } from '../people/person.model';

// @Entity()
// export class User extends Base implements IUser {
//   @Column({ type: 'bigint' })
//   @IsInt()
//   personId: number;

//   @BeforeInsert()
//   @BeforeUpdate()
//   async validate() {
//     await validateOrReject(this);
//   }

//   @OneToOne(() => Person, (person) => person.user)
//   @JoinColumn()
//   person?: Person;
// }

// export interface IUser extends IBase {
//   personId: number;

//   person?: Person;
// }
