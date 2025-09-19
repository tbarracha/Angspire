// src/modules/demo/stream.ticks.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute, OperationStream, OperationThrottle,
} from 'src/core/operations/operations.contracts';

export class TicksInputDto {
  @ApiProperty({ description: 'Milliseconds between frames', example: 250, minimum: 50, maximum: 5_000 })
  intervalMs!: number;

  @ApiPropertyOptional({ description: 'Number of frames to emit (defaults to 20)', example: 10 })
  count?: number;
}

export class TickFrameDto {
  @ApiProperty({ example: 1 }) index!: number;
  @ApiProperty({ example: 1731984123456 }) timestamp!: number;
}

@Operation({ group: 'Demo', stream: 'ndjson' })
@OperationGroup('stream', true)
@OperationRoute('stream/ticks')         // → POST /api/stream/ticks
@OperationMethod('POST')
@OperationThrottle('ops-stream')        // stricter throttling bucket
@OperationStream('ndjson')              // clients can still opt-in to SSE via Accept header
@OperationDto({ request: TicksInputDto, response: TickFrameDto })
@Injectable()
export class TicksStreamOperation {
  async *executeStream(input: TicksInputDto): AsyncIterable<TickFrameDto> {
    const interval = Math.max(50, Math.min(5_000, input.intervalMs || 250));
    const total = Math.max(1, Math.min(10_000, input.count ?? 20));
    for (let i = 1; i <= total; i++) {
      await new Promise(r => setTimeout(r, interval));
      yield { index: i, timestamp: Date.now() };
    }
  }
}
