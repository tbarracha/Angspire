// src/app.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor() {}

  @ApiExcludeEndpoint()
  @Get('/')
  root(@Res() res: Response) {
    return res.redirect('/swagger');
  }

  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
