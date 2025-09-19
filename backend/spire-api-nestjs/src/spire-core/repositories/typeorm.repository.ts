// src/spire-core/repositories/typeorm.repository.ts

import {
  Repository,
  DataSource,
  EntityTarget,
  FindOptionsWhere,
  FindManyOptions,
  ObjectLiteral,
} from 'typeorm';
import {
  Filter,
  OrderBy,
  IRepository,
  PaginatedResult,
  ISoftDeleteRepository,
} from './contracts';

type SoftCfg<T> = { enabled: boolean; deletedAtField?: keyof T; deletedFlagField?: keyof T };

function toWhere<T>(f: Filter<T>): FindOptionsWhere<T & ObjectLiteral> {
  return f as any;
}
function toOrder<T>(o?: OrderBy<T>): FindManyOptions<T & ObjectLiteral>['order'] {
  return o as any;
}

export class TypeOrmRepository<T extends ObjectLiteral> implements IRepository<T> {
  protected repo: Repository<T>;
  protected soft: SoftCfg<T>;

  constructor(ds: DataSource, entity: EntityTarget<T>, soft?: SoftCfg<T>) {
    this.repo = ds.getRepository<T>(entity);
    this.soft = { enabled: false, ...(soft ?? {}) };
  }

  async getAll(): Promise<T[]> { return this.repo.find(); }
  async findOne(filter: Filter<T>) { return this.repo.findOne({ where: toWhere(filter) }); }
  async findMany(filter: Filter<T>) { return this.repo.find({ where: toWhere(filter) }); }

  async add(entity: T) { return this.repo.save(entity); }
  async update(entity: T) { return this.repo.save(entity); }
  async delete(entity: T) { return this.repo.remove(entity); }

  async updateWhere(filter: Filter<T>, newEntity: Partial<T>) {
    const found = await this.repo.findOne({ where: toWhere(filter) });
    if (!found) throw new Error('Entity not found');
    Object.assign(found, newEntity);
    return this.repo.save(found);
  }

  async deleteWhere(filter: Filter<T>) {
    const found = await this.repo.findOne({ where: toWhere(filter) });
    if (!found) throw new Error('Entity not found');
    return this.repo.remove(found);
  }

  async addRange(entities: T[]) { return this.repo.save(entities); }
  async updateRange(entities: T[]) { return this.repo.save(entities); }
  async deleteRange(entities: T[]) { const res = await this.repo.remove(entities); return res.length; }
  async deleteRangeWhere(filter: Filter<T>) {
    const list = await this.repo.find({ where: toWhere(filter) });
    const res = await this.repo.remove(list);
    return res.length;
  }

  async getPage(page: number, pageSize: number) {
    const [items, total] = await this.repo.findAndCount({ skip: (page - 1) * pageSize, take: pageSize });
    return new PaginatedResult<T>(items, total, page, pageSize);
  }

  async getPageFiltered(filter: Filter<T>, page: number, pageSize: number, orderBy?: OrderBy<T>) {
    const [items, total] = await this.repo.findAndCount({
      where: toWhere(filter),
      order: toOrder(orderBy),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return new PaginatedResult<T>(items, total, page, pageSize);
  }
}

export class TypeOrmSoftDeleteRepository<T extends ObjectLiteral>
  extends TypeOrmRepository<T>
  implements ISoftDeleteRepository<T> {

  constructor(ds: DataSource, entity: EntityTarget<T>, soft: Omit<SoftCfg<T>, 'enabled'>) {
    super(ds, entity, { enabled: true, ...soft });
  }

  private markDeleted(e: T) {
    if (this.soft.deletedAtField) (e as any)[this.soft.deletedAtField] = new Date();
    if (this.soft.deletedFlagField) (e as any)[this.soft.deletedFlagField] = true;
  }
  private unmarkDeleted(e: T) {
    if (this.soft.deletedAtField) (e as any)[this.soft.deletedAtField] = null;
    if (this.soft.deletedFlagField) (e as any)[this.soft.deletedFlagField] = false;
  }

  async softDelete(entity: T) { this.markDeleted(entity); return this.repo.save(entity); }
  async softDeleteWhere(filter: Filter<T>) {
    const found = await this.repo.findOne({ where: toWhere(filter) });
    if (!found) throw new Error('Not found');
    this.markDeleted(found); return this.repo.save(found);
  }
  async softDeleteRange(entities: T[]) { entities.forEach(e => this.markDeleted(e)); return this.repo.save(entities); }
  async softDeleteRangeWhere(filter: Filter<T>) {
    const list = await this.repo.find({ where: toWhere(filter) });
    list.forEach(e => this.markDeleted(e));
    const res = await this.repo.save(list);
    return res.length;
  }

  async restoreWhere(filter: Filter<T>) {
    const found = await this.repo.findOne({ where: toWhere(filter) });
    if (!found) throw new Error('Not found');
    this.unmarkDeleted(found); return this.repo.save(found);
  }
  async restoreRange(entities: T[]) { entities.forEach(e => this.unmarkDeleted(e)); return this.repo.save(entities); }
  async restoreRangeWhere(filter: Filter<T>) {
    const list = await this.repo.find({ where: toWhere(filter) });
    list.forEach(e => this.unmarkDeleted(e));
    const res = await this.repo.save(list);
    return res.length;
  }

  async getAllIncludingDeleted() { return this.repo.find({ withDeleted: true } as any); }
  async getDeleted() {
    const q = this.repo.createQueryBuilder('t');
    if (this.soft.deletedAtField) q.where(`t.${String(this.soft.deletedAtField)} IS NOT NULL`);
    else if (this.soft.deletedFlagField) q.where(`t.${String(this.soft.deletedFlagField)} = true`);
    else return [];
    return q.getMany();
  }
  async findDeleted(filter: Filter<T>) {
    const all = await this.findAllDeleted(filter);
    return all[0] ?? null;
  }
  async findAllDeleted(filter: Filter<T>) {
    const where = toWhere(filter);
    const base = await this.repo.find({ where } as any);
    return base.filter(e =>
      (this.soft.deletedAtField && (e as any)[this.soft.deletedAtField]) ||
      (this.soft.deletedFlagField && (e as any)[this.soft.deletedFlagField] === true));
  }
}
