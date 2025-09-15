
namespace SpireCore.Utils;

public static class DateUtils
{
    public static DateTime EnsureUtc(DateTime dt)
    {
        return dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
            _ => dt
        };
    }

    public static DateTime? EnsureUtc(DateTime? dt)
        => dt.HasValue ? EnsureUtc(dt.Value) : null;

}
