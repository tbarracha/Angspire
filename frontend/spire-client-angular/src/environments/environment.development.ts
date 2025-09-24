export const environment = {
  production: false,
  apiUrl: "https://localhost:7094/api",

  authentication: {
    tokenKey: "auth_token",
    refreshTokenKey: "auth_refresh_token",
    userKey: "jwt_user",
    // Optional: extend/override whitelist here
    authHeaderWhitelist: [
      "https://openrouter.ai/api/v1",
      "https://api.openai.com/v1",
      "https://accounts.google.com",
    ],
  },

  enabledAuthGuard: true,
  useLocalStorage: true,
};
