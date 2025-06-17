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
        it('should handle CastError in update with invalid ObjectId', async () => {
            const invalidId = 'invalid-object-id-format';
            const noteData = { title: 'Updated Title', content: 'Updated Content' };

            // This should trigger CastError and return null (lines 159-163)
            const result = await repository.update(invalidId, noteData);
            expect(result).toBeNull();
        });

        it('should handle CastError in delete with invalid ObjectId', async () => {
            const invalidId = 'another-invalid-id';

            // This should trigger CastError and return false (lines 177-181)
            const result = await repository.moveToRecycleBin(invalidId);
            expect(result).toBe(false);
        });

        it('should handle various invalid ObjectId formats in update', async () => {
            const invalidIds = [
                'short',
                '12345',
                'not-hex-chars-xyz',
                'too-long-object-id-format-123456789',
                '',
                '000000000000000000000000' // Valid format but likely non-existent
            ];

            const noteData = { title: 'Test', content: 'Test Content' };

            for (const invalidId of invalidIds) {
                const result = await repository.update(invalidId, noteData);
                // Should either return null (CastError) or null (not found)
                expect(result).toBeNull();
            }
        });

        it('should handle various invalid ObjectId formats in delete', async () => {
            const invalidIds = [
                'invalid',
                '12345abcde',
                'xxxxxxxxxxxxxxxxxxxxxxxxx',
                'short-id',
                'special!@#$%^&*()characters'
            ];

            for (const invalidId of invalidIds) {
                const result = await repository.moveToRecycleBin(invalidId);
                // Should either return false (CastError) or false (not found)
                expect(result).toBe(false);
            }
        });

        it('should handle malformed data in update operations', async () => {
            // Create a valid note first
            const note = await repository.create({
                title: 'Test Note',
                content: 'Test Content'
            });

            // Test with extremely long content that might cause issues
            const veryLongContent = 'x'.repeat(1000000); // 1MB of 'x'
            const updateResult = await repository.update(note.id, {
                title: 'Updated Title',
                content: veryLongContent
            });

            // Should handle large content gracefully
            expect(updateResult).toBeTruthy();
            expect(updateResult.content).toBe(veryLongContent);

            // Cleanup
            await repository.moveToRecycleBin(note.id);
        });

        it('should handle edge case data types and validation in CRUD operations', async () => {
            // Test data that should PASS validation
            const validEdgeCaseData = [
                { title: '   ', content: '   ' }, // Whitespace only (still has content)
                { title: 'Title with\nnewlines\ttabs', content: 'Content\rwith\fspecial\vchars' },
                { title: '🚀💎✨🎯', content: '🔥⭐🎉🚨' }, // Emojis
                { title: 'null', content: 'undefined' }, // String versions of null/undefined
            ];

            const createdNotes = [];

            for (const data of validEdgeCaseData) {
                const note = await repository.create(data);
                expect(note).toBeTruthy();
                expect(note.title).toBe(data.title);
                expect(note.content).toBe(data.content);
                createdNotes.push(note);
            }

            // Test data that should FAIL validation (empty strings)
            const invalidData = [
                { title: '', content: '' }, // Empty strings should fail
                { title: '', content: 'Valid content' }, // Empty title should fail
                { title: 'Valid title', content: '' }, // Empty content should fail
            ];

            for (const data of invalidData) {
                try {
                    await repository.create(data);
                    fail(`Should have thrown validation error for: ${JSON.stringify(data)}`);
                } catch (error) {
                    expect(error).toBeDefined();
                    expect(error.message).toContain('validation failed');
                }
            }

            // Cleanup valid notes
            for (const note of createdNotes) {
                await repository.moveToRecycleBin(note.id);
            }
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
    });
});
