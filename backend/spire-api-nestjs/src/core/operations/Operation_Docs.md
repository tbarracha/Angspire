# Operations Handbook (REST & Stream)

This document is the **single source of truth** for creating and running Operation-based endpoints in our NestJS backend. It covers:

* The **philosophy** (why Operations, how it fits DDD + Vertical Slice)
* **REST** Operations (request/response)
* **Stream** Operations (NDJSON / SSE)
* Conventions, lifecycle, validation, auth, throttling, Swagger, and troubleshooting

> Scope: **HTTP only**. WebSockets are intentionally excluded here.

---

## 1) Philosophy

### 1.1 Why “Operations”?

* **Vertical slices**: Each operation owns its route, input, output, and lifecycle—no fat service/controller layers.
* **Explicit contracts**: DTOs define the boundary; they’re mapped to OpenAPI automatically.
* **Composable cross-cutting**: Common hooks (auth, validation, throttle, before/after) live in `OperationBaseCore`.
* **Uniform transport**: Same model for synchronous REST and streaming responses.

### 1.2 When to use what

* **REST Operation** (classic request/response):

  * Deterministic business actions (create/update/delete, queries with bounded payloads).
* **Stream Operation** (NDJSON/SSE):

  * Long-running tasks, incremental computation, model inference streams, progress reporting.

---

## 2) Key Concepts

### 2.1 Decorators (metadata only)

* `@Operation({ ... })` – optional bundle for group/route/method/stream flags.
* `@OperationGroup('groupName', pinned?)`
* `@OperationRoute('path/segments')` – **path without `/api`** (framework will add `/api`).
* `@OperationMethod('GET'|'POST'|'PUT'|'DELETE')`
* `@OperationAuthorize(policy?: string|true)` – true = auth required; string = policy.
* `@OperationThrottle('ops-default'|'ops-strict'|'ops-stream')`
* `@OperationStream('ndjson'|'sse')` – marks as streamable; default is `'ndjson'`.
* `@OperationDto({ request, response })` – explicit DTOs for Swagger & inference (recommended).

> You can also rely on static `RequestDto/ResponseDto` for inference. Use `@OperationDto` to make intent explicit.

### 2.2 Base class (optional)

Extend `OperationBaseCore<TRequest>` to get lifecycle hooks:

* `authorize(req) → boolean`
* `validate(req) → string[] | null`
* `onBefore(req)` / `onAfter(req)`

The runtime will call `_authorize/_validate/_onBefore/_onAfter` automatically.

### 2.3 DTOs

* Keep them **flat and serializable**.
* Use `@ApiProperty` / `@ApiPropertyOptional` for Swagger.
* Optional fields use `?`.
* Examples and descriptions improve docs and client DX.

### 2.4 Routing

* **All operations live under `/api`**.
* Your `@OperationRoute('hello/say')` becomes `POST /api/hello/say`.
* For streams, the same route applies (e.g., `POST /api/stream/ticks`).

---

## 3) REST Operations

### 3.1 Minimal example

```ts
// hello.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute } from 'src/core/operations/operations.contracts';

export class HelloInputDto {
  @ApiProperty() firstName!: string;
  @ApiPropertyOptional() lastName?: string;
}

export class HelloOutputDto {
  @ApiProperty() message!: string;
}

@Operation({ group: 'Hello' })
@OperationGroup('hello', true)
@OperationRoute('hello/say')
@OperationMethod('POST')
@OperationDto({ request: HelloInputDto, response: HelloOutputDto })
@Injectable()
export class SayHelloOperation {
  async execute(input: HelloInputDto): Promise<HelloOutputDto> {
    const name = input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName;
    return { message: `Hello ${name}!` };
  }
}
```

**What you get**

* `POST /api/hello/say`
* Swagger request/response schemas
* No controller boilerplate

### 3.2 Lifecycle (optional)

```ts
export class SecureHelloOperation extends OperationBaseCore<HelloInputDto> {
  protected async authorize(_req: HelloInputDto) { return !!this.userId; }
  protected async validate(req: HelloInputDto) {
    const errors: string[] = [];
    if (!req.firstName?.trim()) errors.push('firstName is required.');
    return errors.length ? errors : null;
  }
  async execute(req: HelloInputDto) { /* ... */ }
}
```

---

