// src/core/auth/jwt.guards.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UserJwtGuard extends AuthGuard('jwt') {}          // default Passport name for JwtUserStrategy: 'jwt'

@Injectable()
export class ServiceJwtGuard extends AuthGuard('service-jwt') {}
