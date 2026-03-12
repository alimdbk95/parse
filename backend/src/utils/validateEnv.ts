import { logger } from './logger';

interface EnvConfig {
  required: string[];
  optional: { key: string; warning: string }[];
}

const envConfig: EnvConfig = {
  required: ['DATABASE_URL', 'JWT_SECRET'],
  optional: [
    {
      key: 'ANTHROPIC_API_KEY',
      warning: 'ANTHROPIC_API_KEY not set - AI features will be disabled',
    },
    {
      key: 'RESEND_API_KEY',
      warning: 'RESEND_API_KEY not set - email features will be disabled',
    },
    {
      key: 'SENTRY_DSN',
      warning: 'SENTRY_DSN not set - error tracking will be disabled',
    },
    {
      key: 'AWS_ACCESS_KEY_ID',
      warning: 'AWS credentials not set - S3 uploads will be disabled',
    },
  ],
};

/**
 * Validates environment variables at startup
 * Throws an error if required variables are missing
 * Logs warnings for missing optional variables
 */
export function validateEnv(): void {
  // Check required variables
  const missing = envConfig.required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }

  // Log warnings for optional variables
  envConfig.optional.forEach(({ key, warning }) => {
    if (!process.env[key]) {
      logger.warn(warning);
    }
  });

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    logger.warn(
      'JWT_SECRET is shorter than 32 characters - consider using a stronger secret'
    );
  }

  logger.info('Environment validation passed');
}
