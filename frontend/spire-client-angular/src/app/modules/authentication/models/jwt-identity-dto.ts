
/* Generic slice of the JWT identity */
export interface JwtIdentityDto {
  id: string;
  issuer: string;
  isService: boolean;
  rawClaims: Record<string, unknown>;
}

/* Human user – extends the generic */
export interface JwtUserIdentityDto extends JwtIdentityDto {
  email: string;
  userName: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

/* Machine / service principal */
export interface JwtServiceIdentityDto extends JwtIdentityDto {
  serviceName: string;
  scopes: string[];
}