// File: BaseAIClient.cs
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Genspire.Application.Modules.GenAI.Client.AiClients;
public abstract class BaseAIClient
{
    public abstract string? Provider { get; }

    /// <summary>
    /// Toggle logging of the outbound request payload (the "prompt").
    /// Default is false to avoid leaking sensitive inputs to logs.
    /// </summary>
    protected const bool LogPromptPayload = false;
    /// <summary>
    /// Toggle all other console logs for this client (diagnostics, headers, responses, errors, stream traces, etc.).
    /// Prompt request logging is controlled separately by <see cref = "LogPromptPayload"/> and is always emitted
    /// (payload content may be redacted).
    /// </summary>
    protected const bool LogDiagnostics = false;
    protected readonly HttpClient _httpClient;
    protected readonly string _endpointPath;
    protected readonly JsonSerializerOptions _jsonOptions;
    protected readonly string _apiKey;
    protected BaseAIClient(string baseUrl, string? endpointPath = null, string? apiKey = null, HttpClient? http = null, JsonSerializerOptions? jsonOptions = null)
    {
        _httpClient = http ?? new HttpClient();
        _httpClient.BaseAddress ??= new Uri(baseUrl.TrimEnd('/') + "/");
        _apiKey = apiKey ?? string.Empty;
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _endpointPath = endpointPath?.TrimStart('/') ?? string.Empty;
        _jsonOptions = jsonOptions ?? new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = true
        };
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] Ctor: base={_httpClient.BaseAddress} endpointPath='{_endpointPath}' apiKeySet={(string.IsNullOrWhiteSpace(_apiKey) ? "no" : "yes")}");
    }

    public virtual async Task<HttpResponseMessage> PostAsync(string? path, object payload, CancellationToken ct = default)
    {
        var request = CreatePostRequest(path, payload);
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] PostAsync: sending → {request.Method} {request.RequestUri}");
        var response = await _httpClient.SendAsync(request, ct);
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] PostAsync: response ← {(int)response.StatusCode} {response.ReasonPhrase}");
        if (!response.IsSuccessStatusCode)
        {
            await HandleErrorAsync(response, ct);
        }

        await PrintResponseAsync("POST", response, ct);
        return response;
    }

    public virtual async IAsyncEnumerable<string> PostStreamAsync(string? path, object payload, [EnumeratorCancellation] CancellationToken ct = default)
    {
        var request = CreatePostRequest(path, payload);
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] PostStreamAsync: sending → {request.Method} {request.RequestUri}");
        var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] PostStreamAsync: headers ← {(int)response.StatusCode} {response.ReasonPhrase} contentType='{response.Content?.Headers?.ContentType?.MediaType}'");
        if (!response.IsSuccessStatusCode)
        {
            await HandleErrorAsync(response, ct);
        }

        await foreach (var line in StreamLinesAsync(response, ct).WithCancellation(ct))
        {
            if (LogDiagnostics)
                Console.WriteLine($"[BaseAIClient INFO] Stream line ({line.Length} chars)");
            yield return line;
        }

        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] PostStreamAsync: stream completed");
    }

    protected virtual void ApplyHeaders(HttpRequestMessage request)
    {
        if (!string.IsNullOrWhiteSpace(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            if (LogDiagnostics)
                Console.WriteLine($"[BaseAIClient INFO] ApplyHeaders: Authorization=Bearer ***");
        }
        else
        {
            if (LogDiagnostics)
                Console.WriteLine($"[BaseAIClient WARN] ApplyHeaders: No API key set");
        }
    }

    private HttpRequestMessage CreatePostRequest(string? path, object payload)
    {
        var json = JsonSerializer.Serialize(payload, _jsonOptions);
        var uriPath = BuildPath(path);
        var request = new HttpRequestMessage(HttpMethod.Post, uriPath)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        ApplyHeaders(request);
        PrintRequest("POST", json);
        return request;
    }

    private string BuildPath(string? path)
    {
        var result = string.IsNullOrWhiteSpace(path) ? _endpointPath : path.TrimStart('/');
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient INFO] BuildPath: input='{path ?? "<null>"}' → result='{result}'");
        return result;
    }

    private async Task HandleErrorAsync(HttpResponseMessage response, CancellationToken ct)
    {
        var content = await response.Content.ReadAsStringAsync(ct);
        PrintHttpError(response, content);
        if (LogDiagnostics)
            Console.WriteLine($"[BaseAIClient ERROR] HttpException: {(int)response.StatusCode} {response.ReasonPhrase}");
        throw new HttpRequestException($"AI provider HTTP error: {(int)response.StatusCode} {response.ReasonPhrase}\n{content}", inner: null, statusCode: response.StatusCode);
    }

    private static async IAsyncEnumerable<string> StreamLinesAsync(HttpResponseMessage response, [EnumeratorCancellation] CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync();
            if (!string.IsNullOrWhiteSpace(line))
            {
                if (LogDiagnostics)
                    Console.WriteLine($"[BaseAIClient INFO] RAW: {line}");
                yield return line;
            }
        }
    }

    // -------- Diagnostics ----------------
    protected void PrintRequest(string tag, string payload)
    {
        // Prompt request logs are ALWAYS printed (payload content may be redacted)
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[BaseAIClient INFO] {tag} EXECUTING Request");
        Console.WriteLine($"[BaseAIClient INFO] Endpoint: {_httpClient.BaseAddress}{_endpointPath}");
        if (LogPromptPayload)
        {
            Console.WriteLine($"[BaseAIClient INFO] Payload:");
            Console.WriteLine(payload);
        }
        else
        {
            Console.WriteLine($"[BaseAIClient INFO] Payload: (redacted — LogPromptPayload=false)");
        }

        Console.ResetColor();
    }

    private async Task PrintResponseAsync(string tag, HttpResponseMessage resp, CancellationToken ct)
    {
        var content = await resp.Content.ReadAsStringAsync(ct);
        PrintResponse(tag, content);
    }

    protected void PrintResponse(string tag, string response)
    {
        if (!LogDiagnostics)
            return;
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[BaseAIClient INFO] {tag} Response JSON:");
        Console.WriteLine(response);
        Console.ResetColor();
    }

    protected void PrintHttpError(HttpResponseMessage resp, string content)
    {
        if (!LogDiagnostics)
            return;
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[BaseAIClient ERROR] HTTP {(int)resp.StatusCode} {resp.ReasonPhrase}");
        Console.WriteLine(content);
        Console.ResetColor();
    }
}