## 4) Stream Operations (NDJSON / SSE)

### 4.1 When to use

* You must **emit frames over time** without holding the connection hostage.
* You want **backpressure-friendly** output on HTTP.

Our controller emits:

* **NDJSON** by default (`Content-Type: application/x-ndjson`).
* **SSE** if the client advertises `Accept: text/event-stream`.

### 4.2 Cancellation

* `POST /api/streams/cancel` with `{ requestId }` aborts a running stream.

### 4.3 Ticks example (progress streaming)

```ts
// stream.ticks.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute, OperationStream, OperationThrottle,
} from 'src/core/operations/operations.contracts';

export class TicksInputDto {
  @ApiProperty({ example: 250, minimum: 50, maximum: 5000 }) intervalMs!: number;
  @ApiPropertyOptional({ example: 10 }) count?: number;
}

export class TickFrameDto {
  @ApiProperty() index!: number;
  @ApiProperty() timestamp!: number;
}

@Operation({ group: 'Demo', stream: 'ndjson' })
@OperationGroup('stream', true)
@OperationRoute('stream/ticks')  // POST /api/stream/ticks
@OperationMethod('POST')
@OperationThrottle('ops-stream')
@OperationStream('ndjson')
@OperationDto({ request: TicksInputDto, response: TickFrameDto })
@Injectable()
export class TicksStreamOperation {
  async *executeStream(input: TicksInputDto): AsyncIterable<TickFrameDto> {
    const interval = Math.max(50, Math.min(5000, input.intervalMs || 250));
    const total = Math.max(1, Math.min(10000, input.count ?? 20));
    for (let i = 1; i <= total; i++) {
      await new Promise(r => setTimeout(r, interval));
      yield { index: i, timestamp: Date.now() };
    }
  }
}
```

**Client (NDJSON):**

```bash
curl -N -H "Content-Type: application/json" \
  -d '{"intervalMs":200,"count":5}' \
  http://localhost:3000/api/stream/ticks
```

**Client (SSE):**

```bash
curl -N -H "Accept: text/event-stream" -H "Content-Type: application/json" \
  -d '{"intervalMs":200,"count":5}' \
  http://localhost:3000/api/stream/ticks
```

**Cancel:**

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"requestId":"<id-from-response-header>"}' \
  http://localhost:3000/api/streams/cancel
```

> The server returns an `X-Request-Id` header for every call. Use that for cancellation.

### 4.4 Chunking example (text generation / logs)

```ts
// stream.lorem.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute, OperationStream, OperationThrottle,
} from 'src/core/operations/operations.contracts';

export class LoremInputDto {
  @ApiProperty({ example: 5, minimum: 1 }) chunks!: number;
  @ApiPropertyOptional({ example: 64, minimum: 8 }) chunkSize?: number;
  @ApiPropertyOptional({ example: 150 }) intervalMs?: number;
}

export class LoremChunkDto {
  @ApiProperty() seq!: number;
  @ApiProperty() text!: string;
}

function makeLorem(n: number) {
  const seed = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...';
  const s: string[] = [];
  while (s.join(' ').length < n) s.push(seed);
  return s.join(' ').slice(0, n);
}

