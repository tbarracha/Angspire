// domain-entities.ts

// ---- DomainEntity Base ----
export interface DomainEntity {
    // BaseEntity<TId>
    id?: string | null;                        // GUID
    createdAt?: string;                 // ISO date string
    updatedAt?: string;                 // ISO date string
    stateFlag?: string;                 // e.g. 'A' for Active, etc.

    // BaseAuditableEntity<TId>
    createdBy?: string | null;
    updatedBy?: string | null;

    // DomainEntity
    metadata?: { [key: string]: any } | null;
}

export interface IIsDefault {
    isDefault?: boolean;
}