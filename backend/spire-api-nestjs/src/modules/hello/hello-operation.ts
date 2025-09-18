// src/modules/hello/operations/hello-operation.ts
import { Injectable } from '@nestjs/common';
import {
  Operation,
  IOperation,
  OperationContext,
} from 'src/core/operations/operation.contracts';

export class HelloInputDto {
  firstName!: string;
  lastName?: string;
}

export class HelloOutputDto {
  message!: string;
}

@Operation({
  group: 'hello',
  route: 'hello/say',
  method: 'POST',
})
@Injectable()
export class SayHelloOperation
  implements IOperation<HelloInputDto, HelloOutputDto>
{
  async execute(input: HelloInputDto, _ctx: OperationContext): Promise<HelloOutputDto> {
    const name = input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName;
    return { message: `Hello ${name}!` };
  }
}
