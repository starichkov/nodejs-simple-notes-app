import express from 'express';
import { BadRequestError, InternalServerError } from '../errors/app-error.js';
import { normalizeTags, parsePagination } from '../validation/request-validation.js';

/**
 * Create routes for active-note tag discovery and filtering.
 * @param {TagService} tagService - Tag use-case service
 * @returns {express.Router} Configured tag router
 * @example app.use('/api/tags', createTagsRouter(tagService));
 */
export function createTagsRouter(tagService) {
    const router = express.Router();

    /**
     * List tags used by active notes.
     * @returns {string[]} Unique tags in deterministic alphabetical order
     */
    router.get('/', async (req, res, next) => {
        try {
            res.json(await tagService.listActiveTags());
        } catch (error) {
            next(new InternalServerError('Failed to retrieve tags', { cause: error }));
        }
    });

    /**
     * List active notes carrying a tag.
     * @param {string} req.params.tag - Tag to match case-insensitively
     * @returns {Object} Paginated matching notes
     */
    router.get('/:tag/notes', async (req, res, next) => {
        try {
            const pagination = parsePagination(req.query);
            const normalizedTag = normalizeTags([req.params.tag]);
            if (normalizedTag.length === 0) {
                throw new BadRequestError('tag must be a non-empty string');
            }
            const result = await tagService.findActiveNotesByTag(normalizedTag[0], pagination);
            res.json({
                data: result.notes.map((note) => note.toObject()),
                pagination: {
                    ...pagination,
                    total: result.total,
                    hasNext: pagination.offset + pagination.limit < result.total,
                },
            });
        } catch (error) {
            next(
                error instanceof BadRequestError
                    ? error
                    : new InternalServerError('Failed to retrieve notes by tag', { cause: error }),
            );
        }
    });

    return router;
}
