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
     */
    constructor(id = null, title = '', content = '', createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Create a Note instance from a plain object
     * @param {Object} obj - Plain object with note properties
     * @returns {Note} - New Note instance
     */
    static fromObject(obj) {
        return new Note(
            obj.id,
            obj.title,
            obj.content,
            obj.createdAt ? new Date(obj.createdAt) : new Date(),
            obj.updatedAt ? new Date(obj.updatedAt) : new Date()
        );
    }

    /**
     * Convert the Note instance to a plain object
     * @returns {Object} - Plain object representation of the note
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}