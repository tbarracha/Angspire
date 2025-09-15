# ?? Authentication Module

## ?? AI Generated - Contains Wrong or Incomplete Information ??

> **“Prove you are who you say you are—then get out of the way.”**
> The **Authentication** module gives SpireKit a focused, replaceable login stack: JWT + long-lived refresh tokens, audit logs, and pluggable identity providers.
> **Nothing more, nothing less.**

---

## ?? Why keep auth separate?

| Reason                    | Benefit                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| **Single responsibility** | No RBAC or business permissions here—that’s the IAM module.        |
| **Easy swaps**            | Want Azure AD, Cognito, Auth0? Replace `IAuthUserIdentityService`. |
| **Security hardening**    | Auth concerns live in one place; fewer accidental leaks.           |

---

## ?? Folder Layout (vertical, per-aggregate)

```
Modules/
+-- Authentication/
    +-- Configuration/
    ¦   +-- AuthSettings.cs          # Signing key, token lifetime, etc.
    +-- Domain/
    ¦   +-- AuthAudits/              # Login/Logout audit trail
    ¦   ¦   +-- Models/
    ¦   ¦   ¦   +-- AuthAudit.cs
    ¦   ¦   +-- Repositories/
    ¦   ¦       +-- AuthAuditRepository.cs
    ¦   +-- AuthUserIdentities/      # Local or external login identity
    ¦   ¦   +-- AuthUserIdentity.cs
    ¦   +-- RefreshTokens/
    ¦       +-- Models/
    ¦       ¦   +-- RefreshToken.cs
    ¦       +-- Repositories/
    ¦           +-- RefreshTokenRepository.cs
    +-- Services/
    ¦   +-- AuthenticationService.cs     # Login / token minting
    ¦   +-- AuthTokenHelper.cs           # JWT + refresh helpers
    ¦   +-- IAuthUserIdentityService.cs  # Abstraction for user store
    +-- Infrastructure/
    ¦   +-- AuthDbContext.cs
    ¦   +-- BaseAuthEntity.cs
    ¦   +-- BaseAuthEntityRepository.cs
    +-- Operations/
    ¦   +-- LoginOperation.cs
    ¦   +-- LogoutOperation.cs
    ¦   +-- RegisterOperation.cs
    ¦   +-- RefreshTokenOperation.cs
    ¦   +-- GetCurrentUserOperation.cs
    ¦   +-- GetUserByIdOperation.cs
    ¦   +-- GetUserByTokenOperation.cs
    +-- AuthModuleExtensions.cs      # DI entry-point (AddAuthenticationServices)
```

*Every aggregate (Audits, RefreshTokens, Identities) keeps its own models & repos.*
Endpoints (Operations) live at module root—mirrors the auth surface.

---

## ?? Token Workflow

1. **Login / Register**
   `POST /api/auth/login` or `/register` returns:

   ```json
   {
     "accessToken":  "...JWT...",
     "refreshToken": "...GUID...",
     "expiresIn": 900
   }
   ```
2. **Authenticated calls** — supply `Authorization: Bearer <accessToken>`.
3. **Refresh**
   `POST /api/auth/refresh` with body `{ "refreshToken": "..." }`
   *Valid refresh ? new JWT + new refresh token (rotate-on-use).*
4. **Logout** — `POST /api/auth/logout` revokes the given refresh token.

> **Refresh tokens** live in `RefreshTokens` table, soft-deleted on logout/rotation.

---

## ??? Audit Trail

Every auth attempt is logged:

| Column                    | Example                                        |
| ------------------------- | ---------------------------------------------- |
| **Type**                  | `Login`, `Logout`, `Register`, `PasswordReset` |
| **WasSuccessful**         | `true/false`                                   |
| **FailureReason**         | `InvalidPassword`                              |
| **IpAddress / UserAgent** | captured automatically                         |

Use `AuthAuditRepository` to query or build dashboards.

---

## ?? Pluggable Identity Source

`IAuthUserIdentityService`

```csharp
public interface IAuthUserIdentityService : ITransientService
{
    Task<AuthUserIdentity?> FindByUsernameAsync(string username);
    Task<AuthUserIdentity> CreateAsync(string username, string hashedPassword, string email);
    Task<bool> VerifyPasswordAsync(AuthUserIdentity user, string password);
}
```

* Default impl stores identities in `AuthUserIdentities` table.
* Swap with Azure AD / external SSO by replacing DI registration.

---

## ?? Integration Events

| Event                     | Emitted by                  | Used by                                              |
| ------------------------- | --------------------------- | ---------------------------------------------------- |
| **`AuthUserRegistered`**  | `RegisterOperation`         | IAM module auto-creates `IamUser` and default roles. |
| **`RefreshTokenRevoked`** | `LogoutOperation`, rotation | Optional listeners can act on suspicious activity.   |

---

## ?? Securing Endpoints

```csharp
[OperationAuthorize]                         // Any authenticated user
public class GetCurrentUserOperation : IOperation<object, UserDto> { … }

[OperationAuthorize("Permission=User.Read")] // Auth + IAM permission
public class GetUserByIdOperation : IOperation<GetUserByIdDto, UserDto> { … }
```

*Auth is enforced by default JwtBearer middleware; fine-grained checks are IAM’s job.*

---

## ??? Extending / Replacing

* **Password rules** ? change `AuthenticationService.ValidatePasswordAsync`.
* **Multi-factor auth** ? emit `AuthAudit` of type `TwoFactor` before issuing final JWT.
* **Token format** ? override `AuthTokenHelper.GenerateAccessToken`.

---

## ?? Quick Demo

```bash
# Register a new account
curl -X POST https://localhost:5001/api/auth/register \
     -d '{ "username":"demo", "password":"P@ssw0rd!", "email":"demo@site.com" }'

# Login
curl -X POST https://localhost:5001/api/auth/login \
     -d '{ "username":"demo", "password":"P@ssw0rd!" }' \
     | jq .

# Call protected route
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     https://localhost:5001/api/users/me
```

---

**Stateless JWT, rotatable refresh tokens, first-class audit trail—
SpireKit Authentication keeps you secure without locking you in.**

