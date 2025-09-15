using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpireCore.API.JWT;
using SpireCore.API.JWT.Identity;
using SpireCore.Events.Dispatcher;
using SpireCore.Services;
using System.Security.Claims;
using Authentication.Configuration;
using Authentication.Domain.AuthUserIdentities;
using Authentication.Infrastructure;
using Authentication.Domain.RefreshTokens;
using Authentication.Domain.AllowedIpAddresses;
using Authentication.Domain.AuthAudits;
using Shared.Contracts.Events.Authentication;

namespace Authentication.Domain.Services;

public class AuthenticationService : IAuthIdentityService, ITransientService
{
    private readonly AuthenticationOptions _authOptions;
    private readonly ILogger<AuthenticationService> _logger;
    private readonly UserManager<AuthUserIdentity> _userManager;
    private readonly SignInManager<AuthUserIdentity> _signInManager;
    private readonly IConfiguration _config;
    private readonly IEventDispatcher _eventDispatcher;
    private readonly RefreshTokenRepository _refreshRepo;
    private readonly AuthAuditRepository _authAuditRepo;
    private readonly AllowedIpAddressRepository _ipRepo;
    private readonly IHttpContextAccessor _http;
    private readonly AuthDbContext _db;
    private readonly IJwtIdentityService _jwtService;

    private static bool isSuperAdminCreated = false;

    public AuthenticationService(ILogger<AuthenticationService> logger, UserManager<AuthUserIdentity> userManager, SignInManager<AuthUserIdentity> signInManager, IConfiguration config, IEventDispatcher eventDispatcher, RefreshTokenRepository refreshRepo, AuthAuditRepository authAuditRepo, AllowedIpAddressRepository ipRepo, IHttpContextAccessor httpContextAccessor, AuthDbContext dbContext, IJwtIdentityService jwtService, IOptions<AuthenticationOptions> authOptions)
    {
        _logger = logger;
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
        _eventDispatcher = eventDispatcher;
        _refreshRepo = refreshRepo;
        _authAuditRepo = authAuditRepo;
        _ipRepo = ipRepo;
        _http = httpContextAccessor;
        _db = dbContext;
        _jwtService = jwtService;
        _authOptions = authOptions.Value;
    }

    // -----------------------------  Admin seed -----------------------------
    public async Task EnsureSuperAdminAsync()
    {
        var superAdmin = _authOptions.SuperAdmin;
        var emailRaw = string.IsNullOrWhiteSpace(superAdmin?.Email) ? "admin@admin.com" : superAdmin!.Email.Trim();
        var username = "SuperAdmin";
        var password = string.IsNullOrWhiteSpace(superAdmin?.Password) ? "@Dm1n31415" : superAdmin!.Password;

        _logger.LogInformation("Seeding SuperAdmin: email={Email}, username={Username}", emailRaw, username);

        // Locate by email OR by username; prefer email first
        var user = await _userManager.FindByEmailAsync(emailRaw)
               ?? await _userManager.FindByNameAsync(username);

        if (user is null)
        {
            user = new AuthUserIdentity
            {
                UserName = username,
                Email = emailRaw,
                FirstName = "Super",
                LastName = "Admin",
                DisplayName = "SuperAdmin",
                EmailConfirmed = true,
                IsService = false
            };

            _logger.LogInformation("Creating SuperAdmin new user…");
            var created = await _userManager.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                foreach (var e in created.Errors)
                    _logger.LogError("SuperAdmin creation failed: {Code} - {Desc}", e.Code, e.Description);
                return;
            }

            _logger.LogInformation("SuperAdmin created: id={Id}", user.Id);
            return;
        }

        _logger.LogInformation("SuperAdmin exists: id={Id}. Reconciling state…", user.Id);

        // Ensure username is exactly "SuperAdmin"
        if (!string.Equals(user.UserName, username, StringComparison.Ordinal))
        {
            var setName = await _userManager.SetUserNameAsync(user, username);
            if (!setName.Succeeded)
                foreach (var e in setName.Errors)
                    _logger.LogError("SetUserName failed: {Code} - {Desc}", e.Code, e.Description);
            else
                _logger.LogInformation("UserName set to {Username}", username);
        }

