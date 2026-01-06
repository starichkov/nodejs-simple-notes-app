import { jest } from '@jest/globals';
import { NoteRepository } from '../../src/db/note-repository.js';
import * as apiServer from '../../src/notes-api-server.js';

describe('Extra Coverage Tests', () => {
    describe('NoteRepository Base Class', () => {
        const repo = new NoteRepository();
        const methods = [
            'findAll', 'findDeleted', 'findAllIncludingDeleted', 'findById',
            'create', 'update', 'moveToRecycleBin', 'restore', 'permanentDelete',
            'emptyRecycleBin', 'restoreAll', 'countDeleted'
        ];

        test.each(methods)('%s should throw Method not implemented', async (method) => {
            await expect(repo[method]()).rejects.toThrow('Method not implemented');
        });
    });

    describe('API Server Backward Compatibility Exports', () => {
        test('should export app', () => {
            expect(apiServer.app).toBeDefined();
        });

        test('should export createNoteRepository', () => {
            expect(typeof apiServer.createNoteRepository).toBe('function');
        });

        test('should export gracefulShutdown', () => {
            expect(typeof apiServer.gracefulShutdown).toBe('function');
        });

        test('should export initializeApp', async () => {
            expect(typeof apiServer.initializeApp).toBe('function');
            // Mock repository to avoid real DB connection
            const mockRepo = {
                init: jest.fn().mockResolvedValue()
            };
            const result = await apiServer.initializeApp(mockRepo);
            expect(result.repository).toBe(mockRepo);
        });

        test('should export startServer', () => {
            expect(typeof apiServer.startServer).toBe('function');
        });
    });
});
