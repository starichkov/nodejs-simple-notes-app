import {GenericContainer} from 'testcontainers';
import {MongoDbNoteRepository} from '../../src/db/mongodb-note-repository.js';
import {Note} from '../../src/models/note.js';
import mongoose from 'mongoose';

describe('MongoDbNoteRepository Integration Tests', () => {
    let container;
    let repository;
    const DB_NAME = 'notes_test';

    beforeAll(async () => {
        console.log('Starting MongoDB container...');
        // Start MongoDB container
        container = await new GenericContainer('mongo:7.0.20-jammy')
            .withExposedPorts(27017)
            .withEnvironment({
                MONGO_INITDB_ROOT_USERNAME: 'admin',
                MONGO_INITDB_ROOT_PASSWORD: 'password'
            })
            .start();

        // Create repository instance
        const port = container.getMappedPort(27017);
        console.log(`MongoDB container started on port ${port}`);
        // 2. Construct a URL with authSource but WITHOUT the database name in the path
        // 3. Instantiate and initialize your repository
        repository = new MongoDbNoteRepository(
            `mongodb://admin:password@localhost:${port}/?authSource=admin`,
            DB_NAME
        );

        // Initialize the database
        console.log('Initializing database...');
        await repository.init();
        console.log('Database initialized successfully');
    }, 60000); // Increase timeout for container startup

    afterAll(async () => {
        console.log('Stopping MongoDB container...');
        if (container) {
            // Close the MongoDB connection first
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
            
            await container.stop();
            console.log('MongoDB container stopped');
        }
    });

    beforeEach(async () => {
        try {
            const notes = await repository.findAll();
            console.log('Cleaning up notes:', notes);
            for (const note of notes) {
                console.log(`Deleting note ${note.id}...`);
                await repository.delete(note.id);
            }
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    describe('CRUD Operations', () => {
        it('should create and retrieve a note', async () => {
            console.log('\nTest: should create and retrieve a note');
            const noteData = {
                title: 'Test Note',
                content: 'Test Content'
            };

            console.log('Creating note:', noteData);
            const createdNote = await repository.create(noteData);
            console.log('Created note:', createdNote);
            expect(createdNote).toBeInstanceOf(Note);
            expect(createdNote.title).toBe(noteData.title);
            expect(createdNote.content).toBe(noteData.content);
            expect(createdNote.id).toBeDefined();

            console.log('Retrieving created note...');
            const retrievedNote = await repository.findById(createdNote.id);
            console.log('Retrieved note:', retrievedNote);
            expect(retrievedNote).toBeInstanceOf(Note);
            expect(retrievedNote.id).toBe(createdNote.id);
            expect(retrievedNote.title).toBe(noteData.title);
            expect(retrievedNote.content).toBe(noteData.content);
        });

        it('should update a note', async () => {
            console.log('\nTest: should update a note');
            // Create initial note
            const note = await repository.create({
                title: 'Original Title',
                content: 'Original Content'
            });
            console.log('Created initial note:', note);

            console.log('Verifying initial note...');
            const initialNote = await repository.findById(note.id);
            console.log('Initial note verified:', initialNote);
            expect(initialNote).not.toBeNull();

            const updatedData = {
                title: 'Updated Title',
                content: 'Updated Content'
            };

            console.log('Updating note with:', updatedData);
            const updatedNote = await repository.update(note.id, updatedData);
            console.log('Updated note:', updatedNote);
            expect(updatedNote).toBeInstanceOf(Note);
            expect(updatedNote.id).toBe(note.id);
            expect(updatedNote.title).toBe(updatedData.title);
            expect(updatedNote.content).toBe(updatedData.content);

            console.log('Verifying updated note...');
            const retrievedNote = await repository.findById(note.id);
            console.log('Retrieved updated note:', retrievedNote);
            expect(retrievedNote).not.toBeNull();
            expect(retrievedNote.title).toBe(updatedData.title);
            expect(retrievedNote.content).toBe(updatedData.content);
        });

        it('should delete a note', async () => {
            console.log('\nTest: should delete a note');
            const note = await repository.create({
                title: 'To Delete',
                content: 'Will be deleted'
            });
            console.log('Created note to delete:', note);

            console.log('Verifying note exists...');
            const initialNote = await repository.findById(note.id);
            console.log('Initial note verified:', initialNote);
            expect(initialNote).not.toBeNull();

            console.log('Deleting note...');
            const deleteResult = await repository.delete(note.id);
            console.log('Delete result:', deleteResult);
            expect(deleteResult).toBe(true);

            // Verify note is deleted
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote).toBeNull();
        });

        it('should list all notes', async () => {
            console.log('\nTest: should list all notes');
            const notes = [
                {title: 'Note 1', content: 'Content 1'},
                {title: 'Note 2', content: 'Content 2'},
                {title: 'Note 3', content: 'Content 3'}
            ];

            // Create notes sequentially
            for (const noteData of notes) {
                console.log('Creating note:', noteData);
                const created = await repository.create(noteData);
                console.log('Created note:', created);
                await repository.findById(created.id);
            }

            // Wait for all notes to be available
            console.log('Retrieving all notes...');
            const allNotes = await repository.findAll();
            console.log('All notes found:', allNotes);

            expect(allNotes).toHaveLength(3);
            expect(allNotes.every(note => note instanceof Note)).toBe(true);
            expect(allNotes.map(note => note.title)).toEqual(
                expect.arrayContaining(notes.map(note => note.title))
            );
        });
    });
}); 