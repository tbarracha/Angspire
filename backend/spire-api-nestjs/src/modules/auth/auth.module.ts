// src/modules/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';

import {
  InMemoryUserStore,
  InMemoryRefreshTokenStore,
  USER_STORE,
  REFRESH_TOKEN_STORE,
} from './stores';

@Global() // <-- make providers visible app-wide
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
    { provide: USER_STORE, useClass: InMemoryUserStore },
    { provide: REFRESH_TOKEN_STORE, useClass: InMemoryRefreshTokenStore },
  ],
  exports: [
    AuthenticationService,
    USER_STORE,
    REFRESH_TOKEN_STORE,
    JwtModule, // jwt verify/sign for any consumer
  ],
})
export class AuthModule {}
