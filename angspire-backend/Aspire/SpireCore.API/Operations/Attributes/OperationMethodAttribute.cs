namespace SpireCore.API.Operations.Attributes;

public enum OperationMethodType
{
    GET,
    POST,
    PUT,
    DELETE,
    PATCH
}

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class OperationMethodAttribute : Attribute
{
    public string HttpMethod { get; }

    public OperationMethodAttribute(string httpMethod)
    {
        HttpMethod = httpMethod.ToUpperInvariant();
    }

    public OperationMethodAttribute(OperationMethodType method)
    {
        HttpMethod = method.ToString().ToUpperInvariant();
    }
}

