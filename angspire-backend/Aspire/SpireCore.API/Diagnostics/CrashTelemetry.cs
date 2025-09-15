using System.Text.Json;

namespace SpireCore.API.Diagnostics;

public static class CrashTelemetry
{
    private static readonly object _gate = new();
    private static CrashRecord _current = new()
    {
        Kind = "unknown",
        TimestampUtc = DateTime.UtcNow,
        Note = "initialized"
    };

    public static void MarkFatal(string source, Exception ex)
    {
        lock (_gate)
        {
            _current = new CrashRecord
            {
                Kind = "fatal",
                Source = source,
                TimestampUtc = DateTime.UtcNow,
                Exception = new CrashException
                {
                    Type = ex.GetType().FullName,
                    Message = ex.Message,
                    Stack = ex.ToString()
                }
            };
        }
    }

    public static void MarkSignal(string kind, string? note = null)
    {
        lock (_gate)
        {
            _current = new CrashRecord
            {
                Kind = kind, // e.g., "process_exit", "unloading", "ctrl_c"
                TimestampUtc = DateTime.UtcNow,
                Note = note
            };
        }
    }

    public static void MarkLifecycle(string stage, string? note = null)
    {
        lock (_gate)
        {
            _current = new CrashRecord
            {
                Kind = stage, // "starting" | "stopping" | "stopped"
                TimestampUtc = DateTime.UtcNow,
                Note = note
            };
        }
    }

    public static void FlushToDisk(string contentRoot, int? exitCode = null)
    {
        try
        {
            CrashRecord snapshot;
            lock (_gate)
            {
                // include exit code if we know it at flush time
                snapshot = _current with { ExitCode = exitCode ?? _current.ExitCode };
            }

            var dir = Path.Combine(contentRoot, "logs");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "last-exit.json");

            var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            File.WriteAllText(path, json);
            Console.WriteLine($"{DateTime.UtcNow:O} [EXIT-REPORT] wrote {path}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"{DateTime.UtcNow:O} [EXIT-REPORT] FAILED: {ex}");
        }
    }

    public record CrashRecord
    {
        public string Kind { get; init; } = "";
        public DateTime TimestampUtc { get; init; }
        public string? Source { get; init; }
        public string? Note { get; init; }
        public int? ExitCode { get; init; }
        public CrashException? Exception { get; init; }
        public HostEnv? Environment { get; init; } = HostEnv.Snapshot();

        public CrashRecord WithExit(int code) => this with { ExitCode = code };
    }

    public record CrashException
    {
        public string? Type { get; init; }
        public string? Message { get; init; }
        public string? Stack { get; init; }
    }

    public record HostEnv
    {
        public string? Machine { get; init; }
        public string? OS { get; init; }
        public string? Framework { get; init; }
        public int ProcessId { get; init; }
        public string? CommandLine { get; init; }

        public static HostEnv Snapshot() => new()
        {
            Machine = Environment.MachineName,
            OS = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            Framework = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            ProcessId = Environment.ProcessId,
            CommandLine = Environment.CommandLine
        };
    }
}
