namespace Authentication.Infrastructure;

public abstract class BaseAuthEntity : EfAuditableEntity<Guid>
{
    public override Guid Id { get; set; }
}