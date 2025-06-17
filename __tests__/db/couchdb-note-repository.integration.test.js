import {GenericContainer} from 'testcontainers';
import {CouchDbNoteRepository} from '../../src/db/couchdb-note-repository.js';
import {Note} from '../../src/models/note.js';

describe('CouchDbNoteRepository Integration Tests', () => {
    let container;
    let repository;
    const DB_NAME = 'notes_test';

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
        try {
            const notes = await repository.findAllIncludingDeleted(); // Get all notes (both active and deleted)
            console.log('Cleaning up notes:', notes);
            for (const note of notes) {
                console.log(`Permanently deleting note ${note.id}...`);
                await repository.permanentDelete(note.id);
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

        it('should move note to trash (soft delete)', async () => {
            console.log('\nTest: should move note to trash (soft delete)');
            const note = await repository.create({
                title: 'To Delete',
                content: 'Will be moved to trash'
            });
            console.log('Created note to delete:', note);

            console.log('Verifying note exists...');
            const initialNote = await repository.findById(note.id);
            console.log('Initial note verified:', initialNote);
            expect(initialNote).not.toBeNull();
            expect(initialNote.deletedAt).toBeNull();

            console.log('Moving note to trash...');
            const deleteResult = await repository.moveToRecycleBin(note.id);
            console.log('Delete result:', deleteResult);
            expect(deleteResult).toBe(true);

            // Verify note is moved to trash, not permanently deleted
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote).not.toBeNull();
            expect(deletedNote.deletedAt).toBeDefined();
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

    describe('Error Handling Coverage', () => {
        it('should handle delete errors with invalid document IDs', async () => {
            const invalidIds = [
                'invalid/doc/id',  // Invalid characters
                '_invalid_start',  // Invalid start
                'doc$with$special$chars',
                'very-long-invalid-document-id-that-might-cause-issues-in-couchdb',
                '',  // Empty string
                ' ',  // Space
                'doc with spaces'
            ];

            for (const invalidId of invalidIds) {
                try {
                    const result = await repository.moveToRecycleBin(invalidId);
                    // Should return false for invalid IDs
                    expect(result).toBe(false);
                } catch (error) {
                    // Some invalid IDs might throw errors instead of returning false
                    expect(error).toBeDefined();
                }
            }
        });

        it('should handle malformed data in CouchDB operations', async () => {
            const edgeCaseData = [
                { title: '', content: '' }, // Empty strings
                { title: '   ', content: '   ' }, // Whitespace only  
                { title: 'Title with\nnewlines\ttabs', content: 'Content\rwith\fspecial\vchars' },
                { title: '🚀💎✨🎯', content: '🔥⭐🎉🚨' }, // Emojis
                { title: 'null', content: 'undefined' }, // String versions of null/undefined
                { title: 'Very'.repeat(1000), content: 'Long'.repeat(10000) }, // Very long strings
            ];

            const createdNotes = [];

            for (const data of edgeCaseData) {
                const note = await repository.create(data);
                expect(note).toBeTruthy();
                expect(note.title).toBe(data.title);
                expect(note.content).toBe(data.content);
                createdNotes.push(note);

                // Test retrieval
                const retrievedNote = await repository.findById(note.id);
                expect(retrievedNote).toBeTruthy();
                expect(retrievedNote.title).toBe(data.title);
                expect(retrievedNote.content).toBe(data.content);
            }

            // Test finding all notes with edge case data
            const allNotes = await repository.findAll();
            expect(allNotes.length).toBeGreaterThanOrEqual(createdNotes.length);

            // Cleanup
            for (const note of createdNotes) {
                const deleteResult = await repository.moveToRecycleBin(note.id);
                expect(deleteResult).toBe(true);
            }
        });

        it('should handle CouchDB conflict scenarios in updates', async () => {
            // Create a note
            const note = await repository.create({
                title: 'Conflict Test',
                content: 'Original Content'
            });

            // Update the note normally first
            const updatedNote1 = await repository.update(note.id, {
                title: 'First Update',
                content: 'First Updated Content'
            });
            expect(updatedNote1).toBeTruthy();

            // Update again to ensure revision handling works
            const updatedNote2 = await repository.update(note.id, {
                title: 'Second Update',
                content: 'Second Updated Content'
            });
            expect(updatedNote2).toBeTruthy();
            expect(updatedNote2.title).toBe('Second Update');

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });
    });

    describe('CouchDB-Specific Error Handling', () => {
        it('should handle various HTTP status codes in update operations', async () => {
            // Create a note first
            const note = await repository.create({
                title: 'Test for HTTP Errors',
                content: 'Testing HTTP error scenarios'
            });

            // Test update with non-404 errors during document retrieval
            const originalDb = repository.db;

            // Mock db.get to simulate different HTTP errors (lines 164-168)
            const mockDb = {
                ...originalDb,
                get: async (id) => {
                    // Simulate a non-404 HTTP error
                    const error = new Error('Unauthorized access');
                    error.statusCode = 401;
                    throw error;
                }
            };

            repository.db = mockDb;

            try {
                await repository.update(note.id, { title: 'Updated', content: 'Updated' });
                fail('Should have thrown an HTTP error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.statusCode).toBe(401);
            } finally {
                repository.db = originalDb;
            }

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });

        it('should handle 409 conflict errors in update operations', async () => {
            // Create a note
            const note = await repository.create({
                title: 'Conflict Test Note',
                content: 'Testing conflict scenarios'
            });

            const originalDb = repository.db;

            // Mock db.insert to simulate 409 conflict (lines 192-196)
            const mockDb = {
                ...originalDb,
                get: originalDb.get.bind(originalDb), // Keep real get
                insert: async (doc) => {
                    const error = new Error('Document update conflict');
                    error.statusCode = 409;
                    throw error;
                }
            };

            repository.db = mockDb;

            try {
                await repository.update(note.id, { title: 'Conflict Update', content: 'Should fail' });
                fail('Should have thrown a 409 conflict error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('Document was modified concurrently');
            } finally {
                repository.db = originalDb;
            }

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });

        it('should handle CouchDB-specific invalid document IDs', async () => {
            // CouchDB has specific rules for document IDs
            const couchDbSpecificIds = [
                'very'.repeat(100),        // Very long ID (may exceed CouchDB limits)
                'doc\nwith\nnewlines',    // Control characters
                'doc\twith\ttabs',        // Tab characters
                'doc\rwith\rcarriage',    // Carriage returns
            ];

            for (const invalidId of couchDbSpecificIds) {
                // Test findById with edge case ID
                const findResult = await repository.findById(invalidId);
                expect(findResult).toBeNull(); // Should handle gracefully

                // Test update with edge case ID  
                const updateResult = await repository.update(invalidId, { title: 'Test', content: 'Test' });
                expect(updateResult).toBeNull(); // Should handle gracefully

                // Test delete with edge case ID
                const deleteResult = await repository.moveToRecycleBin(invalidId);
                expect(deleteResult).toBe(false); // Should handle gracefully
            }
        });

        it('should handle view-related errors in findAll', async () => {
            const originalDb = repository.db;

            // Mock db.view to simulate view errors
            const mockDb = {
                ...originalDb,
                view: async () => {
                    const error = new Error('View not found');
                    error.statusCode = 404;
                    throw error;
                }
            };

            repository.db = mockDb;

            try {
                await repository.findAll();
                fail('Should have thrown view error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.statusCode).toBe(404);
            } finally {
                repository.db = originalDb;
            }
        });

        it('should handle malformed view results in findAll', async () => {
            const originalDb = repository.db;

            // Mock db.view to return malformed results
            const malformedResults = [
                { rows: null },               // Null rows
                { rows: [{ doc: null }] },    // Null documents
                { rows: [{}] },               // Rows without doc property
            ];

            for (const malformedResult of malformedResults) {
                const mockDb = {
                    ...originalDb,
                    view: async () => malformedResult
                };

                repository.db = mockDb;

                const notes = await repository.findAll();
                expect(Array.isArray(notes)).toBe(true);
                // Should return empty array or filtered results
                expect(notes.every(note => note !== null)).toBe(true);
            }

            repository.db = originalDb;
        });

        it('should handle view results without rows property in _mapResult', async () => {
            const originalDb = repository.db;

            // Mock db.view to return a result without rows property
            const resultWithoutRows = {}; // Object without rows property

            const mockDb = {
                ...originalDb,
                view: async () => resultWithoutRows
            };

            repository.db = mockDb;

            // Test with findDeleted which uses _mapResult
            const notes = await repository.findDeleted();
            expect(Array.isArray(notes)).toBe(true);
            expect(notes.length).toBe(0); // Should return empty array

            // Test with findAllIncludingDeleted which also uses _mapResult
            const allNotes = await repository.findAllIncludingDeleted();
            expect(Array.isArray(allNotes)).toBe(true);
            expect(allNotes.length).toBe(0); // Should return empty array

            repository.db = originalDb;
        });

        it('should handle various HTTP errors in delete operations', async () => {
            // Create a note first
            const note = await repository.create({
                title: 'Delete Error Test',
                content: 'Testing delete error scenarios'
            });

            const originalDb = repository.db;

            // Test non-404 errors during document retrieval in delete (line 221)
            const mockDb = {
                ...originalDb,
                get: async (id) => {
                    const error = new Error('Internal Server Error');
                    error.statusCode = 500;
                    throw error;
                }
            };

            repository.db = mockDb;

            try {
                await repository.moveToRecycleBin(note.id);
                fail('Should have thrown HTTP 500 error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.statusCode).toBe(500);
            } finally {
                repository.db = originalDb;
            }

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });

        it('should handle document creation with CouchDB edge cases', async () => {
            // Test with edge case data that might cause CouchDB-specific issues
            const couchDbEdgeCases = [
                { title: JSON.stringify({nested: 'object'}), content: 'JSON in title' },
                { title: 'Unicode: 🔥💎⭐', content: 'Special chars: àáâãäåæçèé' },
                { title: '\u0000\u0001\u0002', content: 'Control chars' }, // Control characters
            ];

            for (const edgeCase of couchDbEdgeCases) {
                try {
                    const note = await repository.create(edgeCase);
                    expect(note).toBeTruthy();
                    expect(note.title).toBe(edgeCase.title);
                    expect(note.content).toBe(edgeCase.content);

                    // Verify we can retrieve it
                    const retrieved = await repository.findById(note.id);
                    expect(retrieved).toBeTruthy();
                    expect(retrieved.title).toBe(edgeCase.title);

                    // Cleanup
                    await repository.moveToRecycleBin(note.id);
                } catch (error) {
                    // Some edge cases might legitimately fail in CouchDB
                    expect(error).toBeDefined();
                    console.log(`Expected CouchDB edge case failure for: ${JSON.stringify(edgeCase)}`);
                }
            }
        });

        it('should handle concurrent update scenarios', async () => {
            // Create a note
            const note = await repository.create({
                title: 'Concurrent Test',
                content: 'Testing concurrent updates'
            });

            // Perform multiple rapid updates to test revision handling
            const updatePromises = Array.from({ length: 3 }, (_, i) =>
                repository.update(note.id, {
                    title: `Update ${i}`,
                    content: `Content ${i}`
                }).catch(error => ({ error, index: i }))
            );

            const results = await Promise.allSettled(updatePromises);

            // Some should succeed, some might fail due to revision conflicts
            const successes = results.filter(r => r.status === 'fulfilled' && !r.value.error);
            const failures = results.filter(r => 
                r.status === 'rejected' || 
                (r.status === 'fulfilled' && r.value.error)
            );

            // At least one should succeed
            expect(successes.length).toBeGreaterThan(0);

            console.log(`Concurrent updates: ${successes.length} succeeded, ${failures.length} failed`);

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });
    });

    describe('Recycle Bin Functionality', () => {
        it('should move note to recycle bin and find it in deleted notes', async () => {
            // Create a note
            const note = await repository.create({
                title: 'Recycle Bin Test',
                content: 'This note will be moved to recycle bin'
            });

            // Verify it's active
            expect(note.deletedAt).toBeNull();

            // Move to recycle bin
            const result = await repository.moveToRecycleBin(note.id);
            expect(result).toBe(true);

            // Verify it's in recycle bin
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote.deletedAt).not.toBeNull();

            // Find it in deleted notes
            const deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBeGreaterThan(0);
            expect(deletedNotes.some(n => n.id === note.id)).toBe(true);

            // Verify it's not in active notes
            const activeNotes = await repository.findAll();
            expect(activeNotes.every(n => n.id !== note.id)).toBe(true);
        });

        it('should restore note from recycle bin', async () => {
            // Create a note and move it to recycle bin
            const note = await repository.create({
                title: 'Restore Test',
                content: 'This note will be restored from recycle bin'
            });
            await repository.moveToRecycleBin(note.id);

            // Verify it's in recycle bin
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote.deletedAt).not.toBeNull();

            // Restore from recycle bin
            const result = await repository.restore(note.id);
            expect(result).toBe(true);

            // Verify it's active again
            const restoredNote = await repository.findById(note.id);
            expect(restoredNote.deletedAt).toBeNull();

            // Verify it's in active notes
            const activeNotes = await repository.findAll();
            expect(activeNotes.some(n => n.id === note.id)).toBe(true);

            // Verify it's not in deleted notes
            const deletedNotes = await repository.findDeleted();
            expect(deletedNotes.every(n => n.id !== note.id)).toBe(true);
        });

        it('should permanently delete a note', async () => {
            // Create a note and move it to recycle bin
            const note = await repository.create({
                title: 'Permanent Delete Test',
                content: 'This note will be permanently deleted'
            });
            await repository.moveToRecycleBin(note.id);

            // Permanently delete the note
            const result = await repository.permanentDelete(note.id);
            expect(result).toBe(true);

            // Verify it's gone
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote).toBeNull();
        });

        it('should find all notes including deleted ones', async () => {
            // Create active notes
            const activeNote1 = await repository.create({
                title: 'Active Note 1',
                content: 'This note will stay active'
            });
            const activeNote2 = await repository.create({
                title: 'Active Note 2',
                content: 'This note will stay active too'
            });

            // Create and delete a note
            const deletedNote = await repository.create({
                title: 'Deleted Note',
                content: 'This note will be moved to recycle bin'
            });
            await repository.moveToRecycleBin(deletedNote.id);

            // Find all notes including deleted
            const allNotes = await repository.findAllIncludingDeleted();

            // Verify all notes are included
            expect(allNotes.length).toBeGreaterThanOrEqual(3);
            expect(allNotes.some(n => n.id === activeNote1.id)).toBe(true);
            expect(allNotes.some(n => n.id === activeNote2.id)).toBe(true);
            expect(allNotes.some(n => n.id === deletedNote.id)).toBe(true);

            // Verify active and deleted notes are correctly identified
            const foundActiveNote1 = allNotes.find(n => n.id === activeNote1.id);
            const foundActiveNote2 = allNotes.find(n => n.id === activeNote2.id);
            const foundDeletedNote = allNotes.find(n => n.id === deletedNote.id);

            expect(foundActiveNote1.deletedAt).toBeNull();
            expect(foundActiveNote2.deletedAt).toBeNull();
            expect(foundDeletedNote.deletedAt).not.toBeNull();
        });

        it('should handle errors in recycle bin operations with invalid IDs', async () => {
            const invalidId = 'invalid-id-format';

            // Test moveToRecycleBin with invalid ID
            const moveResult = await repository.moveToRecycleBin(invalidId);
            expect(moveResult).toBe(false);

            // Test restore with invalid ID
            const restoreResult = await repository.restore(invalidId);
            expect(restoreResult).toBe(false);

            // Test permanentDelete with invalid ID
            const deleteResult = await repository.permanentDelete(invalidId);
            expect(deleteResult).toBe(false);
        });

        it('should handle legacy methods correctly', async () => {
            // Create a note
            const note = await repository.create({
                title: 'Legacy Method Test',
                content: 'Testing legacy methods'
            });

            // Test moveToRecycleBin
            const trashResult = await repository.moveToRecycleBin(note.id);
            expect(trashResult).toBe(true);

            // Verify it's in recycle bin
            const deletedNote = await repository.findById(note.id);
            expect(deletedNote.deletedAt).not.toBeNull();

            // Test findDeleted (should call findDeleted)
            const deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBeGreaterThan(0);
            expect(deletedNotes.some(n => n.id === note.id)).toBe(true);
        });

        it('should count deleted notes correctly', async () => {
            // Create some notes
            const note1 = await repository.create({
                title: 'Count Test 1',
                content: 'This note will be deleted'
            });
            const note2 = await repository.create({
                title: 'Count Test 2',
                content: 'This note will also be deleted'
            });
            const note3 = await repository.create({
                title: 'Count Test 3',
                content: 'This note will stay active'
            });

            // Initially, count should be 0
            let count = await repository.countDeleted();
            expect(count).toBe(0);

            // Move two notes to recycle bin
            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            // Count should now be 2
            count = await repository.countDeleted();
            expect(count).toBe(2);

            // Restore one note
            await repository.restore(note1.id);

            // Count should now be 1
            count = await repository.countDeleted();
            expect(count).toBe(1);
        });

        it('should empty recycle bin correctly', async () => {
            // Create some notes
            const note1 = await repository.create({
                title: 'Empty Test 1',
                content: 'This note will be deleted'
            });
            const note2 = await repository.create({
                title: 'Empty Test 2',
                content: 'This note will also be deleted'
            });
            const note3 = await repository.create({
                title: 'Empty Test 3',
                content: 'This note will stay active'
            });

            // Move two notes to recycle bin
            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            // Verify they're in recycle bin
            let deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(2);

            // Empty recycle bin
            const deletedCount = await repository.emptyRecycleBin();
            expect(deletedCount).toBe(2);

            // Verify recycle bin is empty
            deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(0);

            // Verify active note still exists
            const activeNotes = await repository.findAll();
            expect(activeNotes.length).toBe(1);
            expect(activeNotes[0].id).toBe(note3.id);

            // Verify count is 0
            const count = await repository.countDeleted();
            expect(count).toBe(0);
        });

        it('should handle empty recycle bin when already empty', async () => {
            // Ensure recycle bin is empty
            const initialCount = await repository.countDeleted();
            expect(initialCount).toBe(0);

            // Try to empty already empty recycle bin
            const deletedCount = await repository.emptyRecycleBin();
            expect(deletedCount).toBe(0);
        });

        it('should restore all notes from recycle bin', async () => {
            // Create some notes
            const note1 = await repository.create({
                title: 'Restore All Test 1',
                content: 'This note will be restored from recycle bin'
            });
            const note2 = await repository.create({
                title: 'Restore All Test 2',
                content: 'This note will also be restored from recycle bin'
            });
            const note3 = await repository.create({
                title: 'Restore All Test 3',
                content: 'This note will stay active'
            });

            // Move two notes to recycle bin
            await repository.moveToRecycleBin(note1.id);
            await repository.moveToRecycleBin(note2.id);

            // Verify they're in recycle bin
            let deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(2);

            // Restore all notes from recycle bin
            const restoredCount = await repository.restoreAll();
            expect(restoredCount).toBe(2);

            // Verify all notes are now active
            const activeNotes = await repository.findAll();
            expect(activeNotes.length).toBe(3);
            expect(activeNotes.some(n => n.id === note1.id)).toBe(true);
            expect(activeNotes.some(n => n.id === note2.id)).toBe(true);
            expect(activeNotes.some(n => n.id === note3.id)).toBe(true);

            // Verify recycle bin is empty
            deletedNotes = await repository.findDeleted();
            expect(deletedNotes.length).toBe(0);
        });
    });
});
