import { BadRequestError } from '../../src/errors/app-error.js';
import {
    MAX_NOTE_CONTENT_LENGTH,
    MAX_NOTE_CATEGORY_LENGTH,
    MAX_NOTE_TITLE_LENGTH,
    parsePagination,
    parseSearchQuery,
    validateNoteBody,
} from '../../src/validation/request-validation.js';

describe('request validation', () => {
    describe('validateNoteBody', () => {
        test('returns valid note fields unchanged', () => {
            expect(validateNoteBody({ title: ' Title ', content: ' Content ' })).toEqual({
                title: ' Title ',
                content: ' Content ',
                category: null,
            });
        });

        test('trims a category and preserves null when omitted', () => {
            expect(validateNoteBody({ title: 'Title', content: 'Content', category: ' Work ' })).toEqual({
                title: 'Title',
                content: 'Content',
                category: 'Work',
            });
        });

        test.each([
            [null, 'Title and content are required'],
            [{}, 'Title and content are required'],
            [{ title: 123, content: 'Content' }, 'title must be a non-empty string'],
            [{ title: 'Title', content: [] }, 'content must be a non-empty string'],
            [{ title: '   ', content: 'Content' }, 'title must be a non-empty string'],
            [{ title: 'Title', content: '   ' }, 'content must be a non-empty string'],
            [
                { title: 'a'.repeat(MAX_NOTE_TITLE_LENGTH + 1), content: 'Content' },
                'title must not exceed 200 characters',
            ],
            [
                { title: 'Title', content: 'a'.repeat(MAX_NOTE_CONTENT_LENGTH + 1) },
                'content must not exceed 10000 characters',
            ],
            [{ title: 'Title', content: 'Content', category: 42 }, 'category must be a string'],
            [
                { title: 'Title', content: 'Content', category: 'a'.repeat(MAX_NOTE_CATEGORY_LENGTH + 1) },
                'category must not exceed 100 characters',
            ],
        ])('rejects invalid body %#', (body, message) => {
            expect(() => validateNoteBody(body)).toThrow(new BadRequestError(message));
        });
    });

    describe('parsePagination', () => {
        test('uses safe defaults', () => {
            expect(parsePagination({})).toEqual({ limit: 20, offset: 0 });
        });

        test('parses valid values', () => {
            expect(parsePagination({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 });
        });

        test.each([{ limit: '0' }, { limit: '101' }, { limit: '1.5' }, { offset: '-1' }, { offset: 'abc' }])(
            'rejects invalid pagination %#',
            (query) => {
                expect(() => parsePagination(query)).toThrow(BadRequestError);
            },
        );
    });

    describe('parseSearchQuery', () => {
        test('trims a valid keyword', () => {
            expect(parseSearchQuery({ q: ' project ' })).toBe('project');
        });

        test.each([{}, { q: '   ' }, { q: ['project'] }, { q: 'a'.repeat(201) }])(
            'rejects invalid query %#',
            (query) => {
                expect(() => parseSearchQuery(query)).toThrow(BadRequestError);
            },
        );
    });
});
