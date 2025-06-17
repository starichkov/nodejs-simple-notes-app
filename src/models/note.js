/**
 * Note model representing a text note in the system.
 * This model is database-agnostic and can be used with any database implementation.
 */
export class Note {
    /**
     * Create a new Note instance
     * @param {string} id - Unique identifier for the note
     * @param {string} title - Title of the note
     * @param {string} content - Content of the note
     * @param {Date} createdAt - Date when the note was created
     * @param {Date} updatedAt - Date when the note was last updated
     * @param {Date|null} deletedAt - Date when the note was deleted (null if not deleted)
     * @returns {Note} New Note instance
     * @example
     * const note = new Note('123', 'My Note', 'Note content', new Date(), new Date(), null);
     */
    constructor(id = null, title = '', content = '', createdAt = new Date(), updatedAt = new Date(), deletedAt = null) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.deletedAt = deletedAt;
    }

    /**
     * Create a Note instance from a plain object
     * @param {Object} obj - Plain object with note properties
     * @returns {Note} - New Note instance
     * @example
     * const note = Note.fromObject({
     *   id: 'note_123',
     *   title: 'Sample Note',
     *   content: 'This is a sample note',
     *   createdAt: '2023-01-01T00:00:00.000Z',
     *   updatedAt: '2023-01-02T00:00:00.000Z',
     *   deletedAt: null
     * });
     */
    static fromObject(obj) {
        const note = new Note();
        note.id = obj.id;
        note.title = obj.title;
        note.content = obj.content;
        note.createdAt = obj.createdAt ? new Date(obj.createdAt) : new Date();
        note.updatedAt = obj.updatedAt ? new Date(obj.updatedAt) : new Date();
        note.deletedAt = obj.deletedAt ? new Date(obj.deletedAt) : null;
        return note;
    }

    /**
     * Convert the Note instance to a plain object
     * @returns {Object} - Plain object representation of the note
     * @example
     * const note = new Note('123', 'Title', 'Content');
     * const obj = note.toObject();
     * // Returns: { id: '123', title: 'Title', content: 'Content', createdAt: Date, updatedAt: Date, deletedAt: null }
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt
        };
    }

    /**
     * Check if the note is deleted
     * @returns {boolean} True if the note is deleted, false otherwise
     */
    isDeleted() {
        return this.deletedAt !== null && this.deletedAt !== undefined;
    }

    /**
     * Check if the note is active (not deleted)
     * @returns {boolean} True if the note is active, false otherwise
     */
    isActive() {
        return this.deletedAt === null || this.deletedAt === undefined;
    }
}