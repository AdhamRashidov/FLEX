import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

function formatZodError(error: ZodError): string {
  return error.errors
    .map((err) => {
      const field = err.path.join('.');
      return field ? `${field}: ${err.message}` : err.message;
    })
    .join('; ');
}

/**
 * Request Body ni Zod sxemasi orqali tekshiruvchi middleware
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new ValidationError(formatZodError(result.error));
    }

    req.body = result.data;
    next();
  };
}

/**
 * Request Query parametrlarini Zod sxemasi orqali tekshiruvchi middleware
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      throw new ValidationError(formatZodError(result.error));
    }

    req.query = result.data as Record<string, any>;
    next();
  };
}

/**
 * Request URL parametrlarini Zod sxemasi orqali tekshiruvchi middleware
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      throw new ValidationError(formatZodError(result.error));
    }

    req.params = result.data as Record<string, string>;
    next();
  };
}
