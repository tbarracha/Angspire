// src/modules/demo-operations/stream.lorem.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute, OperationStream, OperationThrottle,
} from 'src/core/operations/operations.contracts';

export class LoremInputDto {
  @ApiProperty({ description: 'How many chunks to emit', example: 5, minimum: 1 })
  chunks!: number;

  @ApiPropertyOptional({ description: 'Size of each chunk in characters', example: 64, minimum: 8 })
  chunkSize?: number;

  @ApiPropertyOptional({ description: 'Milliseconds between chunks', example: 150 })
  intervalMs?: number;
}

export class LoremChunkDto {
  @ApiProperty() seq!: number;
  @ApiProperty() text!: string;
}

function makeLorem(n: number) {
  const seed =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  const s: string[] = [];
  while (s.join(' ').length < n) s.push(seed);
  return s.join(' ').slice(0, n);
}

@Operation({ group: 'Demo Operations', stream: 'ndjson' })
@OperationGroup('stream', true)
@OperationRoute('stream/lorem')         // → POST /api/stream/lorem
@OperationMethod('POST')
@OperationThrottle('ops-stream')
@OperationStream('ndjson')
@OperationDto({ request: LoremInputDto, response: LoremChunkDto })
@Injectable()
export class LoremStreamOperation {
  async *executeStream(input: LoremInputDto): AsyncIterable<LoremChunkDto> {
    const total = Math.max(1, Math.min(1000, input.chunks ?? 5));
    const size = Math.max(8, Math.min(4096, input.chunkSize ?? 64));
    const interval = Math.max(0, Math.min(5_000, input.intervalMs ?? 150));

    for (let i = 1; i <= total; i++) {
      if (interval) await new Promise(r => setTimeout(r, interval));
      yield { seq: i, text: makeLorem(size) };
    }
  }
}
