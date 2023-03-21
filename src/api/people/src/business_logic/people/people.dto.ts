export interface IPersonCreateDto {
  name: string;
  familyName: string;
  birthday: Date;
  fatherId?: number;
  motherId?: number;
}

export interface IPersonUpdateDto extends Partial<IPersonCreateDto> {
  id: number;
}
