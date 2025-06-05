import { jest } from '@jest/globals';
import { app, startServer, gracefulShutdown, initializeApp, createNoteRepository, NotesServer } from '../../src/notes-api-server.js';

// Mock process methods
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
const mockOn = jest.spyOn(process, 'on').mockImplementation(() => {});

// Mock console methods to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock server object
let mockServer;

describe('Server Lifecycle Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Ensure we start with real timers
        if (jest.isMockFunction(setTimeout)) {
            jest.useRealTimers();
        }
        
        // Create a mock server object
        mockServer = {
            listen: jest.fn(),
            close: jest.fn(),
            address: jest.fn(() => ({ address: '0.0.0.0', port: 3000 }))
        };
    });

    afterEach(() => {
        // Clean up any server instances
        if (mockServer && mockServer.close) {
            mockServer.close();
        }
        
        // Clear any active timers to prevent leaks
        jest.clearAllTimers();
        
        // Ensure we're using real timers after each test
        if (jest.isMockFunction(setTimeout)) {
            jest.useRealTimers();
        }
    });

    describe('Backward Compatibility Exports', () => {
        it('should maintain backward compatibility with convenience exports', () => {
            // Test that the convenience exports work
            expect(typeof createNoteRepository).toBe('function');
            expect(typeof gracefulShutdown).toBe('function');
            expect(typeof initializeApp).toBe('function');
            expect(typeof startServer).toBe('function');
            expect(app).toBeDefined();
        });

        it('should create repositories via convenience export', () => {
            const repository = createNoteRepository();
            expect(repository.constructor.name).toMatch(/Repository$/);
        });
    });

    describe('NotesServer Class (Clean Architecture)', () => {
        it('should create independent server instances without state pollution', () => {
            // Create multiple instances - each is independent
            const server1 = new NotesServer();
            const server2 = new NotesServer();
            
            expect(server1.server).toBe(null);
            expect(server2.server).toBe(null);
            expect(server1).not.toBe(server2);
            expect(server1.app).not.toBe(server2.app);
        });

        it('should handle server lifecycle with instance methods', () => {
            const notesServer = new NotesServer();
            
            // Mock app.listen on the instance
            const mockListen = jest.spyOn(notesServer.app, 'listen').mockImplementation((port, host, callback) => {
                if (callback) callback();
                return mockServer;
            });

            const server = notesServer.startServer();
            
            expect(mockListen).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(String),
                expect.any(Function)
            );
            expect(server).toBe(mockServer);
            expect(notesServer.server).toBe(mockServer);

            mockListen.mockRestore();
        });

        it('should create repositories with instance method', async () => {
            // Test with fresh import to get updated environment variables
            const originalEnv = process.env.DB_VENDOR;
            
            // Test MongoDB repository creation
            process.env.DB_VENDOR = 'mongodb';
            const serverModuleMongo = await import('../../src/notes-api-server.js?' + Date.now());
            const notesServerMongo = new serverModuleMongo.NotesServer();
            const mongoRepo = notesServerMongo.createNoteRepository();
            expect(mongoRepo.constructor.name).toBe('MongoDbNoteRepository');
            
            // Test CouchDB repository creation
            process.env.DB_VENDOR = 'couchdb';
            const serverModuleCouch = await import('../../src/notes-api-server.js?' + Date.now());
            const notesServerCouch = new serverModuleCouch.NotesServer();
            const couchRepo = notesServerCouch.createNoteRepository();
            expect(couchRepo.constructor.name).toBe('CouchDbNoteRepository');
            
            process.env.DB_VENDOR = originalEnv;
        });

        it('should handle graceful shutdown with instance state', async () => {
            const notesServer = new NotesServer();
            
            // Mock server with close method that calls callback immediately
            const mockClose = jest.fn((callback) => {
                // Call callback immediately to simulate successful shutdown
                callback();
            });
            notesServer.server = { close: mockClose };
            
            // Mock clearTimeout to track if it's called
            const mockClearTimeout = jest.spyOn(global, 'clearTimeout');
            
            notesServer.gracefulShutdown();
            
            // Verify the shutdown process
            expect(mockConsoleLog).toHaveBeenCalledWith('Shutting down gracefully...');
            expect(mockClose).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('HTTP server closed');
            expect(mockClearTimeout).toHaveBeenCalled(); // Timeout should be cleared
            expect(mockExit).toHaveBeenCalledWith(0);
            
            mockClearTimeout.mockRestore();
        });

        it('should initialize app with instance-specific configuration', async () => {
            const notesServer = new NotesServer();
            
            // Mock repository
            const mockRepository = {
                init: jest.fn().mockResolvedValue(undefined)
            };
            
            const result = await notesServer.initializeApp(mockRepository);
            
            expect(result.app).toBe(notesServer.app);
            expect(result.repository).toBe(mockRepository);
            expect(mockRepository.init).toHaveBeenCalled();
        });
    });
}); 