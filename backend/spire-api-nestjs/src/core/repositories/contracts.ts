// Shared contracts – parity with your C# naming
export type Filter<T> = Partial<Record<keyof T, any>>; // simple filter object
export type OrderBy<T> = Partial<Record<keyof T, 'ASC' | 'DESC'>>;

export class PaginatedResult<T> {
  constructor(
    public readonly items: readonly T[],
    public readonly totalCount: number,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
  static empty<T>(page: number, pageSize: number) {
    return new PaginatedResult<T>([], 0, page, pageSize);
  }
}

export interface IReadonlyRepository<T> {
  getAll(): Promise<T[]>;
  findOne(filter: Filter<T>): Promise<T | null>;
  findMany(filter: Filter<T>): Promise<T[]>;
}

export interface IPagination<T> {
  getPage(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<T>>;

  getPageFiltered(
    filter: Filter<T>,
    page: number,
    pageSize: number,
    orderBy?: OrderBy<T>,
  ): Promise<PaginatedResult<T>>;
}

export interface IRepository<T> extends IReadonlyRepository<T>, IPagination<T> {
  add(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(entity: T): Promise<T>;

  updateWhere(filter: Filter<T>, newEntity: Partial<T>): Promise<T>;
  deleteWhere(filter: Filter<T>): Promise<T>;

  addRange(entities: T[]): Promise<T[]>;
  updateRange(entities: T[]): Promise<T[]>;
  deleteRange(entities: T[]): Promise<number>;
  deleteRangeWhere(filter: Filter<T>): Promise<number>;
}

export interface ISoftDeleteRepository<T> extends IRepository<T> {
  softDelete(entity: T): Promise<T>;
  softDeleteWhere(filter: Filter<T>): Promise<T>;
  softDeleteRange(entities: T[]): Promise<T[]>;
  softDeleteRangeWhere(filter: Filter<T>): Promise<number>;

  restoreWhere(filter: Filter<T>): Promise<T>;
  restoreRange(entities: T[]): Promise<T[]>;
  restoreRangeWhere(filter: Filter<T>): Promise<number>;

  getAllIncludingDeleted(): Promise<T[]>;
  getDeleted(): Promise<T[]>;
  findDeleted(filter: Filter<T>): Promise<T | null>;
  findAllDeleted(filter: Filter<T>): Promise<T[]>;
}
