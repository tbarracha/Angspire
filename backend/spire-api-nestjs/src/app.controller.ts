// src/app.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  root(@Res() res: Response) {
    return res.redirect('/swagger');
  }

  @Get('/hello')
  getHello() {
    return this.appService.getHello();
  }

  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
