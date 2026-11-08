/**
 * Base class for errors that are safe to translate into an API response.
 */
export class AppError extends Error {
    /**
     * @param {string} message - Client-safe error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Stable machine-readable error code
     * @param {object} [options] - Error options
     * @param {Error} [options.cause] - Original error
     */
    constructor(message, statusCode, code, options = {}) {
        super(message, options);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request', options = {}) {
        super(message, 400, 'BAD_REQUEST', options);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found', options = {}) {
        super(message, 404, 'NOT_FOUND', options);
    }
}

export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', options = {}) {
        super(message, 500, 'INTERNAL_SERVER_ERROR', options);
    }
}
