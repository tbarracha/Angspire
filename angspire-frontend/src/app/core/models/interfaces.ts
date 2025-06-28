export interface ICreatedAt {
    createdAt: string;
}

export interface ICreatedBy {
    createdBy: string;
}

export interface IUpdatedAt {
    updatedAt: string;
}

export interface IUpdatedBy {
    updatedBy: string;
}

export interface IStateFlag
{
    stateFlag : string; // "a" = active, "i" = inactive, "d" = deleted
}

export interface IHasId {
    id: string;
}