//src/config/rate-limit.config.ts
export default () => ({
  rateLimit: {
    ttl: Number(process.env.THROTTLE_TTL ?? 60),
    limit: Number(process.env.THROTTLE_LIMIT ?? 120),
  },
});