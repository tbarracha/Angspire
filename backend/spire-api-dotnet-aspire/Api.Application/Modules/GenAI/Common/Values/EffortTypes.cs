namespace Genspire.Application.Modules.GenAI.Common.Values;
public static class EffortTypes
{
    public const string LOW = "low";
    public const string MEDIUM = "medium";
    public const string HIGH = "high";
    public static readonly List<string> All = new()
    {
        LOW,
        MEDIUM,
        HIGH
    };
}