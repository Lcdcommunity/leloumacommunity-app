//src/config/swagger.config.ts
export default () => ({
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED || 'true') === 'true',
    path: process.env.SWAGGER_PATH || 'docs',
  },
});