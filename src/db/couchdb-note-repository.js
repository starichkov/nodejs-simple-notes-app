import nano from 'nano';
import { NoteRepository } from './note-repository.js';
import { Note } from '../models/note.js';

/**
 * CouchDB implementation of the NoteRepository interface.
 */
export class CouchDbNoteRepository extends NoteRepository {
    /**
     * Create a new CouchDbNoteRepository
     * @param {string} url - CouchDB connection URL
     * @param {string} dbName - Database name
     */
    constructor(url, dbName) {
        super();
        this.client = nano(url);
        this.dbName = dbName;
        this.db = null;
    }

    /**
     * Initialize the repository by ensuring the database exists
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Check if a database exists, if not, create it
            const dbList = await this.client.db.list();
            if (!dbList.includes(this.dbName)) {
                await this.client.db.create(this.dbName);
            }
            this.db = this.client.use(this.dbName);
            
            // Create a design document for views if it doesn't exist
            try {
                await this.db.get('_design/notes');
            } catch (error) {
                if (error.statusCode === 404) {
                    await this.db.insert({
                        views: {
                            all: {
                                map: function(doc) {
                                    if (doc.type === 'note') {
                                        emit(doc._id, null);
                                    }
                                }.toString()
                            }
                        }
                    }, '_design/notes');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Failed to initialize CouchDB repository:', error);
            throw error;
        }
    }

    /**
     * Find all notes
     * @returns {Promise<Array>} Promise resolving to an array of Note objects
     */
    async findAll() {
        try {
            const result = await this.db.view('notes', 'all', { include_docs: true });
            return result.rows.map(row => {
                const doc = row.doc;
                return Note.fromObject({
                    id: doc._id,
                    title: doc.title,
                    content: doc.content,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt
                });
            });
        } catch (error) {
            console.error('Failed to find all notes:', error);
            throw error;
        }
    }

    /**
     * Find a note by its ID
     * @param {string} id - The ID of the note to find
     * @returns {Promise<Object|null>} Promise resolving to a Note object or null if not found
     */
    async findById(id) {
        try {
            const doc = await this.db.get(id);
            return Note.fromObject({
                id: doc._id,
                title: doc.title,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            });
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            console.error(`Failed to find note with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new note
     * @param {Object} note - The note to create
     * @returns {Promise<Object>} Promise resolving to the created Note object
     */
    async create(note) {
        try {
            const now = new Date();
            const doc = {
                type: 'note',
                title: note.title,
                content: note.content,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };
            
            const result = await this.db.insert(doc);
            
            return Note.fromObject({
                id: result.id,
                title: doc.title,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            });
        } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
        }
    }

    /**
     * Update an existing note
     * @param {string} id - The ID of the note to update
     * @param {Object} note - The updated note data
     * @returns {Promise<Object|null>} Promise resolving to the updated Note object or null if not found
     */
    async update(id, note) {
        try {
            // Get the current document to get the _rev value
            const currentDoc = await this.db.get(id);
            
            const now = new Date();
            const updatedDoc = {
                _id: id,
                _rev: currentDoc._rev,
                type: 'note',
                title: note.title,
                content: note.content,
                createdAt: currentDoc.createdAt,
                updatedAt: now.toISOString()
            };
            
            await this.db.insert(updatedDoc);
            
            return Note.fromObject({
                id: id,
                title: updatedDoc.title,
                content: updatedDoc.content,
                createdAt: updatedDoc.createdAt,
                updatedAt: updatedDoc.updatedAt
            });
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            console.error(`Failed to update note with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a note by its ID
     * @param {string} id - The ID of the note to delete
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
     */
    async delete(id) {
        try {
            // Get the current document to get the _rev value
            const doc = await this.db.get(id);
            await this.db.destroy(id, doc._rev);
            return true;
        } catch (error) {
            if (error.statusCode === 404) {
                return false;
            }
            console.error(`Failed to delete note with ID ${id}:`, error);
            throw error;
        }
    }
}