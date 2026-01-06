import { jest } from '@jest/globals';
import { CouchDbNoteRepository } from '../../src/db/couchdb-note-repository.js';
import { Note } from '../../src/models/note.js';

// We'll manually mock the nano module
jest.mock('nano', () => {
    const mockDb = {
        get: jest.fn(),
        insert: jest.fn(),
        view: jest.fn(),
        destroy: jest.fn()
    };

    const mockClient = {
        db: {
            list: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ ok: true }),
        },
        use: jest.fn().mockReturnValue(mockDb)
    };

    return jest.fn(() => mockClient);
});

// Import nano after mocking it
import nano from 'nano';

describe('CouchDbNoteRepository Error Handling Tests', () => {
    let repository;
    const url = 'http://admin:password@localhost:5984';
    const dbName = 'notes_test';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create mock functions with proper Jest mock methods
        const mockDb = {
            get: jest.fn(),
            insert: jest.fn(),
            view: jest.fn(),
            destroy: jest.fn()
        };

        const mockClient = {
            db: {
                list: jest.fn(),
                create: jest.fn(),
            },
            use: jest.fn().mockReturnValue(mockDb)
        };

        // Create the repository with the mocked client
        repository = new CouchDbNoteRepository(url, dbName);

        // Replace the repository's client with our mock
        repository.client = mockClient;
        repository.db = mockDb;
    });

    describe('init() method error handling', () => {
        it('should handle database list failure', async () => {
            // Mock db.list to throw an error
            const mockError = new Error('Failed to list databases');
            repository.client.db.list.mockRejectedValue(mockError);

            await expect(repository.init()).rejects.toThrow('Failed to list databases');
            expect(repository.client.db.list).toHaveBeenCalled();
        });

        it('should handle database creation failure', async () => {
            // Mock db.create to throw an error
            const mockError = new Error('Failed to create database');
            repository.client.db.list.mockResolvedValue([]);
            repository.client.db.create.mockRejectedValue(mockError);

            await expect(repository.init()).rejects.toThrow('Failed to create database');
            expect(repository.client.db.list).toHaveBeenCalled();
            expect(repository.client.db.create).toHaveBeenCalledWith(dbName);
        });

        it('should handle design document get error other than 404', async () => {
            // Mock db.get to throw a non-404 error
            const mockError = new Error('Internal server error');
            mockError.statusCode = 500;

            // Set up the mocks to simulate the error scenario
            repository.client.db.list.mockResolvedValue([dbName]); // Database already exists
            repository.db.get.mockRejectedValue(mockError); // Design doc get fails with 500

            await expect(repository.init()).rejects.toThrow('Internal server error');
            expect(repository.db.get).toHaveBeenCalledWith('_design/notes');
        });

        it('should handle design document insert failure', async () => {
            // Mock db.get to throw a 404 error and db.insert to throw an error
            const getError = new Error('Not found');
            getError.statusCode = 404;

            const insertError = new Error('Failed to insert design document');

            // Set up the mocks to simulate the error scenario
            repository.client.db.list.mockResolvedValue([dbName]); // Database already exists
            repository.db.get.mockRejectedValue(getError); // Design doc get fails with 404
            repository.db.insert.mockRejectedValue(insertError); // Design doc insert fails

            await expect(repository.init()).rejects.toThrow('Failed to insert design document');
            expect(repository.db.get).toHaveBeenCalledWith('_design/notes');
            expect(repository.db.insert).toHaveBeenCalled();
        });
    });

    describe('_mapResult() method edge cases', () => {
        it('should handle null result', async () => {
            const result = repository._mapResult(null);
            expect(result).toEqual([]);
        });

        it('should handle undefined result', async () => {
            const result = repository._mapResult(undefined);
            expect(result).toEqual([]);
        });

        it('should handle result without rows property', async () => {
            const result = repository._mapResult({});
            expect(result).toEqual([]);
        });

        it('should handle result with empty rows array', async () => {
            const result = repository._mapResult({ rows: [] });
            expect(result).toEqual([]);
        });

        it('should handle result with rows containing null doc', async () => {
            const result = repository._mapResult({ rows: [{ doc: null }] });
            expect(result).toEqual([]);
        });

        it('should handle result with rows missing doc property', async () => {
            const result = repository._mapResult({ rows: [{}] });
            expect(result).toEqual([]);
        });

        it('should handle result with mixed valid and invalid rows', async () => {
            const validDoc = {
                _id: 'note1',
                title: 'Valid Note',
                content: 'Valid Content',
                deletedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = repository._mapResult({
                rows: [
                    { doc: validDoc },
                    { doc: null },
                    {}
                ]
            });

            expect(result.length).toBe(1);
            expect(result[0].id).toBe('note1');
        });
    });

    describe('Database connection failure handling', () => {
        beforeEach(() => {
            // Setup repository with a db that throws connection errors
            repository.db = {
                view: jest.fn().mockRejectedValue(new Error('Connection failed')),
                get: jest.fn().mockRejectedValue(new Error('Connection failed')),
                insert: jest.fn().mockRejectedValue(new Error('Connection failed')),
                destroy: jest.fn().mockRejectedValue(new Error('Connection failed'))
            };
        });

        it('should handle connection failure in findAll()', async () => {
            await expect(repository.findAll()).rejects.toThrow('Connection failed');
            expect(repository.db.view).toHaveBeenCalled();
        });

        it('should handle connection failure in findDeleted()', async () => {
            await expect(repository.findDeleted()).rejects.toThrow('Connection failed');
            expect(repository.db.view).toHaveBeenCalled();
        });

        it('should handle connection failure in findAllIncludingDeleted()', async () => {
            await expect(repository.findAllIncludingDeleted()).rejects.toThrow('Connection failed');
            expect(repository.db.view).toHaveBeenCalled();
        });

        it('should handle connection failure in create()', async () => {
            await expect(repository.create({ title: 'Test', content: 'Test' })).rejects.toThrow('Connection failed');
            expect(repository.db.insert).toHaveBeenCalled();
        });
    });
});

