// hello.operation.ts
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Operation, OperationDto, OperationGroup, OperationMethod, OperationRoute } from 'src/core/operations/operations.contracts';

export class HelloInputDto {
  @ApiProperty()
  firstName!: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class HelloOutputDto {
  @ApiProperty()
  message!: string;
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
