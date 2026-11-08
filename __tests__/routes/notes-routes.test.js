import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createNotesRouter } from '../../src/routes/notes-routes.js';
import { Note } from '../../src/models/note.js';

// Mock repository for testing
class MockNoteRepository {
    constructor() {
        this.notes = [];
        this.nextId = 1;
    }

    async findAll({ limit = 20, offset = 0 } = {}) {
        const notes = this.notes.filter((note) => note.deletedAt === null);
        return { notes: notes.slice(offset, offset + limit), total: notes.length };
    }

    async search(keyword) {
        const normalizedKeyword = keyword.toLowerCase();
        return this.notes.filter(
            (note) =>
                note.deletedAt === null &&
                (note.title.toLowerCase().includes(normalizedKeyword) ||
                    note.content.toLowerCase().includes(normalizedKeyword)),
        );
    }

    async findDeleted() {
        return this.notes.filter((note) => note.deletedAt !== null);
    }

    async findAllIncludingDeleted() {
        return [...this.notes];
    }

    async findById(id) {
        const note = this.notes.find((n) => n.id === id);
        return note || null;
    }

    async create(noteData) {
        const id = String(this.nextId++);
        const note = new Note(id, noteData.title, noteData.content, new Date(), new Date(), null);
        this.notes.push(note);
        return note;
    }

    async update(id, noteData) {
        const index = this.notes.findIndex((n) => n.id === id);
        if (index === -1) return null;

        const note = this.notes[index];
        note.title = noteData.title;
        note.content = noteData.content;
        note.updatedAt = new Date();

        return note;
    }

    async moveToRecycleBin(id) {
        const index = this.notes.findIndex((n) => n.id === id);
        if (index === -1) return false;

        const note = this.notes[index];
        note.status = 'trashed';
        note.deletedAt = new Date();
        note.updatedAt = new Date();

        return true;
    }

    async restore(id) {
        const index = this.notes.findIndex((n) => n.id === id);
        if (index === -1) return false;

        const note = this.notes[index];
        note.deletedAt = null;
        note.updatedAt = new Date();

        return true;
    }

    async permanentDelete(id) {
        const index = this.notes.findIndex((n) => n.id === id);
        if (index === -1) return false;

        this.notes.splice(index, 1);
        return true;
    }

    async emptyRecycleBin() {
        const deletedNotes = this.notes.filter((note) => note.deletedAt !== null);
        const deletedCount = deletedNotes.length;
        this.notes = this.notes.filter((note) => note.deletedAt === null);
        return deletedCount;
    }

    async restoreAll() {
        const deletedNotes = this.notes.filter((note) => note.deletedAt !== null);
        const restoredCount = deletedNotes.length;

        // Restore all deleted notes
        for (const note of deletedNotes) {
            note.deletedAt = null;
            note.updatedAt = new Date();
        }

        return restoredCount;
    }

    async countDeleted() {
        return this.notes.filter((note) => note.deletedAt !== null).length;
    }

    async delete(id) {
        return this.moveToRecycleBin(id);
    }
}

