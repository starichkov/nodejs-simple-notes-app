import { BadRequestError } from '../errors/app-error.js';
import { normalizeTags } from '../validation/request-validation.js';

/**
 * Coordinates tag normalization and tag-focused note use cases.
 */
export class TagService {
    /**
     * @param {NoteRepository} noteRepository - Repository used for tag operations
     */
    constructor(noteRepository) {
        this.noteRepository = noteRepository;
    }

    /**
     * List unique tags used by active notes.
     * @returns {Promise<string[]>} Deterministically ordered active tags
     * @throws {Error} When the repository cannot discover tags
     * @example await service.listActiveTags();
     */
    async listActiveTags() {
        const tags = await this.noteRepository.findTags();
        return [...new Set(tags)].sort(
            (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }) || left.localeCompare(right),
        );
    }

    /**
     * Find active notes matching a tag.
     * @param {string} tag - Tag to match case-insensitively
     * @param {{limit: number, offset: number}} pagination - Pagination options
     * @returns {Promise<{notes: Array, total: number}>} Matching page and total
     * @throws {BadRequestError} When the tag is blank or invalid
     * @throws {Error} When the repository fails
     * @example await service.findActiveNotesByTag('Work', { limit: 20, offset: 0 });
     */
    async findActiveNotesByTag(tag, pagination) {
        const normalized = normalizeTags([tag]);
        if (normalized.length === 0) {
            throw new BadRequestError('tag must be a non-empty string');
        }
        return this.noteRepository.findAllByTag(normalized[0], pagination);
    }
}
