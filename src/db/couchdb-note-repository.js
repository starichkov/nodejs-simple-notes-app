import nano from 'nano';
import {NoteRepository} from './note-repository.js';
import {Note} from '../models/note.js';

/**
 * CouchDB implementation of the NoteRepository interface.
 * Provides persistent storage for notes using Apache CouchDB as the backend.
 * 
 * @class
 * @extends NoteRepository
 * @example
 * const repository = new CouchDbNoteRepository('http://admin:password@localhost:5984', 'notes_db');
 * await repository.init();
 * const notes = await repository.findAll();
 */
export class CouchDbNoteRepository extends NoteRepository {
    /**
     * Create a new CouchDbNoteRepository
     * @param {string} url - CouchDB connection URL (including authentication if required)
     * @param {string} dbName - Database name to use for storing notes
     * @returns {CouchDbNoteRepository} New CouchDbNoteRepository instance
     * @example
     * // With authentication
     * const repo = new CouchDbNoteRepository('http://user:pass@localhost:5984', 'my_notes');
     * 
     * // Without authentication
     * const repo = new CouchDbNoteRepository('http://localhost:5984', 'my_notes');
     */
    constructor(url, dbName) {
        super();
        this.client = nano(url);
        this.dbName = dbName;
        this.db = null;
    }

    /**
     * Initialize the repository by ensuring the database exists and creating necessary design documents.
     * This method must be called before using any other repository methods.
     * 
     * @returns {Promise<void>}
     * @throws {Error} When CouchDB is unreachable or database creation fails
     * @throws {Error} When design document creation fails
     * @example
     * const repository = new CouchDbNoteRepository(url, dbName);
     * await repository.init(); // Creates database and design documents if needed
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
                    const designDoc = {
                        _id: '_design/notes',
                        views: {
                            all: {
                                map: "function(doc) { if (doc.type === 'note') { emit(doc._id, null); } }"
                            },
                            active: {
                                map: "function(doc) { if (doc.type === 'note' && doc.deletedAt === null) { emit(doc.updatedAt, null); } }"
                            },
                            deleted: {
                                map: "function(doc) { if (doc.type === 'note' && doc.deletedAt !== null) { emit(doc.deletedAt, null); } }"
                            }
                        },
                        language: 'javascript'
                    };
                    await this.db.insert(designDoc);
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
     * Find all active notes (not deleted)
     * @returns {Promise<Note[]>} Promise resolving to an array of active Note objects
     * @throws {Error} When database query fails or CouchDB is unreachable
     * @example
     * const activeNotes = await repository.findAll();
     * console.log(`Found ${activeNotes.length} active notes`);
     */
    async findAll() {
        try {
            const result = await this.db.view('notes', 'active', {
                update: true, 
                include_docs: true,
                descending: true // Sort by date descending (newest first)
            });

            if (!result.rows) {
                console.log('No rows in view result, returning empty array');
                return [];
            }

            const notes = result.rows.map(row => {
                if (!row.doc) {
                    console.log('Row without doc:', row);
                    return null;
                }
                const doc = row.doc;
                return Note.fromObject({
                    id: doc._id,
                    title: doc.title,
                    content: doc.content,
                    deletedAt: doc.deletedAt,
                    createdAt: new Date(doc.createdAt),
                    updatedAt: new Date(doc.updatedAt)
                });
            }).filter(note => note !== null);
            return notes;
        } catch (error) {
            console.error('Failed to find all active notes:', error);
            throw error;
        }
    }

    /**
     * Find all deleted notes (in recycle bin)
     * @returns {Promise<Note[]>} Promise resolving to an array of deleted Note objects
     * @throws {Error} When database query fails or CouchDB is unreachable
     * @example
     * const deletedNotes = await repository.findDeleted();
     * console.log(`Found ${deletedNotes.length} notes in recycle bin`);
     */
    async findDeleted() {
        try {
            const result = await this.db.view('notes', 'deleted', {
                update: true, 
                include_docs: true,
                descending: true // Sort by deleted date descending (most recently deleted first)
            });
            return this._mapResult(result);
        } catch (error) {
            console.error('Failed to find deleted notes:', error);
            throw error;
        }
    }

    /**
     * Find all notes regardless of deletion status
     * @returns {Promise<Note[]>} Promise resolving to an array of all Note objects
     * @throws {Error} When database query fails or CouchDB is unreachable
     */
    async findAllIncludingDeleted() {
        try {
            const result = await this.db.view('notes', 'all', {
                update: true, 
                include_docs: true,
                descending: true
            });

            return this._mapResult(result);
        } catch (error) {
            console.error('Failed to find all notes including deleted:', error);
            throw error;
        }
    }

