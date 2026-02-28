import { ValidationPipe } from '@nestjs/common';

/**
 * Pre-configured ValidationPipe using class-validator + class-transformer.
 * Import and use in main.ts or in specific controllers/routes.
 *
 * @example  app.useGlobalPipes(AppValidationPipe);
 */
export const AppValidationPipe = new ValidationPipe({
  whitelist: true,               // Strip properties not in DTO
  transform: true,               // Auto-transform payloads to DTO class instances
  forbidNonWhitelisted: true,    // Throw if extra properties are sent
  transformOptions: {
    enableImplicitConversion: true, // Convert query params to correct types
  },
});
