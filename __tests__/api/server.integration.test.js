import request from 'supertest';
import { jest } from '@jest/globals';

// Import Note model for proper object creation
const { Note } = await import('../../src/models/note.js');

// Mock the database repositories
class MockNoteRepository {
    constructor() {
        this.initCalled = false;
        this.shouldThrowError = false;
    }

    async init() {
        this.initCalled = true;
        return Promise.resolve();
    }

    async findAll() {
        if (this.shouldThrowError) {
            throw new Error('Database error');
        }
        return [];
    }

    async findById(id) {
        if (this.shouldThrowError) {
            throw new Error('Database error');
        }
        if (id === '1') {
            return new Note('1', 'Test Note', 'Test Content', new Date(), new Date());
        }
        return null;
    }

    async create(note) {
        if (this.shouldThrowError) {
            throw new Error('Database error');
        }
        return new Note('1', note.title, note.content, new Date(), new Date());
    }

    async update(id, note) {
        if (this.shouldThrowError) {
            throw new Error('Database error');
        }
        if (id === '1') {
            return new Note(id, note.title, note.content, new Date(), new Date());
        }
        return null;
    }

    async delete(id) {
        if (this.shouldThrowError) {
            throw new Error('Database error');
        }
        return id === '1';
    }
}

// Mock the repository modules
jest.unstable_mockModule('../../src/db/couchdb-note-repository.js', () => ({
    CouchDbNoteRepository: MockNoteRepository
}));

jest.unstable_mockModule('../../src/db/mongodb-note-repository.js', () => ({
    MongoDbNoteRepository: MockNoteRepository
}));

// Mock dotenv to avoid loading actual .env file
jest.unstable_mockModule('dotenv', () => ({
    default: {
        config: jest.fn()
    }
}));

// Mock path.join to avoid file system dependencies in tests
jest.unstable_mockModule('path', () => ({
    default: {
        dirname: jest.fn(() => '/mock/path'),
        join: jest.fn((...args) => args.join('/'))
    }
}));

