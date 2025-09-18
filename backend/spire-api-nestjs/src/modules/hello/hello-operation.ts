import { Injectable } from '@nestjs/common';
import { Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute } from 'src/core/operations/ops.kernel';

export class HelloInputDto { firstName!: string; lastName?: string; }
export class HelloOutputDto { message!: string; }

@Operation({ group: 'Hello' })
@OperationGroup('hello', true)
@OperationRoute('hello/say')
@OperationMethod('POST')
@Injectable()
export class SayHelloOperation {
  async execute(input: HelloInputDto): Promise<HelloOutputDto> {
    const name = input.lastName ? `${input.firstName} ${input.lastName}` : input.firstName;
    return { message: `Hello ${name}!` };
  }
}
