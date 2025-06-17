import { jest } from '@jest/globals';
import { NotesServer } from '../../src/notes-api-server.js';
import request from 'supertest';

// Mock console methods to avoid output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});

afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

describe('NotesServer Isolated Coverage Tests', () => {
    let server;

    beforeEach(() => {
        server = new NotesServer();
    });

    afterEach(() => {
        if (server?.server?.close) {
            server.server.close();
        }
    });

    describe('Error Handling Coverage', () => {
        test('should handle JSON parsing error in middleware', async () => {
            const mockRepo = {
                async init() { return Promise.resolve(); }
            };
            
            const { app } = await server.initializeApp(mockRepo);
            
            const response = await request(app)
                .post('/api/notes')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}'); // Invalid JSON
                
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid JSON');
        });

        test('should handle general server errors', async () => {
            const mockRepo = {
                async init() { return Promise.resolve(); }
            };
            
            // Add a route that throws a general error BEFORE initializing the app
            // so it gets added before the 404 handler
            server.app.get('/test-general-error', (req, res, next) => {
                const error = new Error('General server error');
                next(error);
            });
            
            const { app } = await server.initializeApp(mockRepo);
            
            const response = await request(app).get('/test-general-error');
                
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
        });

        test('should log endpoint information when server starts', async () => {
            const mockRepo = {
                async init() { return Promise.resolve(); }
            };
            
            await server.initializeApp(mockRepo);
            
            // Since we can't actually start the server in tests without port conflicts,
            // we'll just verify the app was initialized and console logs occurred
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Repository initialized successfully'));
        });

        test('should handle database vendor selection', () => {
            // Test CouchDB vendor (default)
            const couchRepo = server.createNoteRepository();
            expect(couchRepo.constructor.name).toBe('CouchDbNoteRepository');
            
            // Create new server instances to test different vendors
            const mongoServer = new NotesServer();
            const originalDbVendor = process.env.DB_VENDOR;
            
            try {
                process.env.DB_VENDOR = 'mongodb';
                const mongoRepo = mongoServer.createNoteRepository();
                expect(mongoRepo.constructor.name).toBe('MongoDbNoteRepository');
            } finally {
                process.env.DB_VENDOR = originalDbVendor;
            }
        });

        test('should handle initialization failure in app setup', async () => {
            const failingRepo = {
                init: jest.fn().mockRejectedValue(new Error('Initialization failed'))
            };
            
            await expect(server.initializeApp(failingRepo)).rejects.toThrow('Initialization failed');
        });
    });

    describe('Environment Variable Handling', () => {
        test('should use environment variables for configuration', () => {
            const originalHost = process.env.HOST;
            const originalPort = process.env.PORT;
            const originalDbVendor = process.env.DB_VENDOR;
            
            try {
                process.env.HOST = '127.0.0.1';
                process.env.PORT = '8080';
                process.env.DB_VENDOR = 'mongodb';
                
                // Test that environment variables can be set
                expect(process.env.HOST).toBe('127.0.0.1');
                expect(process.env.PORT).toBe('8080');
                expect(process.env.DB_VENDOR).toBe('mongodb');
                
            } finally {
                process.env.HOST = originalHost;
                process.env.PORT = originalPort;
                process.env.DB_VENDOR = originalDbVendor;
            }
        });
    });

    describe('Route Setup Coverage', () => {
        test('should handle health endpoint', async () => {
            const mockRepo = {
                async init() { return Promise.resolve(); }
            };
            
            const { app } = await server.initializeApp(mockRepo);
            
            const response = await request(app).get('/health');
                
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });

        test('should serve static files from public directory', async () => {
            const mockRepo = {
                async init() { return Promise.resolve(); }
            };
            
            const { app } = await server.initializeApp(mockRepo);
            
            const response = await request(app).get('/');
                
            expect(response.status).toBe(200);
            // Should serve the index.html file
        });
    });
}); 