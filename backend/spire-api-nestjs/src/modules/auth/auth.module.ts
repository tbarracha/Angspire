// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthenticationService } from './authentication.service';

// Operations
import {
  LoginOperation,
  RegisterUserOperation,
  RegisterServiceOperation,
  LogoutOperation,
  RefreshTokenOperation,
  GetJwtIdentityByTokenOperation,
} from './operations/auth.operations';

// Pluggable stores (default in-memory)
import { USER_STORE, InMemoryUserStore, REFRESH_TOKEN_STORE, InMemoryRefreshTokenStore } from './stores';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_KEY') ?? 'dev-key',
        signOptions: {
          issuer: cfg.get<string>('JWT_ISSUER') ?? 'http://localhost',
          audience: cfg.get<string>('JWT_AUDIENCE') ?? 'http://localhost',
          expiresIn: `${cfg.get<number>('JWT_ACCESS_TOKEN_MINUTES') ?? 60}m`,
        },
      }),
    }),
  ],
  providers: [
    AuthenticationService,
    // swap these later for TypeORM-backed stores
    { provide: USER_STORE, useClass: InMemoryUserStore },
    { provide: REFRESH_TOKEN_STORE, useClass: InMemoryRefreshTokenStore },

    // operations
    LoginOperation,
    RegisterUserOperation,
    RegisterServiceOperation,
    LogoutOperation,
    RefreshTokenOperation,
    GetJwtIdentityByTokenOperation,
  ],
  exports: [AuthenticationService],
})
export class AuthModule {}
