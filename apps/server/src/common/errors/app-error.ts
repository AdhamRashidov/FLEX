/**
 * Barcha biznes-xatolar uchun asosiy sinf
 * SOLID: Liskov Substitution — har bir kichik sinf AppError o'rnida ishlatilishi mumkin
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Avtorizatsiya talab qilinadi') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Ruxsat berilmagan') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} topilmadi`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR', false);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'So\'rovlar soni me\'yordan oshdi. Iltimos biroz kuting.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

