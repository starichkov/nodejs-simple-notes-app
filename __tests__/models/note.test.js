import { Note } from '../../src/models/note.js';

describe('Note Model', () => {
  test('should create a note with default values', () => {
    const note = new Note();

    expect(note.id).toBeNull();
    expect(note.title).toBe('');
    expect(note.content).toBe('');
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
    expect(note.deletedAt).toBeNull();
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
    expect(note.deletedAt).toBeNull();
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
    expect(note.deletedAt).toBeNull();
  });

  test('should convert a note to an object', () => {
    const note = new Note('789', 'To Object', 'Converting to object', new Date('2023-03-01'), new Date('2023-03-02'));

    const obj = note.toObject();

    expect(obj).toEqual({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      deletedAt: note.deletedAt
    });
  });

  test('isDeleted should return true for deleted notes', () => {
    const deletedAt = new Date();
    const note = new Note('123', 'Deleted Note', 'This note is deleted', new Date(), new Date(), deletedAt);

    expect(note.isDeleted()).toBe(true);
  });

  test('isDeleted should return false for active notes', () => {
    const note = new Note('123', 'Active Note', 'This note is active');

    expect(note.isDeleted()).toBe(false);
  });

  test('isActive should return true for active notes', () => {
    const note = new Note('123', 'Active Note', 'This note is active');

    expect(note.isActive()).toBe(true);
  });

  test('isActive should return false for deleted notes', () => {
    const deletedAt = new Date();
    const note = new Note('123', 'Deleted Note', 'This note is deleted', new Date(), new Date(), deletedAt);

    expect(note.isActive()).toBe(false);
  });
});
