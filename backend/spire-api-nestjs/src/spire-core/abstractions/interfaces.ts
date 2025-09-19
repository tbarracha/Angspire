// src/core/abstractions/interfaces.ts
export interface ICreatedAt {
  createdAt: Date;
}

export interface IUpdatedAt {
  updatedAt: Date;
}

export interface ILastActivityAt {
  lastActivityAt: Date;
}

export interface ICreatedBy {
  createdBy?: string | null;
}
export interface ICreatedByT<TId> {
  createdBy?: TId | null;
}

export interface IUpdatedBy {
  updatedBy?: string | null;
}
export interface IUpdatedByT<TId> {
  updatedBy?: TId | null;
}

export interface IHasId {
  id: string;
}
export interface IHasIdT<TId> {
  id: TId;
}

export interface IIsDefault {
  isDefault: boolean;
}

/**
 * Keep the ubiquitous language identical across contexts.
 */
export interface IStateFlag {
  stateFlag: 'a' | 'i' | 'd';
}