        // Ensure email matches and normalized
        if (!string.Equals(user.Email, emailRaw, StringComparison.OrdinalIgnoreCase))
        {
            var setEmail = await _userManager.SetEmailAsync(user, emailRaw);
            if (!setEmail.Succeeded)
                foreach (var e in setEmail.Errors)
                    _logger.LogError("SetEmail failed: {Code} - {Desc}", e.Code, e.Description);
            else
                _logger.LogInformation("Email set to {Email}", emailRaw);
        }

        // Confirm email
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
            _logger.LogInformation("EmailConfirmed set to true.");
        }

        // Clear lockout / failures
        if (_userManager.SupportsUserLockout)
        {
            var hadLockout = user.LockoutEnd.HasValue || user.AccessFailedCount > 0;
            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);
            if (hadLockout) _logger.LogInformation("Lockout reset.");
        }

        // Ensure password matches configured one
        var hasPassword = await _userManager.HasPasswordAsync(user);
        var pwOk = hasPassword && await _userManager.CheckPasswordAsync(user, password);
        if (!pwOk)
        {
            _logger.LogInformation("Resetting SuperAdmin password to configured default.");
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var res = await _userManager.ResetPasswordAsync(user, token, password);
            if (!res.Succeeded)
            {
                foreach (var e in res.Errors)
                    _logger.LogError("Password reset failed: {Code} - {Desc}", e.Code, e.Description);
                return;
            }
            _logger.LogInformation("Password reset OK.");
        }
        else
        {
            _logger.LogInformation("Password already matches configured default.");
        }
    }

    public async Task EnsureAllowedIpsAsync()
    {
        var allowedIps = _authOptions.AllowedIps;
        foreach (var ip in allowedIps)
        {
            try { await _ipRepo.AddAsync(ip, "Config seed"); } catch { /* ignore dupes */ }
        }
    }


    // -----------------------------  IP-gate helpers  -----------------------------
    private string CallerIp => _http.HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? throw new Exception("Unable to resolve caller IP.");

    private async Task AssertIpAllowedAsync()
    {
        if (!await _ipRepo.IsAllowedAsync(CallerIp))
            throw new Exception("IP address not allowed for this service.");
    }

    /*  Public façade so admin UI / scripts can manipulate the whitelist  */
    public Task<bool> IsIpAllowedAsync(string ip) => _ipRepo.IsAllowedAsync(ip);
    public Task AddAllowedIpAsync(string ip, string? comment = null) => _ipRepo.AddAsync(ip, comment); // uses repo Add extension from earlier
    public Task RemoveAllowedIpAsync(string ip) => _ipRepo.RemoveAsync(ip);
    // --------------------------- helpers ---------------------------
    private IJwtUserIdentity BuildJwtUser(AuthUserIdentity user)
    {
        var raw = new Dictionary<string, object>();
        var jwt = new JwtUserIdentity
        {
            Id = user.Id,
            Issuer = _config["Jwt:Issuer"]!,
            RawClaims = raw,
            Email = user.Email,
            UserName = user.UserName,
            DisplayName = string.IsNullOrWhiteSpace(user.DisplayName) ? user.UserName : user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName,
            ImageUrl = user.ImageUrl
        };
        foreach (var c in jwt.ToClaims())
            raw[c.Type] = c.Value!;
        return jwt;
    }

    private IJwtServiceIdentity BuildJwtService(AuthUserIdentity svc, IEnumerable<string>? scopes)
    {
        var raw = new Dictionary<string, object>();
        var jwt = new JwtServiceIdentity
        {
            Id = svc.Id,
            Issuer = _config["Jwt:Issuer"]!,
            RawClaims = raw,
            ServiceName = svc.UserName!,
            Scopes = scopes?.ToArray() ?? Array.Empty<string>(),
            ImageUrl = svc.ImageUrl
        };
        foreach (var c in jwt.ToClaims())
            raw[c.Type] = c.Value!;
        return jwt;
    }

    private async Task<string> GenerateRefreshTokenAsync(AuthUserIdentity principal)
    {
        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var record = new RefreshToken
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            AuthUserId = principal.Id
        };
        await _refreshRepo.AddAsync(record);
        return token;
    }

    private Task LogAsync(AuthUserIdentity? user, string type, bool ok, string? why = null) => user is null ? Task.CompletedTask : _authAuditRepo.AddAsync(new AuthAudit { AuthUserId = user.Id, Type = type, WasSuccessful = ok, FailureReason = why, IpAddress = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString(), UserAgent = _http.HttpContext?.Request?.Headers["User-Agent"].ToString() });
    // -------------------------- user registration --------------------------
    public async Task<(string AccessToken, string RefreshToken)> RegisterUserAsync(string email, string password, string firstName, string lastName, string? username = null)
    {
        // 1️⃣  Use explicit username if caller supplied one, otherwise fall back to email
        var uname = !string.IsNullOrWhiteSpace(username) ? username.Trim() : email;
        var user = new AuthUserIdentity
        {
            UserName = uname,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            IsService = false
        };
        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            throw new Exception("Registration failed: " + string.Join(", ", result.Errors.Select(e => e.Description)));
        await LogAsync(user, AuthAuditType.Register, true);
        // -------------- issue tokens --------------
        var jwtUser = BuildJwtUser(user);
        var accessToken = _jwtService.GenerateJwt(jwtUser, jwtUser.BuildClaims());
        var refreshToken = await GenerateRefreshTokenAsync(user);
        await _eventDispatcher.PublishEventAsync(new AuthUserRegisteredEvent { AuthUserId = user.Id, Email = user.Email!, UserName = user.UserName!, FirstName = user.FirstName, LastName = user.LastName, RegisteredAt = DateTime.UtcNow, AccessToken = accessToken, RefreshToken = refreshToken, ImageUrl = user.ImageUrl });
        return (accessToken, refreshToken);
    }

    // -------------------------- service registration --------------------------
    public async Task<(string AccessToken, string RefreshToken)> RegisterServiceAsync(string serviceName, string clientSecret, IEnumerable<string>? scopes = null)
    {
        var svc = new AuthUserIdentity
        {
            UserName = serviceName,
            Email = null,
            IsService = true
        };
        var result = await _userManager.CreateAsync(svc, clientSecret);
        if (!result.Succeeded)
            throw new Exception("Service registration failed: " + string.Join(", ", result.Errors.Select(e => e.Description)));
        await LogAsync(svc, AuthAuditType.Register, true);
        var jwtSvc = BuildJwtService(svc, scopes);
        var accessToken = _jwtService.GenerateJwt(jwtSvc, jwtSvc.BuildClaims());
        var refresh = await GenerateRefreshTokenAsync(svc);
        await _eventDispatcher.PublishEventAsync(new AuthServiceRegisteredEvent { ServiceId = svc.Id, ServiceName = svc.UserName!, RegisteredAt = DateTime.UtcNow, AccessToken = accessToken, RefreshToken = refresh, ImageUrl = svc.ImageUrl });
        return (accessToken, refresh);
    }

    // ------------------------- login / shared -------------------------
    public async Task<(string AccessToken, string RefreshToken)> LoginAsync(string id, string pwd)
    {
        _logger.LogInformation("Login requested: {Identifier}", id);

        // Accept both email and username as input identifier
        var principal = await _userManager.FindByEmailAsync(id) ?? await _userManager.FindByNameAsync(id);
        if (principal is null)
        {
            _logger.LogWarning("Login failed: user not found for identifier {Identifier}", id);
            throw new Exception("Invalid credentials");
        }

        // This performs password verification + lockout counting without needing cookie auth
        var signIn = await _signInManager.CheckPasswordSignInAsync(principal, pwd, lockoutOnFailure: true);

        if (!signIn.Succeeded)
        {
            if (signIn.IsLockedOut)
            {
                _logger.LogWarning("Login failed: user locked out. Id={Id}", principal.Id);
                throw new Exception("Account locked");
            }
            if (signIn.IsNotAllowed)
            {
                _logger.LogWarning("Login failed: not allowed (email confirmed? two-factor?). Id={Id} EmailConfirmed={Confirmed}",
                    principal.Id, principal.EmailConfirmed);
                throw new Exception("Not allowed");
            }
            if (signIn.RequiresTwoFactor)
            {
                _logger.LogWarning("Login requires 2FA. Id={Id}", principal.Id);
                throw new Exception("Two-factor required");
            }

            _logger.LogWarning("Login failed: invalid password. Id={Id}", principal.Id);
            throw new Exception("Invalid credentials");
        }

        // --- Persist login metadata ---
        principal.UpdatedAt = DateTime.UtcNow;
        principal.LastLoginAt = DateTime.UtcNow;
        principal.LastLoginIp = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString();
        principal.LastLoginUserAgent = _http.HttpContext?.Request?.Headers["User-Agent"].ToString();
        _logger.LogInformation("UpdatedAt.Kind={Kind}, LastLoginAt.Kind={Kind2}", principal.UpdatedAt.Kind.ToString(), principal.LastLoginAt.HasValue ? principal.LastLoginAt.Value.Kind.ToString() : "null");
        await _userManager.UpdateAsync(principal);
        await LogAsync(principal, AuthAuditType.Login, true);
        // --- Build JWT & refresh token ---
        var jwt = principal.IsService ? (IJwtIdentity)BuildJwtService(principal, null) : BuildJwtUser(principal);
        var access = _jwtService.GenerateJwt(jwt, jwt switch
        {
            IJwtUserIdentity u => u.BuildClaims(),
            IJwtServiceIdentity s => s.BuildClaims(),
            _ => Array.Empty<Claim>()
        });
        var refresh = await GenerateRefreshTokenAsync(principal);
        // --- Raise the correct domain event ---
        if (principal.IsService)
        {
            await _eventDispatcher.PublishEventAsync(new AuthServiceLoggedInEvent
            { // IJwtServiceIdentity
                Id = principal.Id,
                Issuer = jwt.Issuer,
                RawClaims = jwt.RawClaims,
                ServiceId = principal.Id,
                ServiceName = principal.UserName!,
                Scopes = Array.Empty<string>(), // add scopes if you store them
                                                // tokens
                AccessToken = access,
                RefreshToken = refresh, // specific
                LoggedInAt = DateTime.UtcNow,
                ImageUrl = principal.ImageUrl
            });
        }
        else
        {
            await _eventDispatcher.PublishEventAsync(new AuthUserLoggedInEvent
            { // IJwtUserIdentity
                Id = principal.Id,
                Issuer = jwt.Issuer,
                RawClaims = jwt.RawClaims,
                AuthUserId = principal.Id,
                Email = principal.Email!,
                UserName = principal.UserName!,
                DisplayName = principal.DisplayName,
                FirstName = principal.FirstName,
                LastName = principal.LastName,
                ImageUrl = principal.ImageUrl, // tokens
                AccessToken = access,
                RefreshToken = refresh, // specific
                LoggedInAt = DateTime.UtcNow
            });
        }

        return (access, refresh);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var record = await _refreshRepo.GetValidTokenAsync(refreshToken);
        if (record is null)
            return;
        await _refreshRepo.RevokeTokenAsync(record);
        await LogAsync(record.AuthUser, AuthAuditType.Logout, true);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string token)
    {
        var rec = await _refreshRepo.GetValidTokenAsync(token) ?? throw new Exception("Invalid or expired refresh token");
        await _refreshRepo.RevokeTokenAsync(rec);
        var newRefresh = await GenerateRefreshTokenAsync(rec.AuthUser!);
        var jwt = rec.AuthUser!.IsService ? (IJwtIdentity)BuildJwtService(rec.AuthUser, null) : BuildJwtUser(rec.AuthUser);
        var newAccess = _jwtService.GenerateJwt(jwt, jwt switch
        {
            IJwtUserIdentity u => u.ToClaims(),
            IJwtServiceIdentity s => s.ToClaims(),
            _ => Array.Empty<Claim>()
        });
        return (newAccess, newRefresh);
    }

    // ------------------------- queries -------------------------
    public Task<AuthUserIdentity?> GetAuthIdentityByIdAsync(Guid id) => _userManager.FindByIdAsync(id.ToString())!;
    public async Task<AuthUserIdentity?> GetCurrentUserAsync(ClaimsPrincipal principal)
    {
        var id = principal.GetUserId();
        return id is null ? null : await _userManager.FindByIdAsync(id.Value.ToString());
    }

    public async Task<AuthUserIdentity?> GetUserByTokenAsync(string jwtToken)
    {
        var id = _jwtService.GetIdFromToken(jwtToken);
        return id is null ? null : await _userManager.FindByIdAsync(id.Value.ToString());
    }

    public ClaimsPrincipal? ValidateJwt(string token) => _jwtService.ValidateJwt(token);
}