import { IUser } from 'src/data_access';

interface IRequestContext {
  user: IUser;
}

export class ContextService {
  private _context: IRequestContext;

  constructor() {
    this._context = {
      user: {
        id: 1,
        personId: 1,
        createdAt: new Date(),
      },
    };
  }

  public get context(): IRequestContext {
    return this._context;
  }
}
