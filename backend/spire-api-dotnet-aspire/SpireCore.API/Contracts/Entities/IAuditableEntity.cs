using SpireCore.Abstractions.Interfaces;

namespace SpireCore.API.Contracts.Entities;

public interface IAuditableEntity<TId> : IEntity<TId>, ICreatedBy, IUpdatedBy, IStateFlag
{

}

