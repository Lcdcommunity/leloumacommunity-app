//src/config/auth.config.ts
export default () => ({
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30),
  },
}); 