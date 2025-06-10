import express from 'express';
import request from 'supertest';
import { createNotesRouter } from '../../src/routes/notes-routes.js';
import { Note } from '../../src/models/note.js';

// Mock repository for testing
class MockNoteRepository {
  constructor() {
    this.notes = [];
    this.nextId = 1;
  }

  async findAll() {
    return this.notes.filter(note => note.deletedAt === null);
  }

  async findDeleted() {
    return this.notes.filter(note => note.deletedAt !== null);
  }

  async findAllIncludingDeleted() {
    return [...this.notes];
  }

  async findById(id) {
    const note = this.notes.find(n => n.id === id);
    return note || null;
  }

  async create(noteData) {
    const id = String(this.nextId++);
    const note = new Note(
      id,
      noteData.title,
      noteData.content,
      new Date(),
      new Date(),
      null
    );
    this.notes.push(note);
    return note;
  }

  async update(id, noteData) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return null;

    const note = this.notes[index];
    note.title = noteData.title;
    note.content = noteData.content;
    note.updatedAt = new Date();

    return note;
  }

  async moveToRecycleBin(id) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    const note = this.notes[index];
    note.status = 'trashed';
    note.deletedAt = new Date();
    note.updatedAt = new Date();

    return true;
  }

  async restore(id) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    const note = this.notes[index];
    note.deletedAt = null;
    note.updatedAt = new Date();

    return true;
  }

  async permanentDelete(id) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return false;

    this.notes.splice(index, 1);
    return true;
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
    test('should return empty array when no notes exist', async () => {
      const response = await request(app).get('/api/notes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return only active notes', async () => {
      // Add active and deleted notes
      await repository.create({ title: 'Active Note 1', content: 'Content 1' });
      await repository.create({ title: 'Active Note 2', content: 'Content 2' });
      const note3 = await repository.create({ title: 'Note 3', content: 'Content 3' });
      await repository.moveToRecycleBin(note3.id); // Move to trash

      const response = await request(app).get('/api/notes');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Active Note 1');
      expect(response.body[0].deletedAt).toBeNull();
      expect(response.body[1].title).toBe('Active Note 2');
      expect(response.body[1].deletedAt).toBeNull();
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
});
