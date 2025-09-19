namespace Genspire.CLI.Commands.AI;

// Helper for .NET Standard 2.0/2.1 (GetAsyncEnumerator().ToEnumerable())
public static class AsyncEnumerableHelpers
{
    public static IEnumerable<T> ToEnumerable<T>(this IAsyncEnumerator<T> enumerator)
    {
        while (enumerator.MoveNextAsync().AsTask().GetAwaiter().GetResult())
        {
            yield return enumerator.Current;
        }
    }
}
