import express from 'express';

/**
 * Create a router for note-related endpoints
 * @param {Object} noteRepository - Repository for note operations
 * @returns {Object} Express router
 */
export function createNotesRouter(noteRepository) {
    const router = express.Router();

    // GET /notes - Get all notes
    router.get('/', async (req, res) => {
        try {
            const notes = await noteRepository.findAll();
            res.json(notes.map(note => note.toObject()));
        } catch (error) {
            console.error('Error getting all notes:', error);
            res.status(500).json({ error: 'Failed to retrieve notes' });
        }
    });

    // GET /notes/:id - Get a note by ID
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

    // POST /notes - Create a new note
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

    // PUT /notes/:id - Update a note
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

    // DELETE /notes/:id - Delete a note
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