describe('Notes Routes', () => {
    let app;
    let repository;

    beforeEach(() => {
        repository = new MockNoteRepository();
        app = express();
        app.use(express.json());
        app.use('/api/notes', createNotesRouter(repository));
    });

    describe('GET /api/notes', () => {
        test('should return an empty page when no notes exist', async () => {
            const response = await request(app).get('/api/notes');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                data: [],
                pagination: { limit: 20, offset: 0, total: 0, hasNext: false },
            });
        });

        test('should return only active notes', async () => {
            // Add active and deleted notes
            await repository.create({ title: 'Active Note 1', content: 'Content 1' });
            await repository.create({ title: 'Active Note 2', content: 'Content 2' });
            const note3 = await repository.create({ title: 'Note 3', content: 'Content 3' });
            await repository.moveToRecycleBin(note3.id); // Move to trash

            const response = await request(app).get('/api/notes');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].title).toBe('Active Note 1');
            expect(response.body.data[0].deletedAt).toBeNull();
            expect(response.body.data[1].title).toBe('Active Note 2');
            expect(response.body.data[1].deletedAt).toBeNull();
            expect(response.body.pagination).toEqual({ limit: 20, offset: 0, total: 2, hasNext: false });
        });

        test('should return the requested page and navigation metadata', async () => {
            await repository.create({ title: 'Note 1', content: 'Content 1' });
            await repository.create({ title: 'Note 2', content: 'Content 2' });
            await repository.create({ title: 'Note 3', content: 'Content 3' });

            const response = await request(app).get('/api/notes?limit=2&offset=0');

            expect(response.status).toBe(200);
            expect(response.body.data.map((note) => note.title)).toEqual(['Note 1', 'Note 2']);
            expect(response.body.pagination).toEqual({ limit: 2, offset: 0, total: 3, hasNext: true });
        });

        test('should return an empty page when offset is beyond the total', async () => {
            await repository.create({ title: 'Note 1', content: 'Content 1' });

            const response = await request(app).get('/api/notes?limit=2&offset=5');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                data: [],
                pagination: { limit: 2, offset: 5, total: 1, hasNext: false },
            });
        });

        test.each([
            'limit=0',
            'limit=-1',
            'limit=1.5',
            'limit=101',
            'offset=-1',
            'offset=1.5',
            'limit=abc',
            'offset=abc',
            'limit=999999999999999999999',
            'offset=999999999999999999999',
        ])('should reject invalid pagination query: %s', async (query) => {
            const findAll = jest.spyOn(repository, 'findAll');

            const response = await request(app).get(`/api/notes?${query}`);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: expect.any(String) });
            expect(findAll).not.toHaveBeenCalled();
        });

        test('should handle repository errors', async () => {
            // Mock repository to throw an error
            repository.findAll = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to retrieve notes');
        });
    });

    describe('GET /api/notes/search', () => {
        test('should return active notes matching title or content case-insensitively', async () => {
            await repository.create({ title: 'Project Plan', content: 'Review milestones' });
            await repository.create({ title: 'Shopping List', content: 'Buy project supplies' });
            const deletedNote = await repository.create({ title: 'Old Project', content: 'Archived work' });
            await repository.moveToRecycleBin(deletedNote.id);

            const response = await request(app).get('/api/notes/search?q=PROJECT');

            expect(response.status).toBe(200);
            expect(response.body.map((note) => note.title)).toEqual(['Project Plan', 'Shopping List']);
        });

        test('should reject a missing or blank search query', async () => {
            const missingResponse = await request(app).get('/api/notes/search');
            const blankResponse = await request(app).get('/api/notes/search?q=   ');

            expect(missingResponse.status).toBe(400);
            expect(blankResponse.status).toBe(400);
            expect(missingResponse.body).toEqual({ error: 'Search query is required' });
        });

        test('should translate repository errors', async () => {
            repository.search = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes/search?q=project');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to search notes');
        });
    });

    describe('GET /api/notes/recycle-bin', () => {
        test('should return empty array when no trashed notes exist', async () => {
            // Add some active notes
            await repository.create({ title: 'Active Note', content: 'Content' });

            const response = await request(app).get('/api/notes/recycle-bin');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        test('should return only trashed notes', async () => {
            // Add active and deleted notes
            await repository.create({ title: 'Active Note', content: 'Content' });
            const note2 = await repository.create({ title: 'Trashed Note 1', content: 'Content 1' });
            const note3 = await repository.create({ title: 'Trashed Note 2', content: 'Content 2' });
            await repository.moveToRecycleBin(note2.id);
            await repository.moveToRecycleBin(note3.id);

            const response = await request(app).get('/api/notes/recycle-bin');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
            expect(response.body[0].title).toBe('Trashed Note 1');
            expect(response.body[0].deletedAt).toBeDefined();
            expect(response.body[1].title).toBe('Trashed Note 2');
            expect(response.body[1].deletedAt).toBeDefined();
        });

        test('should handle repository errors', async () => {
            repository.findDeleted = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes/recycle-bin');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to retrieve deleted notes');
        });
    });

    describe('GET /api/notes/trash (Legacy Route)', () => {
        test('should return empty array when no trashed notes exist', async () => {
            // Add some active notes
            await repository.create({ title: 'Active Note', content: 'Content' });

            const response = await request(app).get('/api/notes/trash');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        test('should return only deleted notes (same as recycle-bin)', async () => {
            // Add active and deleted notes
            await repository.create({ title: 'Active Note', content: 'Content' });
            const note2 = await repository.create({ title: 'Trashed Note 1', content: 'Content 1' });
            const note3 = await repository.create({ title: 'Trashed Note 2', content: 'Content 2' });
            await repository.moveToRecycleBin(note2.id);
            await repository.moveToRecycleBin(note3.id);

            const response = await request(app).get('/api/notes/trash');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
            expect(response.body[0].title).toBe('Trashed Note 1');
            expect(response.body[0].deletedAt).toBeDefined();
            expect(response.body[1].title).toBe('Trashed Note 2');
            expect(response.body[1].deletedAt).toBeDefined();
        });

        test('should handle repository errors', async () => {
            repository.findDeleted = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes/trash');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to retrieve deleted notes');
        });
    });

    describe('GET /api/notes/:id', () => {
        test('should return a note by id', async () => {
            const note = await repository.create({ title: 'Test Note', content: 'Test Content' });

            const response = await request(app).get(`/api/notes/${note.id}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(note.id);
            expect(response.body.title).toBe('Test Note');
            expect(response.body.content).toBe('Test Content');
            expect(response.body.deletedAt).toBeNull();
        });

        test('should return 404 for non-existent note', async () => {
            const response = await request(app).get('/api/notes/999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Note not found');
        });

        test('should handle repository errors', async () => {
            repository.findById = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to retrieve note');
        });
    });

    describe('POST /api/notes', () => {
        test('should create a new note', async () => {
            const noteData = { title: 'New Note', content: 'New Content' };

            const response = await request(app)
                .post('/api/notes')
                .send(noteData)
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(201);
            expect(response.body.title).toBe(noteData.title);
            expect(response.body.content).toBe(noteData.content);
            expect(response.body.id).toBeDefined();
            expect(response.body.deletedAt).toBeNull();
        });

        test('should return 400 if title is missing', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ content: 'Missing Title' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Title and content are required');
        });

        test('should return 400 if content is missing', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Missing Content' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Title and content are required');
        });

        test('should handle repository errors', async () => {
            repository.create = async () => {
                throw new Error('Database error');
            };

            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Test', content: 'Test' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create note');
        });
    });

    describe('PUT /api/notes/:id', () => {
        test('should update an existing note', async () => {
            const note = await repository.create({ title: 'Original', content: 'Original' });
            const updateData = { title: 'Updated', content: 'Updated' };

            const response = await request(app)
                .put(`/api/notes/${note.id}`)
                .send(updateData)
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(200);
            expect(response.body.title).toBe(updateData.title);
            expect(response.body.content).toBe(updateData.content);
            expect(response.body.deletedAt).toBeNull();
        });

        test('should return 404 for non-existent note', async () => {
            const response = await request(app)
                .put('/api/notes/999')
                .send({ title: 'Test', content: 'Test' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Note not found');
        });

        test('should return 400 if title is missing', async () => {
            const note = await repository.create({ title: 'Original', content: 'Original' });

            const response = await request(app)
                .put(`/api/notes/${note.id}`)
                .send({ content: 'Missing Title' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Title and content are required');
        });

        test('should return 400 if content is missing', async () => {
            const note = await repository.create({ title: 'Original', content: 'Original' });

            const response = await request(app)
                .put(`/api/notes/${note.id}`)
                .send({ title: 'Missing Content' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Title and content are required');
        });

        test('should handle repository errors', async () => {
            repository.update = async () => {
                throw new Error('Database error');
            };

            const response = await request(app)
                .put('/api/notes/1')
                .send({ title: 'Test', content: 'Test' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to update note');
        });
    });

    describe('POST /api/notes/:id/restore', () => {
        test('should restore a trashed note', async () => {
            const note = await repository.create({ title: 'To Restore', content: 'Content' });
            await repository.moveToRecycleBin(note.id);

            const response = await request(app).post(`/api/notes/${note.id}/restore`);

            expect(response.status).toBe(204);

            // Verify note is restored
            const restoredNote = await repository.findById(note.id);
            expect(restoredNote.deletedAt).toBe(null);
        });

        test('should return 404 for non-existent note', async () => {
            const response = await request(app).post('/api/notes/999/restore');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Note not found');
        });

        test('should handle repository errors', async () => {
            repository.restore = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).post('/api/notes/1/restore');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to restore note');
        });
    });

    describe('DELETE /api/notes/:id', () => {
        test('should move note to trash (soft delete)', async () => {
            const note = await repository.create({ title: 'To Trash', content: 'Content' });

            const response = await request(app).delete(`/api/notes/${note.id}`);

            expect(response.status).toBe(204);

            // Verify note is moved to trash, not deleted
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote).not.toBe(null);
            expect(deletedNote.status).toBe('trashed');
            expect(deletedNote.deletedAt).toBeDefined();
        });

        test('should return 404 for non-existent note', async () => {
            const response = await request(app).delete('/api/notes/999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Note not found');
        });

        test('should handle repository errors', async () => {
            repository.moveToRecycleBin = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).delete('/api/notes/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to move note to recycle bin');
        });
    });

    describe('DELETE /api/notes/:id/permanent', () => {
        test('should permanently delete a note', async () => {
            const note = await repository.create({ title: 'To Delete', content: 'Content' });
            await repository.moveToRecycleBin(note.id);

            const response = await request(app).delete(`/api/notes/${note.id}/permanent`);

            expect(response.status).toBe(204);

            // Verify note is permanently deleted
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote).toBe(null);
        });

        test('should return 404 for non-existent note', async () => {
            const response = await request(app).delete('/api/notes/999/permanent');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Note not found');
        });

        test('should handle repository errors', async () => {
            repository.permanentDelete = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).delete('/api/notes/1/permanent');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to permanently delete note');
        });
    });

    describe('GET /api/notes/recycle-bin/count', () => {
        test('should return count of deleted notes', async () => {
            // Add some notes and delete some
            const note1 = await repository.create({ title: 'Note 1', content: 'Content 1' });
            const note2 = await repository.create({ title: 'Note 2', content: 'Content 2' });
            const note3 = await repository.create({ title: 'Note 3', content: 'Content 3' });

            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            const response = await request(app).get('/api/notes/recycle-bin/count');

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(2);
        });

        test('should return zero when no deleted notes exist', async () => {
            // Add some active notes only
            await repository.create({ title: 'Active Note', content: 'Content' });

            const response = await request(app).get('/api/notes/recycle-bin/count');

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(0);
        });

        test('should handle repository errors', async () => {
            repository.countDeleted = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).get('/api/notes/recycle-bin/count');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to count deleted notes');
        });
    });

    describe('DELETE /api/notes/recycle-bin', () => {
        test('should empty recycle bin and return count', async () => {
            // Add some notes and delete some
            const note1 = await repository.create({ title: 'Note 1', content: 'Content 1' });
            const note2 = await repository.create({ title: 'Note 2', content: 'Content 2' });
            const note3 = await repository.create({ title: 'Note 3', content: 'Content 3' });

            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            const response = await request(app).delete('/api/notes/recycle-bin');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Recycle bin emptied successfully');
            expect(response.body.deletedCount).toBe(2);

            // Verify recycle bin is empty
            const deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(0);

            // Verify active note still exists
            const activeNotes = await repository.findAll();
            expect(activeNotes.notes.length).toBe(1);
            expect(activeNotes.notes[0].id).toBe(note3.id);
        });

        test('should return zero when recycle bin is already empty', async () => {
            // Add some active notes only
            await repository.create({ title: 'Active Note', content: 'Content' });

            const response = await request(app).delete('/api/notes/recycle-bin');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Recycle bin emptied successfully');
            expect(response.body.deletedCount).toBe(0);
        });

        test('should handle repository errors', async () => {
            repository.emptyRecycleBin = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).delete('/api/notes/recycle-bin');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to empty recycle bin');
        });
    });

    describe('POST /api/notes/recycle-bin/restore-all', () => {
        test('should restore all notes from recycle bin and return count', async () => {
            // Add some notes and delete some
            const note1 = await repository.create({ title: 'Note 1', content: 'Content 1' });
            const note2 = await repository.create({ title: 'Note 2', content: 'Content 2' });
            const note3 = await repository.create({ title: 'Note 3', content: 'Content 3' });

            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            const response = await request(app).post('/api/notes/recycle-bin/restore-all');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('All notes restored successfully');
            expect(response.body.restoredCount).toBe(2);

            // Verify all notes are now active
            const activeNotes = await repository.findAll();
            expect(activeNotes.notes.length).toBe(3);

            // Verify recycle bin is empty
            const deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(0);
        });

        test('should return zero when recycle bin is already empty', async () => {
            // Add some active notes only
            await repository.create({ title: 'Active Note', content: 'Content' });

            const response = await request(app).post('/api/notes/recycle-bin/restore-all');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('All notes restored successfully');
            expect(response.body.restoredCount).toBe(0);
        });

        test('should handle repository errors', async () => {
            repository.restoreAll = async () => {
                throw new Error('Database error');
            };

            const response = await request(app).post('/api/notes/recycle-bin/restore-all');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to restore all notes');
        });
    });
});
