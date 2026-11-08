import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { AppError, BadRequestError, InternalServerError, NotFoundError } from '../../src/errors/app-error.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

function createErrorApp(error) {
    const app = express();
    app.get('/', (req, res, next) => next(error));
    app.use(errorHandler);
    return app;
}

describe('Application errors', () => {
    test('uses default values for standard application errors', () => {
        expect(new BadRequestError()).toMatchObject({
            message: 'Bad request',
            statusCode: 400,
            code: 'BAD_REQUEST',
        });
        expect(new NotFoundError()).toMatchObject({
            message: 'Not found',
            statusCode: 404,
            code: 'NOT_FOUND',
        });
        expect(new InternalServerError()).toMatchObject({
            message: 'Internal server error',
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR',
        });
    });

    test('preserves application error options and cause', () => {
        const cause = new Error('root cause');
        const error = new AppError('Custom failure', 422, 'CUSTOM_FAILURE', { cause });

        expect(error).toMatchObject({
            message: 'Custom failure',
            statusCode: 422,
            code: 'CUSTOM_FAILURE',
            cause,
            isOperational: true,
        });
    });

    test('uses default options for a base application error', () => {
        const error = new AppError('Custom failure', 422, 'CUSTOM_FAILURE');

        expect(error).toMatchObject({
            message: 'Custom failure',
            statusCode: 422,
            code: 'CUSTOM_FAILURE',
            isOperational: true,
        });
    });

    test('exposes status and stable code for typed errors', () => {
        const error = new NotFoundError('Note not found');

        expect(error).toMatchObject({
            message: 'Note not found',
            statusCode: 404,
            code: 'NOT_FOUND',
            isOperational: true,
        });
    });

    test('translates typed errors using the existing response shape', async () => {
        const response = await request(createErrorApp(new BadRequestError('Invalid note'))).get('/');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid note' });
    });

    test('hides unexpected error details', async () => {
        const response = await request(createErrorApp(new Error('database password'))).get('/');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
        expect(response.body.error).not.toContain('database password');
    });

    test('keeps internal error causes available for server-side diagnostics', () => {
        const cause = new Error('connection refused');
        const error = new InternalServerError('Failed to retrieve notes', { cause });

        expect(error.cause).toBe(cause);
    });

    test('passes errors to next when the response has already started', () => {
        const error = new Error('headers already sent');
        const next = jest.fn();
        const response = { headersSent: true };

        expect(errorHandler(error, {}, response, next)).toBeUndefined();
        expect(next).toHaveBeenCalledWith(error);
    });
});
