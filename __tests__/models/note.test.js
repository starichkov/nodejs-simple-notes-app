import { Note } from '../../src/models/note.js';

describe('Note Model', () => {
  test('should create a note with default values', () => {
    const note = new Note();
    
    expect(note.id).toBeNull();
    expect(note.title).toBe('');
    expect(note.content).toBe('');
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
  });

  test('should create a note with provided values', () => {
    const id = '123';
    const title = 'Test Note';
    const content = 'This is a test note';
    const createdAt = new Date('2023-01-01');
    const updatedAt = new Date('2023-01-02');
    
    const note = new Note(id, title, content, createdAt, updatedAt);
    
    expect(note.id).toBe(id);
    expect(note.title).toBe(title);
    expect(note.content).toBe(content);
    expect(note.createdAt).toBe(createdAt);
    expect(note.updatedAt).toBe(updatedAt);
  });

  test('should create a note from an object', () => {
    const obj = {
      id: '456',
      title: 'From Object',
      content: 'Created from an object',
      createdAt: '2023-02-01T00:00:00.000Z',
      updatedAt: '2023-02-02T00:00:00.000Z'
    };
    
    const note = Note.fromObject(obj);
    
    expect(note).toBeInstanceOf(Note);
    expect(note.id).toBe(obj.id);
    expect(note.title).toBe(obj.title);
    expect(note.content).toBe(obj.content);
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
    expect(note.createdAt.toISOString()).toBe(obj.createdAt);
    expect(note.updatedAt.toISOString()).toBe(obj.updatedAt);
  });

  test('should convert a note to an object', () => {
    const note = new Note('789', 'To Object', 'Converting to object', new Date('2023-03-01'), new Date('2023-03-02'));
    
    const obj = note.toObject();
    
    expect(obj).toEqual({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  });
});