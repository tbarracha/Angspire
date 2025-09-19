export const environment = {
    production: false,
    apiUrl: 'https://localhost:7094/api',

    authentication: {
        tokenKey: 'auth_token',
        refreshTokenKey: 'auth_refresh_token',
        userKey: 'jwt_user'
    },

    enabledAuthGuard: true,
};
