// src/modules/auth/operations/auth.operations.ts
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, IsArray } from 'class-validator';

import {
  Operation, OperationAuthorize, OperationDto, OperationGroup, OperationMethod, OperationRoute,
  OperationBaseCore, IOperation, OperationContext
} from 'src/spire-core/operations/operations.contracts';

import { IJwtIdentity, JwtUserIdentity } from 'src/spire-core/jwt/jwt.identity';
import { AuthenticationService } from '../authentication.service';

/* ---------------- DTOs ---------------- */
export class LoginRequestDto {
  @ApiProperty({ description: 'Email or Username' }) @IsString() identifier!: string;
  @ApiProperty() @IsString() password!: string;
}
export class RegisterUserRequestDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @MinLength(6) @IsString() password!: string;
  @ApiProperty() @IsString() firstName!: string;
  @ApiProperty() @IsString() lastName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userName?: string;
}
export class RegisterServiceRequestDto {
  @ApiProperty() @MinLength(3) @IsString() serviceName!: string;
  @ApiProperty() @MinLength(12) @IsString() clientSecret!: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
}
export class LogoutRequestDto { @ApiProperty() @IsString() refreshToken!: string; }
export class RefreshTokenRequestDto { @ApiProperty() @IsString() refreshToken!: string; }
export class AuthResponseDto { @ApiProperty() accessToken!: string; @ApiProperty() refreshToken!: string; }
export class GetJwtIdentityRequest { @ApiPropertyOptional() @IsOptional() @IsString() token?: string; }

/* -------------- Base op -------------- */
abstract class AuthOperation<TReq, TRes> extends OperationBaseCore<TReq> implements IOperation<TReq, TRes> {
  constructor(protected readonly auth: AuthenticationService) { super(); }
  protected abstract handle(req: TReq): Promise<TRes>;
  async execute(req: TReq, _ctx: OperationContext): Promise<TRes> {
    await this._onBefore(req);
    const res = await this.handle(req);
    await this._onAfter(req);
    return res;
  }
}

/* -------------- Ops -------------- */
@Operation({ group: 'Auth Public', route: '/auth/login', method: 'POST' })
@OperationDto({ request: LoginRequestDto, response: AuthResponseDto })
@Injectable()
export class LoginOperation extends AuthOperation<LoginRequestDto, AuthResponseDto> {
  protected async handle(req: LoginRequestDto) {
    if (!this.auth) throw new Error('AuthenticationService not injected (check AuthModule imports/exports).');
    return this.auth.loginAsync(req.identifier, req.password);
  }
}

@Operation({ group: 'Auth Public', route: '/auth/register/user', method: 'POST' })
@OperationDto({ request: RegisterUserRequestDto, response: AuthResponseDto })
@Injectable()
export class RegisterUserOperation extends AuthOperation<RegisterUserRequestDto, AuthResponseDto> {
  protected async handle(req: RegisterUserRequestDto) {
    return this.auth.registerUserAsync(req.email, req.password, req.firstName, req.lastName, req.userName);
  }
}

@Operation({ group: 'Auth Public', route: '/auth/register/service', method: 'POST' })
@OperationDto({ request: RegisterServiceRequestDto, response: AuthResponseDto })
@Injectable()
export class RegisterServiceOperation extends AuthOperation<RegisterServiceRequestDto, AuthResponseDto> {
  protected async handle(req: RegisterServiceRequestDto) {
    return this.auth.registerServiceAsync(req.serviceName, req.clientSecret, req.scopes);
  }
}

@Operation({ group: 'Auth Public', route: '/auth/logout', method: 'POST' })
@OperationAuthorize()
@OperationDto({ request: LogoutRequestDto, response: Object })
@Injectable()
export class LogoutOperation extends AuthOperation<LogoutRequestDto, Record<string, never>> {
  protected async handle(req: LogoutRequestDto) {
    await this.auth.logoutAsync(req.refreshToken);
    return {};
  }
}

@Operation({ group: 'Auth Public', route: '/auth/refresh', method: 'POST' })
@OperationAuthorize()
@OperationDto({ request: RefreshTokenRequestDto, response: AuthResponseDto })
@Injectable()
export class RefreshTokenOperation extends AuthOperation<RefreshTokenRequestDto, AuthResponseDto> {
  protected async handle(req: RefreshTokenRequestDto) {
    return this.auth.refreshTokenAsync(req.refreshToken);
  }
}

@Operation({ group: 'Auth Public', route: '/auth/get/jwtidentity', method: 'POST' })
@OperationAuthorize()
@OperationDto({ request: GetJwtIdentityRequest, response: JwtUserIdentity }) // doc a single shape
@Injectable()
export class GetJwtIdentityByTokenOperation extends AuthOperation<GetJwtIdentityRequest, IJwtIdentity | null> {
  protected async handle(req: GetJwtIdentityRequest) {
    let token = (req?.token ?? '').trim();
    if (!token) token = this.auth.tryGetBearerFromHeader() ?? '';
    if (!token) token = this.auth.tryGetTokenFromQuery() ?? '';
    if (!token) return null;

    token = token.replace(/^"+|"+$/g, '').trim();
    const payload = this.auth.validateJwt(token);
    if (!payload) return null;

    const isService = this.auth.hasClaim(payload, 'client_id');
    return isService ? this.auth.mapToServiceIdentity(payload) : this.auth.mapToUserIdentity(payload);
  }
}
