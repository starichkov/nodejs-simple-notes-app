/**
 * Interface for a Note repository.
 * This defines the contract that any database implementation must follow.
 */
export class NoteRepository {
    /**
     * Find all notes
     * @returns {Promise<Array>} Promise resolving to an array of Note objects
     */
    async findAll() {
        throw new Error('Method not implemented');
    }

    /**
     * Find a note by its ID
     * @param {string} id - The ID of the note to find
     * @returns {Promise<Object|null>} Promise resolving to a Note object or null if not found
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Create a new note
     * @param {Object} note - The note to create
     * @returns {Promise<Object>} Promise resolving to the created Note object
     */
    async create(note) {
        throw new Error('Method not implemented');
    }

    /**
     * Update an existing note
     * @param {string} id - The ID of the note to update
     * @param {Object} note - The updated note data
     * @returns {Promise<Object|null>} Promise resolving to the updated Note object or null if not found
     */
    async update(id, note) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a note by its ID
     * @param {string} id - The ID of the note to delete
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }
}