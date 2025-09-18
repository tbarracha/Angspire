// File: SpireCore.API.Operations/Logs/OperationLogMonitor.cs

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace SpireCore.API.Operations.Logs
{
    /// <summary>
    /// Lightweight wrapper over IOptionsMonitor&lt;OperationsOptions&gt; that answers
    /// "should we log?" for a given category/level and exposes the current snapshot.
    /// </summary>
    public interface IOperationLogMonitor
    {
        OperationsOptions Current { get; }
        bool ShouldLog(OperationCategory category, OperationLogLevel level);
        OperationLogCategoryOptions GetCategory(OperationCategory category);
        IDisposable Subscribe(Action<OperationsOptions> onChange);
    }

    public sealed class OperationLogMonitor : IOperationLogMonitor, IDisposable
    {
        private readonly IOptionsMonitor<OperationsOptions> _monitor;
        private readonly IDisposable _reloader;
        private volatile OperationsOptions _current;

        public OperationLogMonitor(IOptionsMonitor<OperationsOptions> monitor)
        {
            _monitor = monitor;
            _current = monitor.CurrentValue;
            _reloader = monitor.OnChange(updated => _current = updated);
        }

        public OperationsOptions Current => _current;

        public bool ShouldLog(OperationCategory category, OperationLogLevel level)
            => OperationLoggingPolicy.IsEnabled(_current, category, level);

        public OperationLogCategoryOptions GetCategory(OperationCategory category)
            => OperationLoggingPolicy.GetCategory(_current.Logging, category);

        public IDisposable Subscribe(Action<OperationsOptions> onChange)
            => _monitor.OnChange(onChange);

        public void Dispose() => _reloader.Dispose();
    }

    /// <summary>
    /// DI registration helper. Binds the "Operations" section and registers the monitor.
    /// </summary>
    public static class OperationLogMonitorServiceCollectionExtensions
    {
        /// <param name="configuration">
        /// Optional IConfiguration. If null, uses BindConfiguration("Operations").
        /// </param>
        public static IServiceCollection AddOperationLoggingMonitor(
            this IServiceCollection services,
            IConfiguration? configuration = null)
        {
            if (configuration is null)
            {
                services.AddOptions<OperationsOptions>()
                        .BindConfiguration("Operations")
                        .ValidateOnStart();
            }
            else
            {
                services.AddOptions<OperationsOptions>()
                        .Bind(configuration.GetSection("Operations"))
                        .ValidateOnStart();
            }

            services.AddSingleton<IOperationLogMonitor, OperationLogMonitor>();
            return services;
        }
    }
}
