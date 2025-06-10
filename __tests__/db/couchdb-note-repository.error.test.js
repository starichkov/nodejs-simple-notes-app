import { jest } from '@jest/globals';
import { CouchDbNoteRepository } from '../../src/db/couchdb-note-repository.js';

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