@Operation({ group: 'Demo', stream: 'ndjson' })
@OperationGroup('stream', true)
@OperationRoute('stream/lorem')  // POST /api/stream/lorem
@OperationMethod('POST')
@OperationThrottle('ops-stream')
@OperationStream('ndjson')
@OperationDto({ request: LoremInputDto, response: LoremChunkDto })
@Injectable()
export class LoremStreamOperation {
  async *executeStream(input: LoremInputDto): AsyncIterable<LoremChunkDto> {
    const total = Math.max(1, Math.min(1000, input.chunks ?? 5));
    const size = Math.max(8, Math.min(4096, input.chunkSize ?? 64));
    const interval = Math.max(0, Math.min(5000, input.intervalMs ?? 150));
    for (let i = 1; i <= total; i++) {
      if (interval) await new Promise(r => setTimeout(r, interval));
      yield { seq: i, text: makeLorem(size) };
    }
  }
}
```

---

## 5) Cross-cutting Concerns

### 5.1 Auth

* Use `@OperationAuthorize(true)` or a policy string; the runtime calls `authorize(req)` on `OperationBaseCore`.
* If not using `OperationBaseCore`, implement guards globally or per route prefix.

### 5.2 Validation

* You can:

  * Implement `validate(req)` in the base class, or
  * Use `class-validator` + global validation pipe, or
  * Do both (fast guard in `validate`, detailed per-field via decorators)

### 5.3 Throttling

* Buckets:

  * `ops-default` (60/min)
  * `ops-strict` (10/30s)
  * `ops-stream` (3/sec)
* Choose with `@OperationThrottle(...)`. Stream endpoints should normally use `ops-stream`.

### 5.4 Error model

* REST: Responds `400` with `{ errors: string[] }` if `validate` fails, `403` if `authorize` fails.
* Stream: Emits frames until completion; on error the server ends the stream with an HTTP 500 and error JSON line / SSE event. Prefer to **emit structured error frames** from the operation if you need graceful termination semantics; otherwise let the runtime send a final error.

### 5.5 SSE vs NDJSON

* Default is **NDJSON** (`application/x-ndjson`) for broad tooling compatibility.
* Clients may opt into **SSE** with `Accept: text/event-stream`. Your operation code is identical either way.

### 5.6 Cancellation

* `POST /api/streams/cancel` with `requestId` aborts server-side iteration.
* Always **set `X-Request-Id`** on the server (the runtime already does). Clients must store it.

---

## 6) Swagger Integration

* **Build order** matters: **prime** the registry before building Swagger.

  * We call `OperationsBootstrap.prime(app)` before `OperationsSwagger.setup`.
* Swagger adds:

  * Cancel endpoint (`/api/streams/cancel`)
  * One path per Operation (REST or Stream)
  * **extraModels**: collected from the registry (request/response DTOs).

**Checklist if models are missing:**

* DTOs have `@ApiProperty`/`Optional`.
* `@OperationDto({ request, response })` is present (or static props exist).
* Dynamic module (`registerAutoProviders()`) is imported in `AppModule`.
* `OperationsBootstrap.prime(app)` runs **before** `OperationsSwagger.setup`.
* Using Nest CLI build (so plugin can run if enabled).

---

## 7) Conventions & Naming

* **File names**: `*.operation.ts` or `*-operation.ts` (auto-scan picks both).
* **Class names**: end with `Operation` (e.g., `SayHelloOperation`).
* **Groups**: human-readable in Swagger (`@OperationGroup('hello')`).
* **Routes**: don’t prefix `/api`; use clean segments (`'hello/say'`, `'stream/ticks'`).
* **DTOs**: `SomethingInputDto`, `SomethingOutputDto`, `SomethingFrameDto` for streams.

---

## 8) Testing tips

* **REST**: Supertest against `/api/...`. Assert body and status codes.
* **Stream (NDJSON)**:

  * Use a line reader over the HTTP response.
  * Assert each JSON line shape; assert a **finite number of frames** is received.
* **SSE**: Test with an SSE client (or curl) and parse `data:` lines.

---

## 9) Troubleshooting

* **Swagger shows “string” instead of schema**:

  * Add `@ApiProperty` decorators and/or `@OperationDto`.
  * Ensure the DTO classes are included in `extraModels` (registry populated first).
* **404 for `/api/...`**:

  * The computed route includes the leading slash (runtime generates `/api/<route>`).
  * Verify `@OperationRoute` doesn’t accidentally include `/api` twice.
* **Cancel doesn’t work**:

  * Ensure you propagate `X-Request-Id` from the response header and post it back to `/api/streams/cancel`.

---

## 10) Authoring Checklist (copy/paste)

* [ ] Create `*.operation.ts` with `@OperationGroup`, `@OperationRoute`, `@OperationMethod`.
* [ ] Define `InputDto` and `OutputDto` (or `FrameDto` for streams) with `@ApiProperty` annotations.
* [ ] Add `@OperationDto({ request, response })`.
* [ ] (Optional) Extend `OperationBaseCore` to implement `authorize/validate/onBefore/onAfter`.
* [ ] For streams, add `@OperationStream('ndjson')` and `@OperationThrottle('ops-stream')`.
* [ ] Build & run. Confirm routes under `/api/*`.
* [ ] Open Swagger (`/swagger`) and confirm request/response schemas render correctly.
* [ ] For streams, test NDJSON and SSE, and test `/api/streams/cancel`.
