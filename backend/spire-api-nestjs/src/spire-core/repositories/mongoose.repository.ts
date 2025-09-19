// src/spire-core/repositories/mongoose.repository.ts

import { Model, FilterQuery, SortOrder } from 'mongoose';
import {
    Filter,
    IRepository,
    ISoftDeleteRepository,
    OrderBy,
    PaginatedResult,
} from './contracts';

type SoftCfg<T> = { enabled: boolean; deletedAtField?: keyof T; deletedFlagField?: keyof T };

function toQuery<T>(f: Filter<T>): FilterQuery<T> {
    return f as any;
}
function toSort<T>(o?: OrderBy<T>) {
    if (!o) return undefined;
    // Accepts Record<string, 1|-1|SortOrder>. We'll cast to keep TS happy.
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === 'ASC' ? 1 : -1])) as Record<string, SortOrder>;
}

export class MongooseRepository<T> implements IRepository<T> {
    constructor(protected model: Model<T>) { }

    async getAll(): Promise<T[]> {
        return this.model.find().lean().exec() as Promise<T[]>;
    }

    async findOne(filter: Filter<T>): Promise<T | null> {
        return this.model.findOne(toQuery(filter)).lean().exec() as Promise<T | null>;
    }

    async findMany(filter: Filter<T>): Promise<T[]> {
        return this.model.find(toQuery(filter)).lean().exec() as Promise<T[]>;
    }

    async add(entity: T): Promise<T> {
        const doc = new this.model(entity as any);
        await doc.save();
        return doc.toObject() as T;
    }

    async update(entity: any): Promise<T> {
        await this.model.updateOne({ _id: entity._id }, entity);
        return entity as T;
    }

    async delete(entity: any): Promise<T> {
        await this.model.deleteOne({ _id: entity._id });
        return entity as T;
    }

    async updateWhere(filter: Filter<T>, newEntity: Partial<T>): Promise<T> {
        const doc = await this.model
            .findOneAndUpdate(toQuery(filter), { $set: newEntity }, { new: true })
            .lean()
            .exec() as T | null;
        if (!doc) throw new Error('Entity not found');
        return doc;
    }

    async deleteWhere(filter: Filter<T>): Promise<T> {
        const doc = await this.model.findOne(toQuery(filter)).lean().exec() as T | null;
        if (!doc) throw new Error('Entity not found');
        await this.model.deleteOne({ _id: (doc as any)._id });
        return doc as T;
    }

    async addRange(entities: T[]): Promise<T[]> {
        const docs = await this.model.insertMany(entities as any[]);
        return docs.map(d => d.toObject() as T);
    }

    async updateRange(entities: any[]): Promise<T[]> {
        const ops = entities.map(e => this.model.updateOne({ _id: e._id }, e));
        await Promise.all(ops);
        return entities as T[];
    }

    async deleteRange(entities: any[]): Promise<number> {
        const ops = entities.map(e => this.model.deleteOne({ _id: e._id }));
        const res = await Promise.all(ops);
        return res.length;
    }

    async deleteRangeWhere(filter: Filter<T>): Promise<number> {
        const r = await this.model.deleteMany(toQuery(filter));
        return r.deletedCount ?? 0;
    }

    async getPage(page: number, pageSize: number): Promise<PaginatedResult<T>> {
        const [items, total] = await Promise.all([
            this.model.find().skip((page - 1) * pageSize).limit(pageSize).lean().exec() as Promise<T[]>,
            this.model.countDocuments().exec(),
        ]);
        return new PaginatedResult<T>(items, total, page, pageSize);
    }

    async getPageFiltered(
        filter: Filter<T>,
        page: number,
        pageSize: number,
        orderBy?: OrderBy<T>,
    ): Promise<PaginatedResult<T>> {
        const q = this.model.find(toQuery(filter)).sort(toSort(orderBy) as any);
        const [items, total] = await Promise.all([
            q.skip((page - 1) * pageSize).limit(pageSize).lean().exec() as Promise<T[]>,
            this.model.countDocuments(toQuery(filter)).exec(),
        ]);
        return new PaginatedResult<T>(items, total, page, pageSize);
    }
}

