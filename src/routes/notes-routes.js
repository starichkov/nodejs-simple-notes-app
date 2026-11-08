import express from 'express';
import { BadRequestError, InternalServerError, NotFoundError } from '../errors/app-error.js';
import { errorHandler } from '../middleware/error-handler.js';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

function parsePagination(query) {
    const values = ['limit', 'offset'].map((name) => query[name]);
    const [limitValue, offsetValue] = values;
    const isValidInteger = (value) =>
        typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value));

    if (
        limitValue !== undefined &&
        (!isValidInteger(limitValue) || Number(limitValue) < 1 || Number(limitValue) > MAX_PAGE_LIMIT)
    ) {
        throw new BadRequestError(`limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`);
    }
    if (offsetValue !== undefined && (!isValidInteger(offsetValue) || Number(offsetValue) < 0)) {
        throw new BadRequestError('offset must be a non-negative integer');
    }

    return {
        limit: limitValue === undefined ? DEFAULT_PAGE_LIMIT : Number(limitValue),
        offset: offsetValue === undefined ? 0 : Number(offsetValue),
    };
}

/**
 * Create a router for note-related endpoints
 * @param {NoteRepository} noteRepository - Repository for note operations (CouchDB or MongoDB implementation)
 * @returns {express.Router} Express router configured with note endpoints
 * @example
 * import { createNotesRouter } from './routes/notes-routes.js';
 * import { CouchDbNoteRepository } from './db/couchdb-note-repository.js';
 *
 * const repository = new CouchDbNoteRepository(url, dbName);
 * const router = createNotesRouter(repository);
 * app.use('/api/notes', router);
 */
