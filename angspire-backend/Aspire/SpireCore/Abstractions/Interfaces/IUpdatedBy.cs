namespace SpireCore.Abstractions.Interfaces;

public interface IUpdatedBy
{
    string? UpdatedBy { get; set; }
}

public interface IUpdatedBy<TId>
{
    TId? UpdatedBy { get; set; }
}
