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
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
const DB_VENDOR = process.env.DB_VENDOR || 'couchdb';

// CouchDB configuration
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const COUCHDB_DB_NAME = process.env.COUCHDB_DB_NAME || 'notes_db';

// MongoDB configuration
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'notes_db';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an Express application
const app = express();

// Create the appropriate repository based on the DB_VENDOR
let noteRepository;
if (DB_VENDOR === 'mongodb') {
    console.log('Using MongoDB as the database vendor');
    noteRepository = new MongoDbNoteRepository(MONGODB_URL, MONGODB_DB_NAME);
} else {
    console.log('Using CouchDB as the database vendor');
    noteRepository = new CouchDbNoteRepository(COUCHDB_URL, COUCHDB_DB_NAME);
}

// Initialize the application
async function initializeApp() {
    try {
        app.use(helmet());
        app.use(cors());

        // Middleware for parsing JSON bodies
        app.use(express.json());

        // Serve static files from the public directory
        app.use(express.static(path.join(__dirname, 'public')));

        // Initialize the repository
        await noteRepository.init();
        console.log('Repository initialized successfully');

        // Create and mount the notes router
        const notesRouter = createNotesRouter(noteRepository);
        app.use('/api/notes', notesRouter);

        // Add a simple health check endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({status: 'ok'});
        });

        // Serve the index.html file for the root route
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // 404 handler for undefined routes
        app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            res.status(500).json({error: 'Internal server error'});
        });

        // Start the server
        app.listen(PORT, HOST, () => {
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
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        function gracefulShutdown() {
            console.log('Shutting down gracefully...');
            server.close(() => {
                console.log('HTTP server closed');
                // Close database connections, etc.
                process.exit(0);
            });

            // Force close if graceful shutdown takes too long
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        }
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// Start the application
initializeApp().catch(error => {
    console.error('Application startup failed:', error);
    process.exit(1);
});
