// -----------------------------------------------------------------------------
// Author: Tiago Barracha <ti.barracha@gmail.com>
// Created with AI assistance (ChatGPT)
// Description: Deterministic GUID generator using a string seed.
// Useful for seeding consistent identifiers across environments or systems.
// -----------------------------------------------------------------------------
//
// USAGE:
//
// var guid = GuidUtility.CreateDeterministicGuid("read_user");
// Console.WriteLine(guid); // Always returns the same GUID for the same input
//
// This is commonly used in seeding data like permissions, roles, etc.,
// to ensure that IDs remain consistent across environments or migrations.
//
// -----------------------------------------------------------------------------

namespace SpireCore.Utils;

public static class GuidUtility
{
    /// <summary>
    /// Creates a deterministic GUID based on a string input using MD5 hashing.
    /// </summary>
    /// <param name="input">The input string to hash into a GUID.</param>
    /// <returns>A consistent, deterministic GUID derived from the input.</returns>
    public static Guid CreateDeterministicGuid(string input)
    {
        using var provider = System.Security.Cryptography.MD5.Create();
        var hash = provider.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
        return new Guid(hash);
    }
}

