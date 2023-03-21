import { IsInt, validateOrReject } from 'class-validator';
import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

export class ContextModifier {
  @Column({ type: 'bigint' })
  @IsInt()
  createdBy: number;

  @Column({ type: 'bigint' })
  @IsInt()
  updatedBy?: number;

  @Column({ type: 'bigint' })
  @IsInt()
  deletedBy?: number;

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }
}

export interface IContextModifier {
  createdBy: number;
  updatedBy?: number;
  deletedBy?: number;
}
