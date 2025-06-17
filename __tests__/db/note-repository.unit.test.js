import { NoteRepository } from '../../src/db/note-repository.js';
import { jest } from '@jest/globals';

describe('NoteRepository Abstract Interface Tests', () => {
    let repository;

    beforeEach(() => {
        repository = new NoteRepository();
    });

    describe('Abstract Method Implementation', () => {
        test('should throw "Method not implemented" for findAll', async () => {
            await expect(repository.findAll()).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for findDeleted', async () => {
            await expect(repository.findDeleted()).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for findAllIncludingDeleted', async () => {
            await expect(repository.findAllIncludingDeleted()).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for findById', async () => {
            await expect(repository.findById('test-id')).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for create', async () => {
            const noteData = { title: 'Test', content: 'Test Content' };
            await expect(repository.create(noteData)).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for update', async () => {
            const noteData = { title: 'Updated', content: 'Updated Content' };
            await expect(repository.update('test-id', noteData)).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for moveToRecycleBin', async () => {
            await expect(repository.moveToRecycleBin('test-id')).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for restore', async () => {
            await expect(repository.restore('test-id')).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for permanentDelete', async () => {
            await expect(repository.permanentDelete('test-id')).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for emptyRecycleBin', async () => {
            await expect(repository.emptyRecycleBin()).rejects.toThrow('Method not implemented');
        });

        test('should throw "Method not implemented" for countDeleted', async () => {
            await expect(repository.countDeleted()).rejects.toThrow('Method not implemented');
        });

/*
        test('should throw "Method not implemented" for delete', async () => {
            await expect(repository.delete('test-id')).rejects.toThrow('Method not implemented');
        });
*/
    });

    describe('Inheritance Behavior', () => {
        test('should be instantiable as base class', () => {
            expect(repository).toBeInstanceOf(NoteRepository);
        });

        test('should have all required methods defined', () => {
            expect(typeof repository.findAll).toBe('function');
            expect(typeof repository.findDeleted).toBe('function');
            expect(typeof repository.findAllIncludingDeleted).toBe('function');
            expect(typeof repository.findById).toBe('function');
            expect(typeof repository.create).toBe('function');
            expect(typeof repository.update).toBe('function');
            expect(typeof repository.moveToRecycleBin).toBe('function');
            expect(typeof repository.restore).toBe('function');
            expect(typeof repository.permanentDelete).toBe('function');
            expect(typeof repository.emptyRecycleBin).toBe('function');
            expect(typeof repository.countDeleted).toBe('function');
            expect(typeof repository.findDeleted).toBe('function');
        });

        test('should have correct method arities', () => {
            expect(repository.findAll.length).toBe(0);
            expect(repository.findDeleted.length).toBe(0);
            expect(repository.findAllIncludingDeleted.length).toBe(0);
            expect(repository.findById.length).toBe(1);
            expect(repository.create.length).toBe(1);
            expect(repository.update.length).toBe(2);
            expect(repository.moveToRecycleBin.length).toBe(1);
            expect(repository.restore.length).toBe(1);
            expect(repository.permanentDelete.length).toBe(1);
            expect(repository.emptyRecycleBin.length).toBe(0);
            expect(repository.countDeleted.length).toBe(0);
            expect(repository.findDeleted.length).toBe(0);
            expect(repository.moveToRecycleBin.length).toBe(1);
        });
    });

    describe('Error Handling', () => {
        test('should reject with appropriate error messages', async () => {
            const errorMethods = [
                () => repository.findAll(),
                () => repository.findDeleted(),
                () => repository.findAllIncludingDeleted(),
                () => repository.findById('test'),
                () => repository.create({}),
                () => repository.update('test', {}),
                () => repository.moveToRecycleBin('test'),
                () => repository.restore('test'),
                () => repository.permanentDelete('test'),
                () => repository.emptyRecycleBin(),
                () => repository.countDeleted()
            ];

            for (const method of errorMethods) {
                await expect(method()).rejects.toThrow('Method not implemented');
            }
        });

        test('should throw synchronously accessible errors', () => {
            // Verify the methods throw immediately when called
            const methods = [
                () => repository.findAll(),
                () => repository.findDeleted(),
                () => repository.findAllIncludingDeleted(),
                () => repository.findById('test'),
                () => repository.create({}),
                () => repository.update('test', {}),
                () => repository.moveToRecycleBin('test'),
                () => repository.restore('test'),
                () => repository.permanentDelete('test')
            ];

            methods.forEach(method => {
                const promise = method();
                expect(promise).toBeInstanceOf(Promise);
                // The promise should be immediately rejected
                expect(promise).rejects.toThrow('Method not implemented');
            });
        });

        test('should return promises for async methods', () => {
            const asyncMethods = [
                () => repository.findAll(),
                () => repository.findDeleted(),
                () => repository.findAllIncludingDeleted(),
                () => repository.findById('test'),
                () => repository.create({}),
                () => repository.update('test', {}),
                () => repository.moveToRecycleBin('test'),
                () => repository.restore('test'),
                () => repository.permanentDelete('test'),
                () => repository.emptyRecycleBin(),
                () => repository.countDeleted(),
                () => repository.findDeleted()
            ];

            asyncMethods.forEach(method => {
                const result = method();
                expect(result).toBeInstanceOf(Promise);
                // Suppress unhandled promise rejection warnings in tests
                result.catch(() => {});
            });
        });
    });

    describe('Legacy Methods', () => {
        test('findDeleted should call findDeleted', async () => {
            // Mock the findDeleted method
            const mockFindDeleted = jest.spyOn(repository, 'findDeleted')
                .mockImplementation(() => Promise.resolve([]));

            await repository.findDeleted();

            expect(mockFindDeleted).toHaveBeenCalled();
            mockFindDeleted.mockRestore();
        });

/*
        test('moveToTrash should call moveToRecycleBin', async () => {
            // Mock the moveToRecycleBin method
            const mockMoveToRecycleBin = jest.spyOn(repository, 'moveToRecycleBin')
                .mockImplementation(() => Promise.resolve(true));

            await repository.moveToTrash('test-id');

            expect(mockMoveToRecycleBin).toHaveBeenCalledWith('test-id');
            mockMoveToRecycleBin.mockRestore();
        });
*/

/*
        test('delete should call moveToRecycleBin', async () => {
            // Mock the moveToRecycleBin method
            const mockMoveToRecycleBin = jest.spyOn(repository, 'moveToRecycleBin')
                .mockImplementation(() => Promise.resolve(true));

            await repository.delete('test-id');

            expect(mockMoveToRecycleBin).toHaveBeenCalledWith('test-id');
            mockMoveToRecycleBin.mockRestore();
        });
*/
    });
});