    /**
     * Find a note by its unique identifier
     * @param {string} id - The unique ID of the note to retrieve
     * @returns {Promise<Note|null>} Promise resolving to a Note object or null if not found
     * @throws {Error} When database query fails (except for 404 not found)
     * @example
     * const note = await repository.findById('note_123');
     * if (note) {
     *   console.log(`Found note: ${note.title}`);
     * } else {
     *   console.log('Note not found');
     * }
     */
    async findById(id) {
        try {
            const doc = await this.db.get(id);
            return Note.fromObject({
                id: doc._id,
                title: doc.title,
                content: doc.content,
                deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
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
     * Create a new note in the database
     * @param {Object} note - The note data to create
     * @param {string} note.title - The title of the note
     * @param {string} note.content - The content of the note
     * @returns {Promise<Note>} Promise resolving to the created Note object with assigned ID
     * @throws {Error} When note creation fails or database is unreachable
     * @example
     * const newNote = await repository.create({
     *   title: 'My New Note',
     *   content: 'This is the content of my note'
     * });
     * console.log(`Created note with ID: ${newNote.id}`);
     */
    async create(note) {
        try {
            const now = new Date();
            const doc = {
                type: 'note',
                title: note.title,
                content: note.content,
                deletedAt: null,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            const result = await this.db.insert(doc);

            return Note.fromObject({
                id: result.id,
                title: doc.title,
                content: doc.content,
                deletedAt: doc.deletedAt,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
            });
        } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
        }
    }

    /**
     * Update an existing note in the database
     * @param {string} id - The ID of the note to update
     * @param {Object} note - The updated note data
     * @param {string} note.title - The updated title of the note
     * @param {string} note.content - The updated content of the note
     * @returns {Promise<Note|null>} Promise resolving to the updated Note object or null if not found
     * @throws {Error} When update fails due to database issues
     * @throws {Error} When document was modified concurrently (409 conflict)
     * @example
     * const updatedNote = await repository.update('note_123', {
     *   title: 'Updated Title',
     *   content: 'Updated content'
     * });
     * if (updatedNote) {
     *   console.log('Note updated successfully');
     * } else {
     *   console.log('Note not found');
     * }
     */
    async update(id, note) {
        try {

            // Get the current document
            let currentDoc;
            try {
                currentDoc = await this.db.get(id);
                console.log('Current document:', currentDoc);
            } catch (error) {
                if (error.statusCode === 404) {
                    console.log(`Note ${id} not found`);
                    return null;
                }
                throw error;
            }

            const now = new Date();
            const updatedDoc = {
                _id: id,
                _rev: currentDoc._rev,
                type: 'note',
                title: note.title,
                content: note.content,
                deletedAt: currentDoc.deletedAt || null,
                createdAt: currentDoc.createdAt,
                updatedAt: now.toISOString()
            };

            const result = await this.db.insert(updatedDoc);

            return Note.fromObject({
                id: id,
                title: note.title,
                content: note.content,
                deletedAt: updatedDoc.deletedAt ? new Date(updatedDoc.deletedAt) : null,
                createdAt: new Date(currentDoc.createdAt),
                updatedAt: new Date(updatedDoc.updatedAt)
            });
        } catch (error) {
            console.error(`Failed to update note with ID ${id}:`, error);
            if (error.statusCode === 409) {
                throw new Error('Document was modified concurrently. Please try again.');
            }
            throw error;
        }
    }

    /**
     * Move a note to recycle bin (soft delete)
     * @param {string} id - The ID of the note to move to recycle bin
     * @returns {Promise<boolean>} Promise resolving to true if moved to recycle bin, false if not found
     * @throws {Error} When operation fails due to database issues
     * @example
     * const moved = await repository.moveToRecycleBin('note_123');
     * if (moved) {
     *   console.log('Note moved to recycle bin successfully');
     * } else {
     *   console.log('Note not found');
     * }
     */
    async moveToRecycleBin(id) {
        try {
            // Get the current document
            let currentDoc;
            try {
                currentDoc = await this.db.get(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return false;
                }
                throw error;
            }

            const now = new Date();
            const updatedDoc = {
                ...currentDoc,
                deletedAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            await this.db.insert(updatedDoc);
            return true;
        } catch (error) {
            console.error(`Failed to move note to recycle bin with ID ${id}:`, error);
            if (error.statusCode === 404) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Restore a note from recycle bin
     * @param {string} id - The ID of the note to restore
     * @returns {Promise<boolean>} Promise resolving to true if restored, false if not found
     * @throws {Error} When operation fails due to database issues
     * @example
     * const restored = await repository.restore('note_123');
     * if (restored) {
     *   console.log('Note restored successfully');
     * } else {
     *   console.log('Note not found');
     * }
     */
    async restore(id) {
        try {
            // Get the current document
            let currentDoc;
            try {
                currentDoc = await this.db.get(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return false;
                }
                throw error;
            }

            const now = new Date();
            const updatedDoc = {
                ...currentDoc,
                deletedAt: null,
                updatedAt: now.toISOString()
            };

            await this.db.insert(updatedDoc);
            return true;
        } catch (error) {
            console.error(`Failed to restore note with ID ${id}:`, error);
            if (error.statusCode === 404) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Permanently delete a note from the database
     * @param {string} id - The ID of the note to permanently delete
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
     * @throws {Error} When deletion fails due to database issues
     * @example
     * const deleted = await repository.permanentDelete('note_123');
     * if (deleted) {
     *   console.log('Note permanently deleted');
     * } else {
     *   console.log('Note not found');
     * }
     */
    async permanentDelete(id) {
        try {
            // Get the current document
            let doc;
            try {
                doc = await this.db.get(id);
            } catch (error) {
                if (error.statusCode === 404) {
                    return false;
                }
                throw error;
            }
            await this.db.destroy(id, doc._rev);
            return true;
        } catch (error) {
            if (error.statusCode === 404) {
                return false;
            }
            console.error(`Failed to permanently delete note with ID ${id}:`, error);
            throw error;
        }
    }

    _mapResult(result) {
        if (!result || !result.rows) {
            console.log('No rows in view result, returning empty array');
            return [];
        }

        return result.rows.map(row => {
            if (!row.doc) {
                console.log('Row without doc:', row);
                return null;
            }
            const doc = row.doc;
            return Note.fromObject({
                id: doc._id,
                title: doc.title,
                content: doc.content,
                deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
            });
        }).filter(note => note !== null);
    }
}
