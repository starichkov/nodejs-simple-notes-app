/**
 * Interface for a Note repository.
 * This defines the contract that any database implementation must follow.
 */
export class NoteRepository {
    /**
     * Find all active notes (not deleted)
     * @returns {Promise<Array>} Promise resolving to an array of active Note objects
     */
    async findAll() {
        throw new Error('Method not implemented');
    }

    /**
     * Find all deleted notes (in recycle bin)
     * @returns {Promise<Array>} Promise resolving to an array of deleted Note objects
     */
    async findDeleted() {
        throw new Error('Method not implemented');
    }

    /**
     * Find all notes regardless of deletion status
     * @returns {Promise<Array>} Promise resolving to an array of all Note objects
     */
    async findAllIncludingDeleted() {
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
     * Move a note to recycle bin (soft delete)
     * @param {string} id - The ID of the note to move to recycle bin
     * @returns {Promise<boolean>} Promise resolving to true if moved to recycle bin, false if not found
     */
    async moveToRecycleBin(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Restore a note from recycle bin
     * @param {string} id - The ID of the note to restore
     * @returns {Promise<boolean>} Promise resolving to true if restored, false if not found
     */
    async restore(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Permanently delete a note
     * @param {string} id - The ID of the note to permanently delete
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
     */
    async permanentDelete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Empty the recycle bin by permanently deleting all deleted notes
     * @returns {Promise<number>} Promise resolving to the number of notes permanently deleted
     */
    async emptyRecycleBin() {
        throw new Error('Method not implemented');
    }

    /**
     * Restore all notes from recycle bin
     * @returns {Promise<number>} Promise resolving to the number of notes restored
     */
    async restoreAll() {
        throw new Error('Method not implemented');
    }

    /**
     * Count the number of deleted notes in recycle bin
     * @returns {Promise<number>} Promise resolving to the count of deleted notes
     */
    async countDeleted() {
        throw new Error('Method not implemented');
    }
}
