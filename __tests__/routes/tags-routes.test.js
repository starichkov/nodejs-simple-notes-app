import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createTagsRouter } from '../../src/routes/tags-routes.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

describe('Tag routes', () => {
    function createApp(service) {
        const app = express();
        app.use('/api/tags', createTagsRouter(service));
        app.use(errorHandler);
        return app;
    }

    test('lists active tags', async () => {
        const response = await request(createApp({ listActiveTags: async () => ['Personal', 'Work'] })).get(
            '/api/tags',
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual(['Personal', 'Work']);
    });

    test('returns paginated notes by tag', async () => {
        const service = {
            findActiveNotesByTag: async (tag, pagination) => ({
                notes: [{ toObject: () => ({ id: '1', tags: [tag] }) }],
                total: 2,
                pagination,
            }),
        };

        const response = await request(createApp(service)).get('/api/tags/Work/notes?limit=1&offset=0');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: [{ id: '1', tags: ['Work'] }],
            pagination: { limit: 1, offset: 0, total: 2, hasNext: true },
        });
    });

    test('rejects invalid pagination and blank tags', async () => {
        const service = { findActiveNotesByTag: jest.fn() };
        const app = createApp(service);

        expect((await request(app).get('/api/tags/Work/notes?limit=0')).status).toBe(400);
        expect((await request(app).get('/api/tags/%20/notes')).status).toBe(400);
        expect(service.findActiveNotesByTag).not.toHaveBeenCalled();
    });

    test('translates repository failures', async () => {
        const app = createApp({
            listActiveTags: async () => {
                throw new Error('database failure');
            },
        });

        const response = await request(app).get('/api/tags');

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to retrieve tags');
    });
});
