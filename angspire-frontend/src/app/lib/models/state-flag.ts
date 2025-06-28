export enum StateFlag {
    Active = 'a',
    Inactive = 'i',
    Deleted = 'd'
}

export interface IStateFlag
{
    stateFlag : StateFlag; // "a" = active, "i" = inactive, "d" = deleted
}