import { jest } from '@jest/globals';
import { BadRequestError } from '../../src/errors/app-error.js';
import { TagService } from '../../src/services/tag-service.js';

describe('TagService', () => {
    test('lists unique tags in deterministic order', async () => {
        const repository = { findTags: jest.fn().mockResolvedValue(['work', 'Personal', 'Work']) };

        await expect(new TagService(repository).listActiveTags()).resolves.toEqual(['Personal', 'work', 'Work']);
    });

    test('normalizes tag lookup and delegates pagination', async () => {
        const result = { notes: [], total: 0 };
        const repository = { findAllByTag: jest.fn().mockResolvedValue(result) };

        await expect(new TagService(repository).findActiveNotesByTag(' Work ', { limit: 10, offset: 2 })).resolves.toBe(
            result,
        );
        expect(repository.findAllByTag).toHaveBeenCalledWith('Work', { limit: 10, offset: 2 });
    });

    test('rejects blank tag lookup', async () => {
        await expect(new TagService({}).findActiveNotesByTag('   ', { limit: 20, offset: 0 })).rejects.toEqual(
            new BadRequestError('tag must be a non-empty string'),
        );
    });

    test('propagates repository failures', async () => {
        const error = new Error('database failure');
        const repository = { findTags: jest.fn().mockRejectedValue(error) };

        await expect(new TagService(repository).listActiveTags()).rejects.toBe(error);
    });
});
