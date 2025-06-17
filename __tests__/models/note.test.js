import { Note } from '../../src/models/note.js';

describe('Note Model', () => {
  describe('Constructor', () => {
    test('should create a note with all parameters', () => {
      const id = 'test-id';
      const title = 'Test Title';
      const content = 'Test Content';
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-02');
      const deletedAt = new Date('2023-01-03');

      const note = new Note(id, title, content, createdAt, updatedAt, deletedAt);

      expect(note.id).toBe(id);
      expect(note.title).toBe(title);
      expect(note.content).toBe(content);
      expect(note.createdAt).toBe(createdAt);
      expect(note.updatedAt).toBe(updatedAt);
      expect(note.deletedAt).toBe(deletedAt);
    });

    test('should create a note with default parameters', () => {
      const note = new Note();

      expect(note.id).toBeNull();
      expect(note.title).toBe('');
      expect(note.content).toBe('');
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });

    test('should create a note with partial parameters', () => {
      const note = new Note('test-id', 'Test Title');

      expect(note.id).toBe('test-id');
      expect(note.title).toBe('Test Title');
      expect(note.content).toBe('');
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });
  });

  describe('fromObject', () => {
    test('should create a note from a complete object', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        deletedAt: '2023-01-03T00:00:00.000Z'
      };

      const note = Note.fromObject(obj);

      expect(note.id).toBe('test-id');
      expect(note.title).toBe('Test Title');
      expect(note.content).toBe('Test Content');
      expect(note.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(note.updatedAt).toEqual(new Date('2023-01-02T00:00:00.000Z'));
      expect(note.deletedAt).toEqual(new Date('2023-01-03T00:00:00.000Z'));
    });

    test('should create a note from object with null deletedAt', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        deletedAt: null
      };

      const note = Note.fromObject(obj);

      expect(note.deletedAt).toBeNull();
    });

    test('should handle missing date fields by using defaults', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content'
        // Missing createdAt, updatedAt, deletedAt
      };

      const note = Note.fromObject(obj);

      expect(note.id).toBe('test-id');
      expect(note.title).toBe('Test Title');
      expect(note.content).toBe('Test Content');
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });

    test('should handle null createdAt by using default', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: null,
        updatedAt: '2023-01-02T00:00:00.000Z',
        deletedAt: null
      };

      const note = Note.fromObject(obj);

      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toEqual(new Date('2023-01-02T00:00:00.000Z'));
      expect(note.deletedAt).toBeNull();
    });

    test('should handle null updatedAt by using default', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: null,
        deletedAt: null
      };

      const note = Note.fromObject(obj);

      expect(note.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });

    test('should handle undefined date fields', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: undefined
      };

      const note = Note.fromObject(obj);

      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });

    test('should handle date objects instead of strings', () => {
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-02');
      const deletedAt = new Date('2023-01-03');

      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: createdAt,
        updatedAt: updatedAt,
        deletedAt: deletedAt
      };

      const note = Note.fromObject(obj);

      expect(note.createdAt).toEqual(createdAt);
      expect(note.updatedAt).toEqual(updatedAt);
      expect(note.deletedAt).toEqual(deletedAt);
    });

    test('should handle empty object', () => {
      const obj = {};

      const note = Note.fromObject(obj);

      expect(note.id).toBeUndefined();
      expect(note.title).toBeUndefined();
      expect(note.content).toBeUndefined();
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeNull();
    });

    test('should handle falsy deletedAt values', () => {
      const testCases = [
        { deletedAt: false, expected: null },
        { deletedAt: 0, expected: null },
        { deletedAt: '', expected: null },
        { deletedAt: null, expected: null },
        { deletedAt: undefined, expected: null }
      ];

      testCases.forEach(({ deletedAt, expected }) => {
        const obj = {
          id: 'test-id',
          title: 'Test Title',
          content: 'Test Content',
          deletedAt: deletedAt
        };

        const note = Note.fromObject(obj);
        expect(note.deletedAt).toBe(expected);
      });
    });

    test('should handle invalid date strings gracefully', () => {
      const obj = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: 'invalid-date',
        updatedAt: 'also-invalid',
        deletedAt: 'invalid-too'
      };

      const note = Note.fromObject(obj);

      // Invalid date strings should result in Invalid Date objects
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.deletedAt).toBeInstanceOf(Date);
      expect(isNaN(note.createdAt.getTime())).toBe(true);
      expect(isNaN(note.updatedAt.getTime())).toBe(true);
      expect(isNaN(note.deletedAt.getTime())).toBe(true);
    });
  });

  describe('toObject', () => {
    test('should convert note to plain object', () => {
      const createdAt = new Date('2023-01-01');
      const updatedAt = new Date('2023-01-02');
      const deletedAt = new Date('2023-01-03');

      const note = new Note('test-id', 'Test Title', 'Test Content', createdAt, updatedAt, deletedAt);
      const obj = note.toObject();

      expect(obj).toEqual({
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        createdAt: createdAt,
        updatedAt: updatedAt,
        deletedAt: deletedAt
      });
    });

    test('should convert note with null deletedAt to plain object', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content');
      const obj = note.toObject();

      expect(obj.deletedAt).toBeNull();
    });
  });

  describe('isDeleted', () => {
    test('should return true when note is deleted', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content', new Date(), new Date(), new Date());
      expect(note.isDeleted()).toBe(true);
    });

    test('should return false when note is not deleted', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content', new Date(), new Date(), null);
      expect(note.isDeleted()).toBe(false);
    });

    test('should return false when deletedAt is undefined', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content');
      note.deletedAt = undefined;
      expect(note.isDeleted()).toBe(false);
    });
  });

  describe('isActive', () => {
    test('should return false when note is deleted', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content', new Date(), new Date(), new Date());
      expect(note.isActive()).toBe(false);
    });

    test('should return true when note is not deleted', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content', new Date(), new Date(), null);
      expect(note.isActive()).toBe(true);
    });

    test('should return true when deletedAt is undefined', () => {
      const note = new Note('test-id', 'Test Title', 'Test Content');
      note.deletedAt = undefined;
      expect(note.isActive()).toBe(true);
    });
  });

  describe('Edge Cases and Type Handling', () => {
    test('should handle numeric values for string fields', () => {
      const obj = {
        id: 123,
        title: 456,
        content: 789
      };

      const note = Note.fromObject(obj);

      expect(note.id).toBe(123);
      expect(note.title).toBe(456);
      expect(note.content).toBe(789);
    });

    test('should handle boolean values', () => {
      const obj = {
        id: true,
        title: false,
        content: true
      };

      const note = Note.fromObject(obj);

      expect(note.id).toBe(true);
      expect(note.title).toBe(false);
      expect(note.content).toBe(true);
    });

    test('should handle array values', () => {
      const obj = {
        id: ['test'],
        title: [1, 2, 3],
        content: []
      };

      const note = Note.fromObject(obj);

      expect(note.id).toEqual(['test']);
      expect(note.title).toEqual([1, 2, 3]);
      expect(note.content).toEqual([]);
    });

    test('should handle object values', () => {
      const obj = {
        id: { nested: 'value' },
        title: { another: 'object' },
        content: { deep: { nested: 'structure' } }
      };

      const note = Note.fromObject(obj);

      expect(note.id).toEqual({ nested: 'value' });
      expect(note.title).toEqual({ another: 'object' });
      expect(note.content).toEqual({ deep: { nested: 'structure' } });
    });
  });
});
