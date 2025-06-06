import express from 'express';

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
     * @description Retrieve all notes from the database
     * @route GET /
     * @returns {Object[]} 200 - Array of note objects
     * @returns {Object} 500 - Error response
     * @example
     * // Response format:
     * [
     *   {
     *     "id": "note_123",
     *     "title": "Sample Note",
     *     "content": "This is a sample note content",
     *     "createdAt": "2023-01-01T00:00:00.000Z",
     *     "updatedAt": "2023-01-02T00:00:00.000Z"
     *   }
     * ]
     */
    router.get('/', async (req, res) => {
        try {
            const notes = await noteRepository.findAll();
            res.json(notes.map(note => note.toObject()));
        } catch (error) {
            console.error('Error getting all notes:', error);
            res.status(500).json({ error: 'Failed to retrieve notes' });
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
     *   "createdAt": "2023-01-01T00:00:00.000Z",
     *   "updatedAt": "2023-01-02T00:00:00.000Z"
     * }
     */
    router.get('/:id', async (req, res) => {
        try {
            const note = await noteRepository.findById(req.params.id);
            if (!note) {
                return res.status(404).json({ error: 'Note not found' });
            }
            res.json(note.toObject());
        } catch (error) {
            console.error(`Error getting note with ID ${req.params.id}:`, error);
            res.status(500).json({ error: 'Failed to retrieve note' });
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
     *   "createdAt": "2023-01-03T00:00:00.000Z",
     *   "updatedAt": "2023-01-03T00:00:00.000Z"
     * }
     */
    router.post('/', async (req, res) => {
        try {
            // Validate request body
            if (!req.body.title || !req.body.content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }

            const note = await noteRepository.create({
                title: req.body.title,
                content: req.body.content
            });
            
            res.status(201).json(note.toObject());
        } catch (error) {
            console.error('Error creating note:', error);
            res.status(500).json({ error: 'Failed to create note' });
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
     *   "createdAt": "2023-01-01T00:00:00.000Z",
     *   "updatedAt": "2023-01-03T00:00:00.000Z"
     * }
     */
    router.put('/:id', async (req, res) => {
        try {
            // Validate request body
            if (!req.body.title || !req.body.content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }

            const note = await noteRepository.update(req.params.id, {
                title: req.body.title,
                content: req.body.content
            });
            
            if (!note) {
                return res.status(404).json({ error: 'Note not found' });
            }
            
            res.json(note.toObject());
        } catch (error) {
            console.error(`Error updating note with ID ${req.params.id}:`, error);
            res.status(500).json({ error: 'Failed to update note' });
        }
    });

    /**
     * @name DELETE /notes/:id
     * @description Delete a note by its ID
     * @route DELETE /:id
     * @param {string} id - Unique identifier of the note to delete
     * @returns {void} 204 - No content (successful deletion)
     * @returns {Object} 404 - Note not found error
     * @returns {Object} 500 - Server error response
     * @example
     * // Successful deletion returns 204 with no content
     * // Failed deletion (note not found) returns:
     * {
     *   "error": "Note not found"
     * }
     */
    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await noteRepository.delete(req.params.id);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Note not found' });
            }
            
            res.status(204).end();
        } catch (error) {
            console.error(`Error deleting note with ID ${req.params.id}:`, error);
            res.status(500).json({ error: 'Failed to delete note' });
        }
    });

    return router;
}