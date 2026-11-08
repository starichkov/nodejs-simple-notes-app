import { BadRequestError } from '../errors/app-error.js';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const MAX_NOTE_TITLE_LENGTH = 200;
export const MAX_NOTE_CONTENT_LENGTH = 10000;
export const MAX_NOTE_CATEGORY_LENGTH = 100;
export const MAX_SEARCH_QUERY_LENGTH = 200;

/**
 * Check whether a query value is a safe non-negative integer string.
 * @param {*} value - Query value to check
 * @returns {boolean} Whether the value is a safe integer
 * @example isSafeIntegerQueryValue('10'); // true
 */
function isSafeIntegerQueryValue(value) {
    return typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
}

/**
 * Validate and normalize a note request body.
 * @param {object} body - Request body containing title and content
 * @returns {{title: string, content: string, category: string|null}} Validated note fields
 * @throws {BadRequestError} When fields are missing, have invalid types, or exceed limits
 * @example validateNoteBody({ title: 'Title', content: 'Content' });
 */
export function validateNoteBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new BadRequestError('Title and content are required');
    }

    const { title, content, category } = body;
    if (title === undefined || content === undefined) {
        throw new BadRequestError('Title and content are required');
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
        throw new BadRequestError('title must be a non-empty string');
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
        throw new BadRequestError('content must be a non-empty string');
    }
    if (title.length > MAX_NOTE_TITLE_LENGTH) {
        throw new BadRequestError(`title must not exceed ${MAX_NOTE_TITLE_LENGTH} characters`);
    }
    if (content.length > MAX_NOTE_CONTENT_LENGTH) {
        throw new BadRequestError(`content must not exceed ${MAX_NOTE_CONTENT_LENGTH} characters`);
    }
    if (category !== undefined && category !== null && typeof category !== 'string') {
        throw new BadRequestError('category must be a string');
    }
    const normalizedCategory = category === undefined || category === null ? null : category.trim();
    if (normalizedCategory && normalizedCategory.length > MAX_NOTE_CATEGORY_LENGTH) {
        throw new BadRequestError(`category must not exceed ${MAX_NOTE_CATEGORY_LENGTH} characters`);
    }

    return { title, content, category: normalizedCategory || null };
}

/**
 * Parse and validate active-note pagination query parameters.
 * @param {object} query - Express query parameters
 * @returns {{limit: number, offset: number}} Normalized pagination options
 * @throws {BadRequestError} When a value is malformed or out of range
 * @example parsePagination({ limit: '10', offset: '20' });
 */
export function parsePagination(query) {
    const limitValue = query.limit;
    const offsetValue = query.offset;

    if (
        limitValue !== undefined &&
        (!isSafeIntegerQueryValue(limitValue) || Number(limitValue) < 1 || Number(limitValue) > MAX_PAGE_LIMIT)
    ) {
        throw new BadRequestError(`limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`);
    }
    if (offsetValue !== undefined && (!isSafeIntegerQueryValue(offsetValue) || Number(offsetValue) < 0)) {
        throw new BadRequestError('offset must be a non-negative integer');
    }

    return {
        limit: limitValue === undefined ? DEFAULT_PAGE_LIMIT : Number(limitValue),
        offset: offsetValue === undefined ? 0 : Number(offsetValue),
    };
}

/**
 * Parse and validate the note search query.
 * @param {object} query - Express query parameters
 * @returns {string} Trimmed search keyword
 * @throws {BadRequestError} When the query is missing, blank, or too long
 * @example parseSearchQuery({ q: 'project' }); // 'project'
 */
export function parseSearchQuery(query) {
    const keyword = typeof query.q === 'string' ? query.q.trim() : '';
    if (!keyword) {
        throw new BadRequestError('Search query is required');
    }
    if (keyword.length > MAX_SEARCH_QUERY_LENGTH) {
        throw new BadRequestError(`Search query must not exceed ${MAX_SEARCH_QUERY_LENGTH} characters`);
    }
    return keyword;
}
