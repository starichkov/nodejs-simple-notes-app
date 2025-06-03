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

    test('should return 400 if title or content is missing', async () => {
      const response = await request(app)
        .post('/api/notes')
        .send({ title: 'Missing Content' })
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});