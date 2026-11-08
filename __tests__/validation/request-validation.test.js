import { BadRequestError } from '../../src/errors/app-error.js';
import {
    MAX_NOTE_CONTENT_LENGTH,
    MAX_NOTE_CATEGORY_LENGTH,
    MAX_NOTE_TAG_COUNT,
    MAX_NOTE_TAG_LENGTH,
    MAX_NOTE_TAGS_LENGTH,
    MAX_NOTE_TITLE_LENGTH,
    parsePagination,
    parseSearchQuery,
    normalizeTags,
    validateNoteBody,
} from '../../src/validation/request-validation.js';

describe('request validation', () => {
    describe('validateNoteBody', () => {
        test('returns valid note fields unchanged', () => {
            expect(validateNoteBody({ title: ' Title ', content: ' Content ' })).toEqual({
                title: ' Title ',
                content: ' Content ',
                category: null,
                tags: [],
            });
        });

        test('normalizes tags and handles omitted or null values', () => {
            expect(
                validateNoteBody({ title: 'Title', content: 'Content', tags: [' Work ', 'work', '  ', 'Personal'] }),
            ).toEqual({
                title: 'Title',
                content: 'Content',
                category: null,
                tags: ['Work', 'Personal'],
            });
            expect(normalizeTags(null)).toEqual([]);
        });

        test('trims a category and preserves null when omitted', () => {
            expect(validateNoteBody({ title: 'Title', content: 'Content', category: ' Work ' })).toEqual({
                title: 'Title',
                content: 'Content',
                category: 'Work',
                tags: [],
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
            [{ title: 'Title', content: 'Content', tags: 'Work' }, 'tags must be an array'],
            [{ title: 'Title', content: 'Content', tags: [42] }, 'tags must contain only strings'],
            [
                { title: 'Title', content: 'Content', tags: ['a'.repeat(MAX_NOTE_TAG_LENGTH + 1)] },
                'each tag must not exceed 50 characters',
            ],
            [
                { title: 'Title', content: 'Content', tags: Array(MAX_NOTE_TAG_COUNT + 1).fill('tag') },
                'tags must not contain more than 20 items',
            ],
            [
                {
                    title: 'Title',
                    content: 'Content',
                    tags: Array.from(
                        { length: 11 },
                        (_, index) => `${String(index).padStart(2, '0')}${'a'.repeat(48)}`,
                    ),
                },
                'tags must not exceed 500 characters in total',
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