describe('CouchDbNoteRepository Error Scenarios', () => {
    let repository;
    const testUrl = 'http://admin:password@localhost:5984';
    const testDbName = 'test_notes_error_db';

    beforeEach(() => {
        repository = new CouchDbNoteRepository(testUrl, testDbName);
    });

    describe('Initialization Error Scenarios', () => {
        test('should handle database creation errors during init', async () => {
            // Mock the nano client to throw an error during database creation
            const mockClient = {
                db: {
                    list: jest.fn().mockResolvedValue([]), // DB doesn't exist
                    create: jest.fn().mockRejectedValue(new Error('Database creation failed'))
                }
            };
            
            repository.client = mockClient;
            
            await expect(repository.init()).rejects.toThrow('Database creation failed');
        });

        test('should handle design document creation errors during init', async () => {
            const mockDb = {
                get: jest.fn().mockRejectedValue({ statusCode: 404 }),
                insert: jest.fn().mockRejectedValue(new Error('Design document creation failed'))
            };
            
            const mockClient = {
                db: {
                    list: jest.fn().mockResolvedValue([testDbName]),
                },
                use: jest.fn().mockReturnValue(mockDb)
            };
            
            repository.client = mockClient;
            
            await expect(repository.init()).rejects.toThrow('Design document creation failed');
        });

        test('should handle unexpected errors during design document retrieval', async () => {
            const mockDb = {
                get: jest.fn().mockRejectedValue(new Error('Unexpected database error'))
            };
            
            const mockClient = {
                db: {
                    list: jest.fn().mockResolvedValue([testDbName]),
                },
                use: jest.fn().mockReturnValue(mockDb)
            };
            
            repository.client = mockClient;
            
            await expect(repository.init()).rejects.toThrow('Unexpected database error');
        });

        test('should handle design document update errors', async () => {
            const existingDoc = {
                _id: '_design/notes',
                _rev: '1-abc123',
                views: {
                    all: { map: "function(doc) { emit(doc._id, null); }" }
                    // Missing 'active' and 'deleted' views
                }
            };
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockRejectedValue(new Error('Update failed'))
            };
            
            const mockClient = {
                db: {
                    list: jest.fn().mockResolvedValue([testDbName]),
                },
                use: jest.fn().mockReturnValue(mockDb)
            };
            
            repository.client = mockClient;
            
            await expect(repository.init()).rejects.toThrow('Update failed');
        });
    });

    describe('Query Error Scenarios', () => {
        test('should handle view query errors in findAll', async () => {
            const mockDb = {
                view: jest.fn().mockRejectedValue(new Error('View query failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.findAll()).rejects.toThrow('View query failed');
        });

        test('should handle view query errors in findDeleted', async () => {
            const mockDb = {
                view: jest.fn().mockRejectedValue(new Error('Deleted view query failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.findDeleted()).rejects.toThrow('Deleted view query failed');
        });

        test('should handle view query errors in findAllIncludingDeleted', async () => {
            const mockDb = {
                view: jest.fn().mockRejectedValue(new Error('All view query failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.findAllIncludingDeleted()).rejects.toThrow('All view query failed');
        });

        test('should handle view query errors in countDeleted', async () => {
            const mockDb = {
                view: jest.fn().mockRejectedValue(new Error('Count view query failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.countDeleted()).rejects.toThrow('Count view query failed');
        });
    });

    describe('Document Operation Error Scenarios', () => {
        test('should handle document retrieval errors in findById', async () => {
            const mockDb = {
                get: jest.fn().mockRejectedValue(new Error('Document retrieval failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.findById('test-id')).rejects.toThrow('Document retrieval failed');
        });

        test('should handle document creation errors in create', async () => {
            const mockDb = {
                insert: jest.fn().mockRejectedValue(new Error('Document creation failed'))
            };
            
            repository.db = mockDb;
            
            const note = { title: 'Test Note', content: 'Test content' };
            await expect(repository.create(note)).rejects.toThrow('Document creation failed');
        });

        test('should handle document update errors in update', async () => {
            const existingDoc = {
                _id: 'test-id',
                _rev: '1-abc123',
                title: 'Old Title',
                content: 'Old content',
                createdAt: new Date().toISOString(),
                deletedAt: null
            };
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockRejectedValue(new Error('Document update failed'))
            };
            
            repository.db = mockDb;
            
            const updatedNote = { title: 'New Title', content: 'New content' };
            await expect(repository.update('test-id', updatedNote)).rejects.toThrow('Document update failed');
        });

        test('should handle conflict errors (409) in update', async () => {
            const existingDoc = {
                _id: 'test-id',
                _rev: '1-abc123',
                title: 'Old Title',
                content: 'Old content',
                createdAt: new Date().toISOString(),
                deletedAt: null
            };
            
            const conflictError = new Error('Document conflict');
            conflictError.statusCode = 409;
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockRejectedValue(conflictError)
            };
            
            repository.db = mockDb;
            
            const updatedNote = { title: 'New Title', content: 'New content' };
            await expect(repository.update('test-id', updatedNote)).rejects.toThrow('Document was modified concurrently. Please try again.');
        });

        test('should handle moveToRecycleBin errors during document update', async () => {
            const existingDoc = {
                _id: 'test-id',
                _rev: '1-abc123',
                title: 'Test Title',
                content: 'Test content',
                createdAt: new Date().toISOString(),
                deletedAt: null
            };
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockRejectedValue(new Error('Move to recycle bin failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.moveToRecycleBin('test-id')).rejects.toThrow('Move to recycle bin failed');
        });

        test('should handle restore errors during document update', async () => {
            const existingDoc = {
                _id: 'test-id',
                _rev: '1-abc123',
                title: 'Test Title',
                content: 'Test content',
                createdAt: new Date().toISOString(),
                deletedAt: new Date().toISOString()
            };
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockRejectedValue(new Error('Restore failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.restore('test-id')).rejects.toThrow('Restore failed');
        });

        test('should handle permanent delete errors', async () => {
            const existingDoc = {
                _id: 'test-id',
                _rev: '1-abc123',
                title: 'Test Title',
                content: 'Test content'
            };
            
            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                destroy: jest.fn().mockRejectedValue(new Error('Permanent deletion failed'))
            };
            
            repository.db = mockDb;
            
            await expect(repository.permanentDelete('test-id')).rejects.toThrow('Permanent deletion failed');
        });

        test('should handle emptyRecycleBin errors', async () => {
            // Mock findDeleted to return some notes
            const deletedNotes = [
                new Note('note1', 'Title 1', 'Content 1', new Date(), new Date(), new Date()),
                new Note('note2', 'Title 2', 'Content 2', new Date(), new Date(), new Date())
            ];
            
            repository.findDeleted = jest.fn().mockResolvedValue(deletedNotes);
            repository.permanentDelete = jest.fn()
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('Permanent delete failed'));
            
            await expect(repository.emptyRecycleBin()).rejects.toThrow('Permanent delete failed');
        });
    });

    describe('Result Processing Error Scenarios', () => {
        test('should handle empty results in findAll', async () => {
            const mockDb = {
                view: jest.fn().mockResolvedValue({ rows: null })
            };
            
            repository.db = mockDb;
            
            const result = await repository.findAll();
            expect(result).toEqual([]);
        });

        test('should handle rows without documents in findAll', async () => {
            const mockDb = {
                view: jest.fn().mockResolvedValue({
                    rows: [
                        { doc: null },
                        { doc: undefined },
                        {
                            doc: {
                                _id: 'valid-note',
                                title: 'Valid Note',
                                content: 'Valid content',
                                deletedAt: null,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                        }
                    ]
                })
            };
            
            repository.db = mockDb;
            
            const result = await repository.findAll();
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Valid Note');
        });

        test('should handle _mapResult with null results', () => {
            const result = repository._mapResult(null);
            expect(result).toEqual([]);
        });

        test('should handle _mapResult with no rows', () => {
            const result = repository._mapResult({ rows: null });
            expect(result).toEqual([]);
        });
    });

    describe('Additional Coverage', () => {
        test('init should log when updating existing design document with missing views', async () => {
            const existingDoc = {
                _id: '_design/notes',
                _rev: '1-abc',
                views: {
                    all: { map: 'function(doc) { emit(doc._id, null); }' }
                }
            };

            const mockDb = {
                get: jest.fn().mockResolvedValue(existingDoc),
                insert: jest.fn().mockResolvedValue({ ok: true })
            };
            const mockClient = {
                db: {
                    list: jest.fn().mockResolvedValue(['test_notes_error_db'])
                },
                use: jest.fn().mockReturnValue(mockDb)
            };
            
            repository.client = mockClient;

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            await repository.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('Updated design document with all views');
            consoleSpy.mockRestore();
        });

        test('moveToRecycleBin should return false when insert throws 404', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue({ _id: 'note1', _rev: '1-rev' }),
                insert: jest.fn().mockRejectedValue({ statusCode: 404 })
            };
            repository.db = mockDb;

            const result = await repository.moveToRecycleBin('note1');
            expect(result).toBe(false);
        });

        test('restore should return false when insert throws 404', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue({ _id: 'note1', _rev: '1-rev' }),
                insert: jest.fn().mockRejectedValue({ statusCode: 404 })
            };
            repository.db = mockDb;

            const result = await repository.restore('note1');
            expect(result).toBe(false);
        });

        test('permanentDelete should return false when destroy throws 404', async () => {
            const mockDb = {
                get: jest.fn().mockResolvedValue({ _id: 'note1', _rev: '1-rev' }),
                destroy: jest.fn().mockRejectedValue({ statusCode: 404 })
            };
            repository.db = mockDb;

            const result = await repository.permanentDelete('note1');
            expect(result).toBe(false);
        });

        test('restoreAll should handle errors', async () => {
            repository.findDeleted = jest.fn().mockRejectedValue(new Error('findDeleted failed'));
            await expect(repository.restoreAll()).rejects.toThrow('findDeleted failed');
        });

        test('countDeleted should handle errors', async () => {
            const mockDb = {
                view: jest.fn().mockRejectedValue(new Error('view failed'))
            };
            repository.db = mockDb;
            await expect(repository.countDeleted()).rejects.toThrow('view failed');
        });
    });
});
