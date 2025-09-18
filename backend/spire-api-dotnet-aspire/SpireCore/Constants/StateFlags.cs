namespace SpireCore.Constants;

public static class StateFlags
{
    public const string ACTIVE = "a";
    public const string INACTIVE = "i";
    public const string DELETED = "d";

    public static List<string> ALL = new()
    {
        ACTIVE, INACTIVE, DELETED
    };
}