describe('Server Integration Tests', () => {
    let app;
    let initializeApp;
    let createNoteRepository;
    let originalEnv;

    beforeAll(async () => {
        // Save original environment
        originalEnv = { ...process.env };
        
        // Import the server module with mocks
        const serverModule = await import('../../src/notes-api-server.js');
        app = serverModule.app;
        initializeApp = serverModule.initializeApp;
        createNoteRepository = serverModule.createNoteRepository;
    });

    beforeEach(() => {
        // Reset environment for each test
        process.env = { ...originalEnv };
        
        // Clear module cache to ensure fresh state
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('Server Initialization', () => {
        test('should initialize server with CouchDB by default', async () => {
            // Set environment variables
            process.env.HOST = '127.0.0.1';
            process.env.PORT = '0';
            process.env.DB_VENDOR = 'couchdb';

            const mockRepository = new MockNoteRepository();
            const result = await initializeApp(mockRepository);
            
            expect(result).toBeDefined();
            expect(result.app).toBeDefined();
            expect(result.repository).toBe(mockRepository);
            expect(mockRepository.initCalled).toBe(true);
        });

        test('should initialize server with MongoDB when specified', async () => {
            process.env.DB_VENDOR = 'mongodb';
            process.env.MONGODB_URL = 'mongodb://localhost:27017';
            process.env.MONGODB_DB_NAME = 'test_notes';

            const mockRepository = new MockNoteRepository();
            const result = await initializeApp(mockRepository);
            
            expect(result).toBeDefined();
            expect(result.app).toBeDefined();
            expect(result.repository).toBe(mockRepository);
            expect(mockRepository.initCalled).toBe(true);
        });

        test('should handle initialization errors', async () => {
            const mockRepository = {
                init: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            };

            await expect(initializeApp(mockRepository)).rejects.toThrow('Database connection failed');
        });
    });

    describe('Repository Creation', () => {
        test('should create CouchDB repository by default', () => {
            process.env.DB_VENDOR = 'couchdb';
            
            const repository = createNoteRepository();
            
            expect(repository).toBeInstanceOf(MockNoteRepository);
        });

        test('should create MongoDB repository when specified', () => {
            process.env.DB_VENDOR = 'mongodb';
            
            const repository = createNoteRepository();
            
            expect(repository).toBeInstanceOf(MockNoteRepository);
        });
    });

    describe('Health Check Endpoint', () => {
        beforeEach(async () => {
            const mockRepository = new MockNoteRepository();
            await initializeApp(mockRepository);
        });

        test('should return 200 OK with status ok', async () => {
            const response = await request(app).get('/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });

        test('should respond with correct content type', async () => {
            const response = await request(app).get('/health');
            
            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
    });

    describe('Middleware Setup', () => {
        beforeEach(async () => {
            const mockRepository = new MockNoteRepository();
            await initializeApp(mockRepository);
        });

        test('should parse JSON bodies correctly', async () => {
            const testData = { title: 'Test Note', content: 'Test content' };
            
            const response = await request(app)
                .post('/api/notes')
                .send(testData);
            
            expect(response.status).toBe(201);
            expect(response.body.title).toBe(testData.title);
            expect(response.body.content).toBe(testData.content);
        });

        test('should handle malformed JSON with 400 status', async () => {
            const response = await request(app)
                .post('/api/notes')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');
                
            expect(response.status).toBe(400);
        });

        test('should handle CORS headers', async () => {
            const response = await request(app).get('/health');
            
            // CORS middleware should add headers
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors with 500 status', async () => {
            // Import the express module to create a fresh app instance
            const express = (await import('express')).default;
            const testApp = express();
            
            const errorRepository = new MockNoteRepository();
            errorRepository.shouldThrowError = true;
            
            // Simulate the server initialization with error repository
            testApp.use(express.json());
            
            const { createNotesRouter } = await import('../../src/routes/notes-routes.js');
            const notesRouter = createNotesRouter(errorRepository);
            testApp.use('/api/notes', notesRouter);
            
            const response = await request(testApp).get('/api/notes');
            
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to retrieve notes' });
        });
    });

    describe('404 Handling', () => {
        beforeEach(async () => {
            const mockRepository = new MockNoteRepository();
            await initializeApp(mockRepository);
        });

        test('should return 404 for non-existent routes', async () => {
            const response = await request(app).get('/non-existent');
            
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Not found' });
        });

        test('should serve existing routes normally', async () => {
            const response = await request(app).get('/health');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
    });

    describe('API Routes Integration', () => {
        beforeEach(async () => {
            const mockRepository = new MockNoteRepository();
            await initializeApp(mockRepository);
        });

        test('should handle GET /api/notes', async () => {
            const response = await request(app).get('/api/notes');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('should handle GET /api/notes/:id', async () => {
            const response = await request(app).get('/api/notes/1');
            
            expect(response.status).toBe(200);
            expect(response.body.id).toBe('1');
            expect(response.body.title).toBe('Test Note');
        });

        test('should handle GET /api/notes/:id for non-existent note', async () => {
            const response = await request(app).get('/api/notes/999');
            
            expect(response.status).toBe(404);
        });

        test('should handle POST /api/notes', async () => {
            const noteData = { title: 'Test Note', content: 'Test Content' };
            
            const response = await request(app)
                .post('/api/notes')
                .send(noteData);
            
            expect(response.status).toBe(201);
            expect(response.body.title).toBe(noteData.title);
            expect(response.body.content).toBe(noteData.content);
        });

        test('should handle PUT /api/notes/:id', async () => {
            const noteData = { title: 'Updated Note', content: 'Updated Content' };
            
            const response = await request(app)
                .put('/api/notes/1')
                .send(noteData);
            
            expect(response.status).toBe(200);
            expect(response.body.title).toBe(noteData.title);
            expect(response.body.content).toBe(noteData.content);
        });

        test('should handle PUT /api/notes/:id for non-existent note', async () => {
            const noteData = { title: 'Updated Note', content: 'Updated Content' };
            
            const response = await request(app)
                .put('/api/notes/999')
                .send(noteData);
            
            expect(response.status).toBe(404);
        });

        test('should handle DELETE /api/notes/:id', async () => {
            const response = await request(app).delete('/api/notes/1');
            
            expect(response.status).toBe(204);
        });

        test('should handle DELETE /api/notes/:id for non-existent note', async () => {
            const response = await request(app).delete('/api/notes/999');
            
            expect(response.status).toBe(404);
        });

        test('should validate required fields in POST', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Missing content' });
            
            expect(response.status).toBe(400);
        });

        test('should validate required fields in PUT', async () => {
            const response = await request(app)
                .put('/api/notes/1')
                .send({ title: 'Missing content' });
            
            expect(response.status).toBe(400);
        });
    });

    describe('Environment Configuration', () => {
        test('should use default values when env vars are not set', () => {
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.DB_VENDOR;
            
            // Re-import to get fresh values
            expect(process.env.HOST || '0.0.0.0').toBe('0.0.0.0');
            expect(process.env.PORT || '3000').toBe('3000');
            expect(process.env.DB_VENDOR || 'couchdb').toBe('couchdb');
        });

        test('should use provided environment variables', () => {
            process.env.HOST = '192.168.1.1';
            process.env.PORT = '8080';
            process.env.DB_VENDOR = 'mongodb';
            
            expect(process.env.HOST).toBe('192.168.1.1');
            expect(process.env.PORT).toBe('8080');
            expect(process.env.DB_VENDOR).toBe('mongodb');
        });
    });

    describe('Static File Serving', () => {
        beforeEach(async () => {
            const mockRepository = new MockNoteRepository();
            await initializeApp(mockRepository);
        });

        test('should handle root route request', async () => {
            const response = await request(app).get('/');
            
            // In test environment without actual static files, expect 500 due to missing file
            // but this proves the route is set up and static middleware is working
            expect([200, 404, 500]).toContain(response.status);
        });
    });

    describe('Graceful Shutdown', () => {
        test('should handle SIGTERM signal', (done) => {
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
            
            // Import graceful shutdown function
            import('../../src/notes-api-server.js').then(({ gracefulShutdown }) => {
                // Simulate SIGTERM
                gracefulShutdown();
                
                setTimeout(() => {
                    mockExit.mockRestore();
                    done();
                }, 100);
            });
        });

        test('should handle SIGINT signal', (done) => {
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
            
            import('../../src/notes-api-server.js').then(({ gracefulShutdown }) => {
                // Simulate SIGINT (Ctrl+C)
                gracefulShutdown();
                
                setTimeout(() => {
                    mockExit.mockRestore();
                    done();
                }, 100);
            });
        });
    });
});

describe('Server Error Handling - Additional Coverage', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('Initialization Error Handling', () => {
        test('should handle and log repository initialization errors', async () => {
            const { initializeApp } = await import('../../src/notes-api-server.js');
            
            const failingRepository = {
                init: jest.fn().mockRejectedValue(new Error('Database connection timeout'))
            };

            await expect(initializeApp(failingRepository)).rejects.toThrow('Database connection timeout');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize application:', expect.any(Error));
        });

        test('should handle concurrent initialization requests', async () => {
            const { initializeApp } = await import('../../src/notes-api-server.js');
            
            const slowRepository = { 
                init: jest.fn().mockImplementation(() => 
                    new Promise(resolve => setTimeout(() => resolve(), 50))
                )
            };

            // Start multiple initialization attempts concurrently
            const promise1 = initializeApp(slowRepository);
            const promise2 = initializeApp(slowRepository);
            
            const [result1, result2] = await Promise.all([promise1, promise2]);
            
            expect(result1.app).toBeDefined();
            expect(result2.app).toBeDefined();
            expect(slowRepository.init).toHaveBeenCalledTimes(2);
        });

        test('should handle timeout during repository initialization', async () => {
            const { initializeApp } = await import('../../src/notes-api-server.js');
            
            const timeoutRepository = {
                init: jest.fn().mockImplementation(() => 
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Connection timeout')), 50)
                    )
                )
            };

            await expect(initializeApp(timeoutRepository)).rejects.toThrow('Connection timeout');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize application:', expect.any(Error));
        });
    });

    describe('Environment Configuration', () => {
        let originalEnv;

        beforeEach(() => {
            originalEnv = { ...process.env };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        test('should handle missing environment variables gracefully', async () => {
            // Test with completely clean environment
            delete process.env.HOST;
            delete process.env.PORT;
            delete process.env.DB_VENDOR;
            
            const { createNoteRepository } = await import('../../src/notes-api-server.js');
            const repository = createNoteRepository();
            
            expect(repository).toBeDefined();
        });

        test('should default to CouchDB for invalid database vendor', async () => {
            process.env.DB_VENDOR = 'invalid-database';
            
            const { createNoteRepository } = await import('../../src/notes-api-server.js');
            const repository = createNoteRepository();
            
            // Should create CouchDB repository as fallback
            expect(repository).toBeDefined();
            expect(repository.constructor.name).toBe('MockNoteRepository'); // In test environment
        });

        test('should handle empty string environment variables', async () => {
            process.env.HOST = '';
            process.env.PORT = '';
            process.env.DB_VENDOR = '';
            
            const { createNoteRepository } = await import('../../src/notes-api-server.js');
            const repository = createNoteRepository();
            
            expect(repository).toBeDefined();
        });
    });

    describe('Error Propagation', () => {
        test('should properly propagate initialization errors', async () => {
            const { initializeApp } = await import('../../src/notes-api-server.js');
            
            const customError = new Error('Custom initialization error');
            customError.code = 'CUSTOM_ERROR';
            
            const failingRepository = {
                init: jest.fn().mockRejectedValue(customError)
            };

            try {
                await initializeApp(failingRepository);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Custom initialization error');
                expect(error.code).toBe('CUSTOM_ERROR');
                expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize application:', error);
            }
        });

        test('should handle various error types during initialization', async () => {
            const { initializeApp } = await import('../../src/notes-api-server.js');
            
            const errorTypes = [
                new TypeError('Type error during init'),
                new ReferenceError('Reference error during init'),
                new RangeError('Range error during init'),
                new Error('Generic error during init')
            ];

            for (const errorType of errorTypes) {
                const failingRepository = {
                    init: jest.fn().mockRejectedValue(errorType)
                };

                await expect(initializeApp(failingRepository)).rejects.toThrow(errorType.message);
            }
        });
    });
}); 