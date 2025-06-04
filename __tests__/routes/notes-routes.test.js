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
      new Date()
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

  async delete(id) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.notes.splice(index, 1);
    return true;
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

    test('should return all notes', async () => {
      // Add some test notes
      await repository.create({ title: 'Note 1', content: 'Content 1' });
      await repository.create({ title: 'Note 2', content: 'Content 2' });
      
      const response = await request(app).get('/api/notes');
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Note 1');
      expect(response.body[1].title).toBe('Note 2');
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

  describe('GET /api/notes/:id', () => {
    test('should return a note by id', async () => {
      const note = await repository.create({ title: 'Test Note', content: 'Test Content' });
      
      const response = await request(app).get(`/api/notes/${note.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(note.id);
      expect(response.body.title).toBe('Test Note');
      expect(response.body.content).toBe('Test Content');
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

  describe('DELETE /api/notes/:id', () => {
    test('should delete an existing note', async () => {
      const note = await repository.create({ title: 'To Delete', content: 'To Delete' });
      
      const response = await request(app).delete(`/api/notes/${note.id}`);
      
      expect(response.status).toBe(204);
      
      // Verify note is deleted
      const getResponse = await request(app).get(`/api/notes/${note.id}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent note', async () => {
      const response = await request(app).delete('/api/notes/999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Note not found');
    });

    test('should handle repository errors', async () => {
      repository.delete = async () => {
        throw new Error('Database error');
      };

      const response = await request(app).delete('/api/notes/1');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete note');
    });
  });
});