export function createNotesRouter(noteRepository) {
    const router = express.Router();

    /**
     * @name GET /notes
     * @description Retrieve a page of active notes from the database
     * @route GET /?limit=20&offset=0
     * @returns {Object} 200 - Active notes and pagination metadata
     * @returns {Object[]} 200.data - Array of active note objects
     * @returns {Object} 400 - Invalid pagination parameters
     * @returns {Object} 500 - Error response
     * @example
     * // Optional parameters: limit (default 20, maximum 100), offset (default 0).
     * // Both values must be integers; limit must be positive and offset non-negative.
     * // Response format: { data: [], pagination: { limit, offset, total, hasNext } }
     */
    router.get('/', async (req, res, next) => {
        try {
            const pagination = parsePagination(req.query);
            const result = await noteRepository.findAll(pagination);
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
                    : new InternalServerError('Failed to retrieve notes', { cause: error }),
            );
        }
    });

    /**
     * @name GET /notes/search
     * @description Search active notes by title or content
     * @route GET /search?q=keyword
     * @returns {Object[]} 200 - Array of matching active note objects
     * @returns {Object} 400 - Missing or blank search query
     * @returns {Object} 500 - Error response
     */
    router.get('/search', async (req, res, next) => {
        try {
            const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : '';
            if (!keyword) {
                throw new BadRequestError('Search query is required');
            }

            const notes = await noteRepository.search(keyword);
            res.json(notes.map((note) => note.toObject()));
        } catch (error) {
            next(
                error instanceof BadRequestError
                    ? error
                    : new InternalServerError('Failed to search notes', { cause: error }),
            );
        }
    });

    /**
     * @name GET /notes/recycle-bin
     * @description Retrieve all deleted notes from the recycle bin
     * @route GET /recycle-bin
     * @returns {Object[]} 200 - Array of deleted note objects
     * @returns {Object} 500 - Error response
     * @example
     * // Response format:
     * [
     *   {
     *     "id": "note_456",
     *     "title": "Deleted Note",
     *     "content": "This note is in recycle bin",
     *     "deletedAt": "2023-01-03T00:00:00.000Z",
     *     "createdAt": "2023-01-01T00:00:00.000Z",
     *     "updatedAt": "2023-01-03T00:00:00.000Z"
     *   }
     * ]
     */
    router.get('/recycle-bin', async (req, res, next) => {
        try {
            const notes = await noteRepository.findDeleted();
            res.json(notes.map((note) => note.toObject()));
        } catch (error) {
            next(new InternalServerError('Failed to retrieve deleted notes', { cause: error }));
        }
    });

    // Legacy route for backward compatibility
    /**
     * @name GET /notes/trash
     * @description Legacy route - use /recycle-bin instead
     * @deprecated Use GET /recycle-bin instead
     */
    router.get('/trash', async (req, res, next) => {
        try {
            const notes = await noteRepository.findDeleted();
            res.json(notes.map((note) => note.toObject()));
        } catch (error) {
            next(new InternalServerError('Failed to retrieve deleted notes', { cause: error }));
        }
    });

    /**
     * @name GET /notes/recycle-bin/count
     * @description Get the count of notes in recycle bin
     * @route GET /recycle-bin/count
     * @returns {Object} 200 - Count response
     * @returns {Object} 500 - Error response
     * @example
     * // Response format:
     * {
     *   "count": 5
     * }
     */
    router.get('/recycle-bin/count', async (req, res, next) => {
        try {
            const count = await noteRepository.countDeleted();
            res.json({ count });
        } catch (error) {
            next(new InternalServerError('Failed to count deleted notes', { cause: error }));
        }
    });

    /**
     * @name DELETE /notes/recycle-bin
     * @description Empty the recycle bin by permanently deleting all deleted notes
     * @route DELETE /recycle-bin
     * @returns {Object} 200 - Success response with count of deleted notes
     * @returns {Object} 500 - Server error response
     * @example
     * // Response format (200):
     * {
     *   "message": "Recycle bin emptied successfully",
     *   "deletedCount": 5
     * }
     */
    router.delete('/recycle-bin', async (req, res, next) => {
        try {
            const deletedCount = await noteRepository.emptyRecycleBin();
            res.json({
                message: 'Recycle bin emptied successfully',
                deletedCount,
            });
        } catch (error) {
            next(new InternalServerError('Failed to empty recycle bin', { cause: error }));
        }
    });

    /**
     * @name POST /notes/recycle-bin/restore-all
     * @description Restore all notes from recycle bin
     * @route POST /recycle-bin/restore-all
     * @returns {Object} 200 - Success response with count of restored notes
     * @returns {Object} 500 - Server error response
     * @example
     * // Response format (200):
     * {
     *   "message": "All notes restored successfully",
     *   "restoredCount": 5
     * }
     */
    router.post('/recycle-bin/restore-all', async (req, res, next) => {
        try {
            const restoredCount = await noteRepository.restoreAll();
            res.json({
                message: 'All notes restored successfully',
                restoredCount,
            });
        } catch (error) {
            next(new InternalServerError('Failed to restore all notes', { cause: error }));
        }
    });

    /**
     * @name GET /notes/:id
     * @description Retrieve a specific note by its ID
     * @route GET /:id
     * @param {string} id - Unique identifier of the note
     * @returns {Object} 200 - Note object
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Response format (200):
     * {
     *   "id": "note_123",
     *   "title": "Sample Note",
     *   "content": "This is a sample note content",
     *   "deletedAt": null,
     *   "createdAt": "2023-01-01T00:00:00.000Z",
     *   "updatedAt": "2023-01-02T00:00:00.000Z"
     * }
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const note = await noteRepository.findById(req.params.id);
            if (!note) {
                throw new NotFoundError('Note not found');
            }
            res.json(note.toObject());
        } catch (error) {
            next(
                error instanceof NotFoundError
                    ? error
                    : new InternalServerError('Failed to retrieve note', { cause: error }),
            );
        }
    });

    /**
     * @name POST /notes
     * @description Create a new note
     * @route POST /
     * @param {Object} req.body - Note data
     * @param {string} req.body.title - Note title (required)
     * @param {string} req.body.content - Note content (required)
     * @returns {Object} 201 - Created note object
     * @returns {Object} 400 - Validation error response
     * @returns {Object} 500 - Server error response
     * @example
     * // Request body:
     * {
     *   "title": "New Note",
     *   "content": "This is the content of the new note"
     * }
     *
     * // Response format (201):
     * {
     *   "id": "note_456",
     *   "title": "New Note",
     *   "content": "This is the content of the new note",
     *   "deletedAt": null,
     *   "createdAt": "2023-01-03T00:00:00.000Z",
     *   "updatedAt": "2023-01-03T00:00:00.000Z"
     * }
     */
    router.post('/', async (req, res, next) => {
        try {
            // Validate request body
            if (!req.body.title || !req.body.content) {
                throw new BadRequestError('Title and content are required');
            }

            const note = await noteRepository.create({
                title: req.body.title,
                content: req.body.content,
            });

            res.status(201).json(note.toObject());
        } catch (error) {
            next(
                error instanceof BadRequestError
                    ? error
                    : new InternalServerError('Failed to create note', { cause: error }),
            );
        }
    });

    /**
     * @name PUT /notes/:id
     * @description Update an existing note
     * @route PUT /:id
     * @param {string} id - Unique identifier of the note to update
     * @param {Object} req.body - Updated note data
     * @param {string} req.body.title - Updated note title (required)
     * @param {string} req.body.content - Updated note content (required)
     * @returns {Object} 200 - Updated note object
     * @returns {Object} 400 - Validation error response
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Request body:
     * {
     *   "title": "Updated Note Title",
     *   "content": "Updated note content"
     * }
     *
     * // Response format (200):
     * {
     *   "id": "note_123",
     *   "title": "Updated Note Title",
     *   "content": "Updated note content",
     *   "deletedAt": null,
     *   "createdAt": "2023-01-01T00:00:00.000Z",
     *   "updatedAt": "2023-01-03T00:00:00.000Z"
     * }
     */
    router.put('/:id', async (req, res, next) => {
        try {
            // Validate request body
            if (!req.body.title || !req.body.content) {
                throw new BadRequestError('Title and content are required');
            }

            const note = await noteRepository.update(req.params.id, {
                title: req.body.title,
                content: req.body.content,
            });

            if (!note) {
                throw new NotFoundError('Note not found');
            }

            res.json(note.toObject());
        } catch (error) {
            next(
                error instanceof BadRequestError || error instanceof NotFoundError
                    ? error
                    : new InternalServerError('Failed to update note', { cause: error }),
            );
        }
    });

    /**
     * @name POST /notes/:id/restore
     * @description Restore a note from recycle bin
     * @route POST /:id/restore
     * @param {string} id - Unique identifier of the note to restore
     * @returns {void} 204 - No content (successful restoration)
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Successful restoration returns 204 with no content
     * // Failed restoration (note not found) returns:
     * {
     *   "error": "Note not found"
     * }
     */
    router.post('/:id/restore', async (req, res, next) => {
        try {
            const restored = await noteRepository.restore(req.params.id);

            if (!restored) {
                throw new NotFoundError('Note not found');
            }

            res.status(204).end();
        } catch (error) {
            next(
                error instanceof NotFoundError
                    ? error
                    : new InternalServerError('Failed to restore note', { cause: error }),
            );
        }
    });

    /**
     * @name DELETE /notes/:id
     * @description Move a note to recycle bin (soft delete)
     * @route DELETE /:id
     * @param {string} id - Unique identifier of the note to move to recycle bin
     * @returns {void} 204 - No content (successful move to recycle bin)
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Successful move to recycle bin returns 204 with no content
     * // Failed move (note not found) returns:
     * {
     *   "error": "Note not found"
     * }
     */
    router.delete('/:id', async (req, res, next) => {
        try {
            const deleted = await noteRepository.moveToRecycleBin(req.params.id);
            if (!deleted) {
                throw new NotFoundError('Note not found');
            }

            res.status(204).end();
        } catch (error) {
            next(
                error instanceof NotFoundError
                    ? error
                    : new InternalServerError('Failed to move note to recycle bin', { cause: error }),
            );
        }
    });

    /**
     * @name DELETE /notes/:id/permanent
     * @description Permanently delete a note
     * @route DELETE /:id/permanent
     * @param {string} id - Unique identifier of the note to permanently delete
     * @returns {void} 204 - No content (successful permanent deletion)
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Successful permanent deletion returns 204 with no content
     * // Failed deletion (note not found) returns:
     * {
     *   "error": "Note not found"
     * }
     */
    router.delete('/:id/permanent', async (req, res, next) => {
        try {
            const deleted = await noteRepository.permanentDelete(req.params.id);

            if (!deleted) {
                throw new NotFoundError('Note not found');
            }

            res.status(204).end();
        } catch (error) {
            next(
                error instanceof NotFoundError
                    ? error
                    : new InternalServerError('Failed to permanently delete note', { cause: error }),
            );
        }
    });

    // Keep the router independently usable while the application also mounts
    // the same shared handler for errors raised by other middleware.
    router.use(errorHandler);

    return router;
}
