using SpireCore.Abstractions.Interfaces;

namespace SpireCore.API.Contracts.Entities;

public interface IEntity<TId> : IHasId<TId>, ICreatedAt, IUpdatedAt, IStateFlag
{

}

