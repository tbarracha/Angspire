export interface RegisterUserRequestDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userName?: string;
}

export interface RegisterServiceRequestDto {
  serviceName: string;
  clientSecret: string;
  scopes?: string[];
}

/* Auth – unchanged */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}