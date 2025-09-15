using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;

namespace SpireCore.API.Operations.Files;


// ===== Download wrapper -> IResult =====
public sealed class FileDownloadResult
{
    // Success fields
    public Stream? Content { get; init; }
    public string? ContentType { get; init; }
    public string? FileName { get; init; }
    public bool AsAttachment { get; init; }
    public DateTimeOffset? LastModified { get; init; }

    // Error fields (when StatusCode != null, Content is ignored)
    public int? StatusCode { get; init; }
    public string? Error { get; init; }

    public static FileDownloadResult NotFound(string message) =>
        new() { StatusCode = StatusCodes.Status404NotFound, Error = message };

    public static FileDownloadResult BadRequest(string message) =>
        new() { StatusCode = StatusCodes.Status400BadRequest, Error = message };

    public static FileDownloadResult Failure(string message, int status = StatusCodes.Status500InternalServerError) =>
        new() { StatusCode = status, Error = message };
}

public static class FileDownloadResultExtensions
{
    public static IResult ToHttpResult(this FileDownloadResult result)
    {
        if (result.StatusCode is int status)
        {
            return Results.Problem(
                title: ReasonPhrases.GetReasonPhrase(status),
                detail: result.Error,
                statusCode: status);
        }

        if (result.Content is null)
            return Results.Problem("No content.", statusCode: StatusCodes.Status500InternalServerError);

        // Inline vs Attachment
        if (result.AsAttachment)
        {
            return Results.File(
                fileStream: result.Content,
                contentType: result.ContentType ?? "application/octet-stream",
                fileDownloadName: result.FileName,
                lastModified: result.LastModified);
        }

        // Inline: no download name -> browser can render if type is viewable
        return Results.File(
            fileStream: result.Content,
            contentType: result.ContentType ?? "application/octet-stream",
            lastModified: result.LastModified,
            enableRangeProcessing: true);
    }
}

// ===== Marker interfaces =====
public interface IFileUploadOperation<TRequest, TResponse> : IOperation<TRequest, TResponse> { }
public interface IFileDownloadOperation<TRequest> : IOperation<TRequest, FileDownloadResult> { }