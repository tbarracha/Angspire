namespace Genspire.Application.Modules.GenAI.Common.Values;
public static class SummaryTypes
{
    public const string SHORT = "short";
    public const string MEDIUM = "medium";
    public const string LONG = "long";
    public static readonly List<string> All = new()
    {
        SHORT,
        MEDIUM,
        LONG
    };
}