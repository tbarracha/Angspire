namespace SpireCore.Abstractions.Interfaces;

public interface IHasId
{
    string Id { get; }
}

public interface IHasId<TId>
{
    TId Id { get; set; }
}

