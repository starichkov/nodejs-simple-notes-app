import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoDbNoteRepository } from '../../src/db/mongodb-note-repository.js';

jest.mock('mongoose');

/*
// We'll manually mock the mongoose module
jest.mock('mongoose', () => {
    return {
        connect: jest.fn().mockResolvedValue({}),
        connection: {
            close: jest.fn().mockResolvedValue({}),
        },
        Schema: jest.fn().mockImplementation(() => ({})),
        model: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            }),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn()
        })
    };
});

// Import mongoose after mocking it
import mongoose from 'mongoose';
*/

describe('MongoDbNoteRepository Error Handling Tests', () => {
    let repository;
    const url = 'mongodb://admin:password@localhost:27017';
    const dbName = 'notes_test';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        repository = new MongoDbNoteRepository(url, dbName);
    });

    describe('init() method error handling', () => {
        it('should handle mongoose connection failure', async () => {
            // Mock mongoose.connect to throw an error
            const mockError = new Error('Failed to connect to MongoDB');
            mongoose.connect = jest.fn().mockRejectedValue(mockError);

            await expect(repository.init()).rejects.toThrow('Failed to connect to MongoDB');
            expect(mongoose.connect).toHaveBeenCalled();
        });

        it('should handle schema creation failure', async () => {
            // Mock mongoose.Schema to throw an error
            mongoose.connect = jest.fn().mockResolvedValue({});
            mongoose.Schema = jest.fn().mockImplementation(() => {
                throw new Error('Failed to create schema');
            });

            await expect(repository.init()).rejects.toThrow('Failed to create schema');
            expect(mongoose.connect).toHaveBeenCalled();
        });

        it('should handle model creation failure', async () => {
            // Mock mongoose.model to throw an error
            mongoose.connect = jest.fn().mockResolvedValue({});
            mongoose.Schema = jest.fn().mockImplementation(() => ({}));
            mongoose.model = jest.fn().mockImplementation(() => {
                throw new Error('Failed to create model');
            });

            await expect(repository.init()).rejects.toThrow('Failed to create model');
            expect(mongoose.connect).toHaveBeenCalled();
            expect(mongoose.Schema).toHaveBeenCalled();
            expect(mongoose.model).toHaveBeenCalled();
        });
    });

    describe('Database connection failure handling', () => {
        beforeEach(() => {
            // Setup repository with a NoteModel that throws connection errors
            repository.NoteModel = {
                find: jest.fn().mockReturnValue({
                    sort: jest.fn().mockRejectedValue(new Error('Connection failed'))
                }),
                findById: jest.fn().mockRejectedValue(new Error('Connection failed')),
                findByIdAndUpdate: jest.fn().mockRejectedValue(new Error('Connection failed')),
                findByIdAndDelete: jest.fn().mockRejectedValue(new Error('Connection failed'))
            };
        });

        it('should handle connection failure in findAll()', async () => {
            await expect(repository.findAll()).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.find).toHaveBeenCalled();
        });

        it('should handle connection failure in findDeleted()', async () => {
            await expect(repository.findDeleted()).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.find).toHaveBeenCalled();
        });

        it('should handle connection failure in findAllIncludingDeleted()', async () => {
            await expect(repository.findAllIncludingDeleted()).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.find).toHaveBeenCalled();
        });

        it('should handle connection failure in findById()', async () => {
            await expect(repository.findById('123')).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.findById).toHaveBeenCalledWith('123');
        });

        it('should handle connection failure in update()', async () => {
            const noteData = { title: 'Test', content: 'Test' };
            await expect(repository.update('123', noteData)).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should handle connection failure in moveToRecycleBin()', async () => {
            await expect(repository.moveToRecycleBin('123')).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should handle connection failure in restore()', async () => {
            await expect(repository.restore('123')).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should handle connection failure in permanentDelete()', async () => {
            await expect(repository.permanentDelete('123')).rejects.toThrow('Connection failed');
            expect(repository.NoteModel.findByIdAndDelete).toHaveBeenCalledWith('123');
        });
    });

    describe('create() method error handling', () => {
        it('should handle validation errors in create()', async () => {
            // Setup a NoteModel that throws validation error
            const mockError = new Error('Validation failed');
            mockError.name = 'ValidationError';

            const mockSave = jest.fn().mockRejectedValue(mockError);

            repository.NoteModel = jest.fn().mockImplementation(() => ({
                save: mockSave
            }));

            await expect(repository.create({ title: '', content: '' })).rejects.toThrow('Validation failed');
        });

        it('should handle connection errors in create()', async () => {
            // Setup a NoteModel that throws connection error
            const mockError = new Error('Connection failed');

            const mockSave = jest.fn().mockRejectedValue(mockError);

            repository.NoteModel = jest.fn().mockImplementation(() => ({
                save: mockSave
            }));

            await expect(repository.create({ title: 'Test', content: 'Test' })).rejects.toThrow('Connection failed');
        });
    });
});
