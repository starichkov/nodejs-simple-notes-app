import {GenericContainer} from 'testcontainers';
import {CouchDbNoteRepository} from '../../src/db/couchdb-note-repository.js';
import {Note} from '../../src/models/note.js';

describe('CouchDbNoteRepository Integration Tests', () => {
    let container;
    let repository;
    const DB_NAME = 'notes_test';

    // Helper function to wait for document availability
    async function waitForDocument(id, maxAttempts = 5, delay = 1000) {
        console.log(`Waiting for document ${id} to be available...`);
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Attempt ${attempt + 1}/${maxAttempts} to find document ${id}`);
            try {
                const doc = await repository.findById(id);
                if (doc) {
                    console.log(`Document ${id} found on attempt ${attempt + 1}:`, doc);
                    return doc;
                }
                console.log(`Document ${id} not found on attempt ${attempt + 1}`);
            } catch (error) {
                console.error(`Error finding document ${id} on attempt ${attempt + 1}:`, error);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error(`Document ${id} not found after ${maxAttempts} attempts`);
    }

    // Helper function to wait for document deletion
    async function waitForDocumentDeletion(id, maxAttempts = 5, delay = 3000) {
        console.log(`Waiting for document ${id} to be deleted...`);
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Attempt ${attempt + 1}/${maxAttempts} to check document ${id} deletion`);
            try {
                const doc = await repository.findById(id);
                if (!doc) {
                    console.log(`Document ${id} confirmed deleted on attempt ${attempt + 1}`);
                    return true;
                }
                console.log(`Document ${id} still exists on attempt ${attempt + 1}:`, doc);
            } catch (error) {
                if (error.statusCode === 404) {
                    console.log(`Document ${id} confirmed deleted on attempt ${attempt + 1}`);
                    return true;
                }
                console.error(`Error checking document ${id} deletion on attempt ${attempt + 1}:`, error);
            }
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error(`Document ${id} still exists after ${maxAttempts} attempts`);
    }

    beforeAll(async () => {
        console.log('Starting CouchDB container...');
        // Start CouchDB container
        container = await new GenericContainer('couchdb:3.4.3')
            .withExposedPorts(5984)
            .withEnvironment({
                COUCHDB_USER: 'admin',
                COUCHDB_PASSWORD: 'password'
            })
            .start();

        // Create repository instance
        const port = container.getMappedPort(5984);
        console.log(`CouchDB container started on port ${port}`);
        repository = new CouchDbNoteRepository(
            `http://admin:password@localhost:${port}`,
            DB_NAME
        );

        // Initialize the database
        console.log('Initializing database...');
        await repository.init();
        console.log('Database initialized successfully');
    }, 60000); // Increase timeout for container startup

    afterAll(async () => {
        console.log('Stopping CouchDB container...');
        if (container) {
            await container.stop();
            console.log('CouchDB container stopped');
        }
    });

    beforeEach(async () => {
        console.log('\n--- Starting new test ---');
        // await repository.init();

        try {
            const notes = await repository.findAll();
            console.log('Cleaning up notes:', notes);
            for (const note of notes) {
                console.log(`Deleting note ${note.id}...`);
                await repository.delete(note.id);
                await waitForDocumentDeletion(note.id);
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
            const retrievedNote = await waitForDocument(createdNote.id);
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
            const initialNote = await waitForDocument(note.id);
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
            const retrievedNote = await waitForDocument(note.id);
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
            const initialNote = await waitForDocument(note.id);
            console.log('Initial note verified:', initialNote);
            expect(initialNote).not.toBeNull();

            console.log('Deleting note...');
            const deleteResult = await repository.delete(note.id);
            console.log('Delete result:', deleteResult);
            expect(deleteResult).toBe(true);

            console.log('Verifying note deletion...');
            await waitForDocumentDeletion(note.id);
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
                await waitForDocument(created.id);
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