export class MongooseSoftDeleteRepository<T>
    extends MongooseRepository<T>
    implements ISoftDeleteRepository<T> {

    constructor(model: Model<T>, private soft: SoftCfg<T>) { super(model); }

    private markDeleted(update: any) {
        if (this.soft.deletedAtField) update[this.soft.deletedAtField as string] = new Date();
        if (this.soft.deletedFlagField) update[this.soft.deletedFlagField as string] = true;
    }
    private unmarkDeleted(update: any) {
        if (this.soft.deletedAtField) update[this.soft.deletedAtField as string] = null;
        if (this.soft.deletedFlagField) update[this.soft.deletedFlagField as string] = false;
    }

    async softDelete(entity: any): Promise<T> {
        const u: any = {}; this.markDeleted(u);
        await this.model.updateOne({ _id: entity._id }, { $set: u });
        return { ...entity, ...u } as T;
    }

    async softDeleteWhere(filter: Filter<T>): Promise<T> {
        const doc = await this.model.findOne(toQuery(filter)).lean().exec() as T | null;
        if (!doc) throw new Error('Not found');
        const u: any = {}; this.markDeleted(u);
        await this.model.updateOne({ _id: (doc as any)._id }, { $set: u });
        return { ...(doc as any), ...u } as T;
    }

    async softDeleteRange(entities: any[]): Promise<T[]> {
        const ops = entities.map(e => this.softDelete(e));
        return Promise.all(ops);
    }

    async softDeleteRangeWhere(filter: Filter<T>): Promise<number> {
        const u: any = {}; this.markDeleted(u);
        const r = await this.model.updateMany(toQuery(filter), { $set: u });
        return r.modifiedCount ?? 0;
    }

    async restoreWhere(filter: Filter<T>): Promise<T> {
        const doc = await this.model.findOne(toQuery(filter)).lean().exec() as T | null;
        if (!doc) throw new Error('Not found');
        const u: any = {}; this.unmarkDeleted(u);
        await this.model.updateOne({ _id: (doc as any)._id }, { $set: u });
        return { ...(doc as any), ...u } as T;
    }

    async restoreRange(entities: any[]): Promise<T[]> {
        const ops = entities.map(e => this.restoreWhere({ _id: e._id } as any));
        return Promise.all(ops);
    }

    async restoreRangeWhere(filter: Filter<T>): Promise<number> {
        const u: any = {}; this.unmarkDeleted(u);
        const r = await this.model.updateMany(toQuery(filter), { $set: u });
        return r.modifiedCount ?? 0;
    }

    async getAllIncludingDeleted(): Promise<T[]> {
        return this.model.find().lean().exec() as Promise<T[]>;
    }

    async getDeleted(): Promise<T[]> {
        if (this.soft.deletedAtField)
            return this.model.find({ [this.soft.deletedAtField as string]: { $ne: null } } as any).lean().exec() as Promise<T[]>;
        if (this.soft.deletedFlagField)
            return this.model.find({ [this.soft.deletedFlagField as string]: true } as any).lean().exec() as Promise<T[]>;
        return [] as T[];
    }

    async findDeleted(filter: Filter<T>): Promise<T | null> {
        const all = await this.findAllDeleted(filter);
        return all[0] ?? null;
    }

    async findAllDeleted(filter: Filter<T>): Promise<T[]> {
        const arr = await this.model
            .find(toQuery(filter))
            .lean()
            .exec() as unknown as T[];

        return arr.filter((e: any) =>
            (this.soft.deletedAtField && e[this.soft.deletedAtField as string]) ||
            (this.soft.deletedFlagField && e[this.soft.deletedFlagField as string] === true)
        );
    }
}
