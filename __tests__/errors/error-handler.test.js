import express from 'express';
import request from 'supertest';
import { BadRequestError, InternalServerError, NotFoundError } from '../../src/errors/app-error.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

function createErrorApp(error) {
    const app = express();
    app.get('/', (req, res, next) => next(error));
    app.use(errorHandler);
    return app;
}

describe('Application errors', () => {
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
});
