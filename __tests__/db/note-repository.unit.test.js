import { NoteRepository } from '../../src/db/note-repository.js';

describe('NoteRepository Abstract Interface Tests', () => {
    let repository;

    beforeEach(() => {
        repository = new NoteRepository();
    });

    describe('Abstract Method Implementation', () => {
        test('should throw "Method not implemented" for findAll', async () => {
            await expect(repository.findAll()).rejects.toThrow('Method not implemented');
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

        test('should throw "Method not implemented" for delete', async () => {
            await expect(repository.delete('test-id')).rejects.toThrow('Method not implemented');
        });
    });

    describe('Inheritance Behavior', () => {
        test('should be instantiable as base class', () => {
            expect(repository).toBeInstanceOf(NoteRepository);
        });

        test('should have all required methods defined', () => {
            expect(typeof repository.findAll).toBe('function');
            expect(typeof repository.findById).toBe('function');
            expect(typeof repository.create).toBe('function');
            expect(typeof repository.update).toBe('function');
            expect(typeof repository.delete).toBe('function');
        });

        test('should maintain method signatures', () => {
            // Test that methods exist with correct parameter counts
            expect(repository.findAll.length).toBe(0);
            expect(repository.findById.length).toBe(1);
            expect(repository.create.length).toBe(1);
            expect(repository.update.length).toBe(2);
            expect(repository.delete.length).toBe(1);
        });
    });

    describe('Error Handling', () => {
        test('should ensure all abstract methods return rejected promises', async () => {
            const methods = [
                () => repository.findAll(),
                () => repository.findById('test'),
                () => repository.create({}),
                () => repository.update('test', {}),
                () => repository.delete('test')
            ];

            for (const method of methods) {
                await expect(method()).rejects.toThrow('Method not implemented');
            }
        });

        test('should throw synchronously accessible errors', () => {
            // Verify the methods throw immediately when called
            const methods = [
                () => repository.findAll(),
                () => repository.findById('test'),
                () => repository.create({}),
                () => repository.update('test', {}),
                () => repository.delete('test')
            ];

            methods.forEach(method => {
                const promise = method();
                expect(promise).toBeInstanceOf(Promise);
                // The promise should be immediately rejected
                expect(promise).rejects.toThrow('Method not implemented');
            });
        });
    });
}); 