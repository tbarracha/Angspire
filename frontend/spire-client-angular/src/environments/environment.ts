export const environment = {
    production: false,
    apiUrl: 'https://localhost:7094/api',

    authentication: {
        tokenKey: 'auth_token',
        refreshTokenKey: 'auth_refresh_token',
        userKey: 'jwt_user'
    },

    enabledAuthGuard: true,

    genAI: {
        DEFAULT_PROVIDER: 'Ollama',
        DEFAULT_MODEL: 'gemma3:4b',
        //DEFAULT_PROVIDER: 'OpenRouter',
        //DEFAULT_MODEL: 'google/gemma-3-27b-it:free',

        Ollama: {
            endpoint: 'http://localhost:11434/api/chat',
            defaultModel: 'gemma3:4b'
        },

        OpenRouter: {
            apiKey: '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',
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            defaultModel: 'google/gemma-3-27b-it:free'
        }
    }
};
