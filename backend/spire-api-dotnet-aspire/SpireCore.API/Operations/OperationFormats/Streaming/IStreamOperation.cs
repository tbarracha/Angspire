using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpireCore.API.Operations.Streaming;

public interface IStreamOperation<TRequest, TFrame>
{
    IAsyncEnumerable<TFrame> StreamAsync(TRequest request, CancellationToken ct = default);
}
