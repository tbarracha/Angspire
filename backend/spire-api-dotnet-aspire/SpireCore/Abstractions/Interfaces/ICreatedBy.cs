namespace SpireCore.Abstractions.Interfaces;

public interface ICreatedBy
{
    string? CreatedBy { get; set; }
}

public interface ICreatedBy<TId>
{
    TId? CreatedBy { get; set; }
}
