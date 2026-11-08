import { AppError, BadRequestError, InternalServerError } from '../errors/app-error.js';
import { createLogger } from '../logger.js';

const log = createLogger('ErrorHandler');

/**
 * Express error middleware that translates known errors consistently and does
 * not expose implementation details for unexpected failures.
 *
 * @param {Error} error - Error passed by Express
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Express next function
 * @returns {void}
 */
export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    const apiError = toAppError(error);
    log.error(`${req.method} ${req.originalUrl}:`, error);

    res.status(apiError.statusCode).json({ error: apiError.message });
}

function toAppError(error) {
    if (error instanceof AppError) {
        return error;
    }

    if (error?.type === 'entity.parse.failed') {
        return new BadRequestError('Invalid JSON');
    }

    return new InternalServerError();
}
