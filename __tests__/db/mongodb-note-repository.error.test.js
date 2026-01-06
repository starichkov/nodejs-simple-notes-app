import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoDbNoteRepository } from '../../src/db/mongodb-note-repository.js';
import { Note } from '../../src/models/note.js';

describe('MongoDbNoteRepository Error Handling Tests', () => {
    let repository;
    let originalConnect;
    let originalModel;

    beforeEach(() => {
        repository = new MongoDbNoteRepository('mongodb://localhost:27017', 'test_notes_error');
        
        // Store original methods to restore later
        originalConnect = mongoose.connect;
        originalModel = mongoose.model;
        
        // Mock console methods to avoid output during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore original methods
        mongoose.connect = originalConnect;
        mongoose.model = originalModel;
        
        // Restore console methods
        console.log.mockRestore();
        console.error.mockRestore();
        
        jest.clearAllMocks();
    });

    describe('init() method error handling', () => {
        test('should handle MongoDB connection failures', async () => {
            mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

            await expect(repository.init()).rejects.toThrow('Connection failed');
            expect(console.error).toHaveBeenCalledWith('Failed to initialize MongoDB repository:', expect.any(Error));
        });

        test('should handle schema creation errors', async () => {
            mongoose.connect = jest.fn().mockResolvedValue();
            mongoose.model = jest.fn().mockImplementation(() => {
                throw new Error('Schema creation failed');
            });

            await expect(repository.init()).rejects.toThrow('Schema creation failed');
            expect(console.error).toHaveBeenCalledWith('Failed to initialize MongoDB repository:', expect.any(Error));
        });

        test('should handle network timeout errors', async () => {
            mongoose.connect = jest.fn().mockRejectedValue(new Error('Network timeout'));

            await expect(repository.init()).rejects.toThrow('Network timeout');
            expect(console.error).toHaveBeenCalledWith('Failed to initialize MongoDB repository:', expect.any(Error));
        });
    });

    describe('Database operation error scenarios', () => {
        beforeEach(async () => {
            // Setup mock model for testing
            repository.NoteModel = {
                find: jest.fn(),
                findById: jest.fn(),
                findByIdAndUpdate: jest.fn(),
                findByIdAndDelete: jest.fn(),
                deleteMany: jest.fn(),
                countDocuments: jest.fn(),
                save: jest.fn()
            };
        });

        describe('findAll() error handling', () => {
            test('should handle database query errors in findAll', async () => {
                repository.NoteModel.find = jest.fn().mockImplementation(() => {
                    throw new Error('Database query failed');
                });

                await expect(repository.findAll()).rejects.toThrow('Database query failed');
                expect(console.error).toHaveBeenCalledWith('Failed to find all active notes:', expect.any(Error));
            });

            test('should handle network errors in findAll', async () => {
                repository.NoteModel.find = jest.fn().mockReturnValue({
                    sort: jest.fn().mockRejectedValue(new Error('Network error'))
                });

                await expect(repository.findAll()).rejects.toThrow('Network error');
                expect(console.error).toHaveBeenCalledWith('Failed to find all active notes:', expect.any(Error));
            });
        });

        describe('findDeleted() error handling', () => {
            test('should handle database query errors in findDeleted', async () => {
                repository.NoteModel.find = jest.fn().mockReturnValue({
                    sort: jest.fn().mockRejectedValue(new Error('Database error'))
                });

                await expect(repository.findDeleted()).rejects.toThrow('Database error');
                expect(console.error).toHaveBeenCalledWith('Failed to find deleted notes:', expect.any(Error));
            });

            test('should handle timeout errors in findDeleted', async () => {
                repository.NoteModel.find = jest.fn().mockReturnValue({
                    sort: jest.fn().mockRejectedValue(new Error('Query timeout'))
                });

                await expect(repository.findDeleted()).rejects.toThrow('Query timeout');
                expect(console.error).toHaveBeenCalledWith('Failed to find deleted notes:', expect.any(Error));
            });
        });

        describe('findAllIncludingDeleted() error handling', () => {
            test('should handle database query errors in findAllIncludingDeleted', async () => {
                repository.NoteModel.find = jest.fn().mockReturnValue({
                    sort: jest.fn().mockRejectedValue(new Error('Connection lost'))
                });

                await expect(repository.findAllIncludingDeleted()).rejects.toThrow('Connection lost');
                expect(console.error).toHaveBeenCalledWith('Failed to find all notes including deleted:', expect.any(Error));
            });
        });

        describe('findById() error handling', () => {
            test('should return null for CastError (invalid ObjectId)', async () => {
                const castError = new Error('Cast to ObjectId failed');
                castError.name = 'CastError';
                repository.NoteModel.findById = jest.fn().mockRejectedValue(castError);

                const result = await repository.findById('invalid-id');
                expect(result).toBeNull();
                expect(console.error).not.toHaveBeenCalled();
            });

            test('should handle other database errors in findById', async () => {
                repository.NoteModel.findById = jest.fn().mockRejectedValue(new Error('Database error'));

                await expect(repository.findById('valid-id')).rejects.toThrow('Database error');
                expect(console.error).toHaveBeenCalledWith('Failed to find note with ID valid-id:', expect.any(Error));
            });

            test('should handle network connection errors in findById', async () => {
                repository.NoteModel.findById = jest.fn().mockRejectedValue(new Error('Connection refused'));

                await expect(repository.findById('some-id')).rejects.toThrow('Connection refused');
                expect(console.error).toHaveBeenCalledWith('Failed to find note with ID some-id:', expect.any(Error));
            });
        });

        describe('create() error handling', () => {
            test('should handle validation errors in create', async () => {
                const mockNote = {
                    save: jest.fn().mockRejectedValue(new Error('Validation failed'))
                };
                repository.NoteModel = jest.fn().mockReturnValue(mockNote);

                await expect(repository.create({ title: '', content: '' })).rejects.toThrow('Validation failed');
                expect(console.error).toHaveBeenCalledWith('Failed to create note:', expect.any(Error));
            });

            test('should handle database connection errors in create', async () => {
                const mockNote = {
                    save: jest.fn().mockRejectedValue(new Error('Connection lost'))
                };
                repository.NoteModel = jest.fn().mockReturnValue(mockNote);

                await expect(repository.create({ title: 'Test', content: 'Test' })).rejects.toThrow('Connection lost');
                expect(console.error).toHaveBeenCalledWith('Failed to create note:', expect.any(Error));
            });

            test('should handle schema errors in create', async () => {
                repository.NoteModel = jest.fn().mockImplementation(() => {
                    throw new Error('Schema not found');
                });

                await expect(repository.create({ title: 'Test', content: 'Test' })).rejects.toThrow('Schema not found');
                expect(console.error).toHaveBeenCalledWith('Failed to create note:', expect.any(Error));
            });
        });

        describe('update() error handling', () => {
            test('should return null for CastError in update', async () => {
                const castError = new Error('Cast to ObjectId failed');
                castError.name = 'CastError';
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(castError);

                const result = await repository.update('invalid-id', { title: 'Test', content: 'Test' });
                expect(result).toBeNull();
                expect(console.error).not.toHaveBeenCalled();
            });

            test('should handle database errors in update', async () => {
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));

                await expect(repository.update('valid-id', { title: 'Test', content: 'Test' })).rejects.toThrow('Update failed');
                expect(console.error).toHaveBeenCalledWith('Failed to update note with ID valid-id:', expect.any(Error));
            });

            test('should handle connection timeout in update', async () => {
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Timeout'));

                await expect(repository.update('some-id', { title: 'Test', content: 'Test' })).rejects.toThrow('Timeout');
                expect(console.error).toHaveBeenCalledWith('Failed to update note with ID some-id:', expect.any(Error));
            });
        });

        describe('moveToRecycleBin() error handling', () => {
            test('should return false for CastError in moveToRecycleBin', async () => {
                const castError = new Error('Cast to ObjectId failed');
                castError.name = 'CastError';
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(castError);

                const result = await repository.moveToRecycleBin('invalid-id');
                expect(result).toBe(false);
                expect(console.error).not.toHaveBeenCalled();
            });

            test('should handle database errors in moveToRecycleBin', async () => {
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Move failed'));

                await expect(repository.moveToRecycleBin('valid-id')).rejects.toThrow('Move failed');
                expect(console.error).toHaveBeenCalledWith('Failed to move note to recycle bin with ID valid-id:', expect.any(Error));
            });
        });

        describe('restore() error handling', () => {
            test('should return false for CastError in restore', async () => {
                const castError = new Error('Cast to ObjectId failed');
                castError.name = 'CastError';
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(castError);

                const result = await repository.restore('invalid-id');
                expect(result).toBe(false);
                expect(console.error).not.toHaveBeenCalled();
            });

            test('should handle database errors in restore', async () => {
                repository.NoteModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Restore failed'));

                await expect(repository.restore('valid-id')).rejects.toThrow('Restore failed');
                expect(console.error).toHaveBeenCalledWith('Failed to restore note with ID valid-id:', expect.any(Error));
            });
        });

        describe('permanentDelete() error handling', () => {
            test('should return false for CastError in permanentDelete', async () => {
                const castError = new Error('Cast to ObjectId failed');
                castError.name = 'CastError';
                repository.NoteModel.findByIdAndDelete = jest.fn().mockRejectedValue(castError);

                const result = await repository.permanentDelete('invalid-id');
                expect(result).toBe(false);
                expect(console.error).not.toHaveBeenCalled();
            });

            test('should handle database errors in permanentDelete', async () => {
                repository.NoteModel.findByIdAndDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));

                await expect(repository.permanentDelete('valid-id')).rejects.toThrow('Delete failed');
                expect(console.error).toHaveBeenCalledWith('Failed to permanently delete note with ID valid-id:', expect.any(Error));
            });
        });

        describe('emptyRecycleBin() error handling', () => {
            test('should handle database errors in emptyRecycleBin', async () => {
                repository.NoteModel.deleteMany = jest.fn().mockRejectedValue(new Error('Bulk delete failed'));

                await expect(repository.emptyRecycleBin()).rejects.toThrow('Bulk delete failed');
                expect(console.error).toHaveBeenCalledWith('Failed to empty recycle bin:', expect.any(Error));
            });

            test('should handle connection errors in emptyRecycleBin', async () => {
                repository.NoteModel.deleteMany = jest.fn().mockRejectedValue(new Error('Connection error'));

                await expect(repository.emptyRecycleBin()).rejects.toThrow('Connection error');
                expect(console.error).toHaveBeenCalledWith('Failed to empty recycle bin:', expect.any(Error));
            });

            test('should handle undefined deletedCount in emptyRecycleBin', async () => {
                repository.NoteModel.deleteMany = jest.fn().mockResolvedValue({});

                const result = await repository.emptyRecycleBin();
                expect(result).toBe(0);
            });
        });

        describe('countDeleted() error handling', () => {
            test('should handle database errors in countDeleted', async () => {
                repository.NoteModel.countDocuments = jest.fn().mockRejectedValue(new Error('Count failed'));

                await expect(repository.countDeleted()).rejects.toThrow('Count failed');
                expect(console.error).toHaveBeenCalledWith('Failed to count deleted notes:', expect.any(Error));
            });

            test('should handle connection timeout in countDeleted', async () => {
                repository.NoteModel.countDocuments = jest.fn().mockRejectedValue(new Error('Query timeout'));

                await expect(repository.countDeleted()).rejects.toThrow('Query timeout');
                expect(console.error).toHaveBeenCalledWith('Failed to count deleted notes:', expect.any(Error));
            });
        });
    });

    describe('Edge case scenarios', () => {
        beforeEach(async () => {
            repository.NoteModel = {
                find: jest.fn(),
                findById: jest.fn(),
                findByIdAndUpdate: jest.fn(),
                findByIdAndDelete: jest.fn(),
                deleteMany: jest.fn(),
                countDocuments: jest.fn()
            };
        });

        test('should handle findById returning null document', async () => {
            repository.NoteModel.findById = jest.fn().mockResolvedValue(null);

            const result = await repository.findById('valid-id');
            expect(result).toBeNull();
        });

        test('should handle findByIdAndUpdate returning null in update', async () => {
            repository.NoteModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

            const result = await repository.update('non-existent-id', { title: 'Test', content: 'Test' });
            expect(result).toBeNull();
        });

        test('should handle findByIdAndUpdate returning null in moveToRecycleBin', async () => {
            repository.NoteModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

            const result = await repository.moveToRecycleBin('non-existent-id');
            expect(result).toBe(false);
        });

        test('should handle findByIdAndUpdate returning null in restore', async () => {
            repository.NoteModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

            const result = await repository.restore('non-existent-id');
            expect(result).toBe(false);
        });

        test('should handle findByIdAndDelete returning null in permanentDelete', async () => {
            repository.NoteModel.findByIdAndDelete = jest.fn().mockResolvedValue(null);

            const result = await repository.permanentDelete('non-existent-id');
            expect(result).toBe(false);
        });

        test('should handle successful operations returning truthy results', async () => {
            const mockDoc = {
                _id: { toString: () => 'test-id' },
                title: 'Test',
                content: 'Test',
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            repository.NoteModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockDoc);
            repository.NoteModel.findByIdAndDelete = jest.fn().mockResolvedValue(mockDoc);

            const moveResult = await repository.moveToRecycleBin('test-id');
            expect(moveResult).toBe(true);

            const restoreResult = await repository.restore('test-id');
            expect(restoreResult).toBe(true);

            const deleteResult = await repository.permanentDelete('test-id');
            expect(deleteResult).toBe(true);
        });
    });

    describe('MongoDB-specific error scenarios', () => {
        beforeEach(() => {
            repository.NoteModel = {
                find: jest.fn(),
                findById: jest.fn(),
                countDocuments: jest.fn()
            };
        });

        test('should handle MongoDB duplicate key errors', async () => {
            const duplicateError = new Error('Duplicate key error');
            duplicateError.code = 11000;
            repository.NoteModel.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockRejectedValue(duplicateError)
            });

            await expect(repository.findAll()).rejects.toThrow('Duplicate key error');
            expect(console.error).toHaveBeenCalledWith('Failed to find all active notes:', expect.any(Error));
        });

        test('should handle MongoDB validation errors with multiple fields', async () => {
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            validationError.errors = {
                title: { message: 'Title is required' },
                content: { message: 'Content is required' }
            };
            repository.NoteModel.find = jest.fn().mockReturnValue({
                sort: jest.fn().mockRejectedValue(validationError)
            });

            await expect(repository.findDeleted()).rejects.toThrow('Validation failed');
            expect(console.error).toHaveBeenCalledWith('Failed to find deleted notes:', expect.any(Error));
        });

        test('should handle MongoDB connection state errors', async () => {
            const connectionError = new Error('No connection to database');
            connectionError.name = 'MongooseError';
            repository.NoteModel.countDocuments = jest.fn().mockRejectedValue(connectionError);

            await expect(repository.countDeleted()).rejects.toThrow('No connection to database');
            expect(console.error).toHaveBeenCalledWith('Failed to count deleted notes:', expect.any(Error));
        });

        test('should handle restoreAll database errors', async () => {
            repository.NoteModel.updateMany = jest.fn().mockRejectedValue(new Error('Update failed'));
            await expect(repository.restoreAll()).rejects.toThrow('Update failed');
            expect(console.error).toHaveBeenCalledWith('Failed to restore all notes from recycle bin:', expect.any(Error));
        });

        test('should handle emptyRecycleBin database errors', async () => {
            repository.NoteModel.deleteMany = jest.fn().mockRejectedValue(new Error('Delete failed'));
            await expect(repository.emptyRecycleBin()).rejects.toThrow('Delete failed');
            expect(console.error).toHaveBeenCalledWith('Failed to empty recycle bin:', expect.any(Error));
        });

        test('init should not re-create model if it exists', async () => {
            mongoose.connect = jest.fn().mockResolvedValue();
            repository.NoteModel = { some: 'model' };
            await repository.init();
            expect(repository.NoteModel).toEqual({ some: 'model' });
        });

        test('restoreAll should return 0 if no notes modified', async () => {
            repository.NoteModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
            const result = await repository.restoreAll();
            expect(result).toBe(0);
        });

        test('emptyRecycleBin should return 0 if no notes deleted', async () => {
            repository.NoteModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
            const result = await repository.emptyRecycleBin();
            expect(result).toBe(0);
        });
    });
});