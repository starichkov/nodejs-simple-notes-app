import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';
import {CouchDbNoteRepository} from './db/couchdb-note-repository.js';
import {MongoDbNoteRepository} from './db/mongodb-note-repository.js';
import {createNotesRouter} from './routes/notes-routes.js';

// Load environment variables
dotenv.config();

// Get configuration from environment variables
export const HOST = process.env.HOST || '0.0.0.0';
export const PORT = process.env.PORT || 3000;
export const DB_VENDOR = process.env.DB_VENDOR || 'couchdb';

// CouchDB configuration
export const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
export const COUCHDB_DB_NAME = process.env.COUCHDB_DB_NAME || 'notes_db';

// MongoDB configuration
export const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'notes_db';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * NotesServer class encapsulates server lifecycle and eliminates module-level state
 */
export class NotesServer {
    constructor() {
        this.server = null;
        this.app = express();
    }

    /**
     * Create the appropriate repository based on the DB_VENDOR
     */
    createNoteRepository() {
        if (DB_VENDOR === 'mongodb') {
            console.log('Using MongoDB as the database vendor');
            return new MongoDbNoteRepository(MONGODB_URL, MONGODB_DB_NAME);
        } else {
            console.log('Using CouchDB as the database vendor');
            return new CouchDbNoteRepository(COUCHDB_URL, COUCHDB_DB_NAME);
        }
    }

    /**
     * Graceful shutdown function
     */
    gracefulShutdown() {
        console.log('Shutting down gracefully...');
        if (this.server) {
            // Store timeout ID so we can clear it if shutdown completes
            const forceShutdownTimeout = setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);

            this.server.close(() => {
                console.log('HTTP server closed');
                // Clear the force shutdown timeout since we completed gracefully
                clearTimeout(forceShutdownTimeout);
                // Close database connections, etc.
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    }

    /**
     * Initialize the application
     */
    async initializeApp(noteRepository = null) {
        try {
            // Clear any existing middleware/routes for testing
            this.app._router = undefined;
            
            this.app.use(helmet());
            this.app.use(cors());

            // Middleware for parsing JSON bodies
            this.app.use(express.json());

            // Serve static files from the public directory
            this.app.use(express.static(path.join(__dirname, 'public')));

            // Use provided repository or create default one
            const repository = noteRepository || this.createNoteRepository();
            
            // Initialize the repository
            await repository.init();
            console.log('Repository initialized successfully');

            // Create and mount the notes router
            const notesRouter = createNotesRouter(repository);
            this.app.use('/api/notes', notesRouter);

            // Add a simple health check endpoint
            this.app.get('/health', (req, res) => {
                res.status(200).json({status: 'ok'});
            });

            // Serve the index.html file for the root route
            this.app.get('/', (req, res) => {
                res.sendFile(path.join(__dirname, 'public', 'index.html'));
            });

            // 404 handler for undefined routes
            this.app.use((req, res) => {
                res.status(404).json({ error: 'Not found' });
            });

            // Error handling middleware
            this.app.use((err, req, res, next) => {
                console.error('Unhandled error:', err);
                
                // Handle JSON parsing errors
                if (err.type === 'entity.parse.failed') {
                    return res.status(400).json({ error: 'Invalid JSON' });
                }
                
                // Default to 500 for other errors
                res.status(500).json({error: 'Internal server error'});
            });

            return { app: this.app, repository };
        } catch (error) {
            console.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * Start the server
     */
    startServer() {
        this.server = this.app.listen(PORT, HOST, () => {
            console.log(`Notes API server is running at http://${HOST}:${PORT}`);
            console.log('Available endpoints:');
            console.log('  GET    /                - Web UI for notes management');
            console.log('  GET    /api/notes       - Get all notes');
            console.log('  GET    /api/notes/:id   - Get a note by ID');
            console.log('  POST   /api/notes       - Create a new note');
            console.log('  PUT    /api/notes/:id   - Update a note');
            console.log('  DELETE /api/notes/:id   - Delete a note');
            console.log('  GET    /health          - Health check');
            console.log('\nOpen your browser at http://localhost:' + PORT + ' to use the Notes UI');
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());

        return this.server;
    }
}

// Create global instance for backward compatibility
const globalNotesServer = new NotesServer();

// Convenience exports that use the global instance
export const app = globalNotesServer.app;
export const createNoteRepository = () => globalNotesServer.createNoteRepository();
export const gracefulShutdown = () => globalNotesServer.gracefulShutdown();
export const initializeApp = (noteRepository = null) => globalNotesServer.initializeApp(noteRepository);
export const startServer = () => globalNotesServer.startServer();

// Only start the server if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    const notesServer = new NotesServer();
    notesServer.initializeApp()
        .then(() => {
            notesServer.startServer();
        })
        .catch(error => {
            console.error('Application startup failed:', error);
            process.exit(1);
        });
}
