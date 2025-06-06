import mongoose from 'mongoose';
import { NoteRepository } from './note-repository.js';
import { Note } from '../models/note.js';

/**
 * MongoDB implementation of the NoteRepository interface.
 * Provides persistent storage for notes using MongoDB as the backend via Mongoose ODM.
 * 
 * @class
 * @extends NoteRepository
 * @example
 * const repository = new MongoDbNoteRepository('mongodb://localhost:27017', 'notes_db');
 * await repository.init();
 * const notes = await repository.findAll();
 */
export class MongoDbNoteRepository extends NoteRepository {
    /**
     * Create a new MongoDbNoteRepository
     * @param {string} url - MongoDB connection URL (with or without authentication)
     * @param {string} dbName - Database name to use for storing notes
     * @returns {MongoDbNoteRepository} New MongoDbNoteRepository instance
     * @example
     * // With authentication
     * const repo = new MongoDbNoteRepository('mongodb://user:pass@localhost:27017', 'my_notes');
     * 
     * // Without authentication
     * const repo = new MongoDbNoteRepository('mongodb://localhost:27017', 'my_notes');
     */
    constructor(url, dbName) {
        super();
        this.url = url;
        this.dbName = dbName;
        this.NoteModel = null;
    }

    /**
     * Initialize the repository by connecting to MongoDB and setting up the schema.
     * This method must be called before using any other repository methods.
     * 
     * @returns {Promise<void>}
     * @throws {Error} When MongoDB is unreachable or connection fails
     * @throws {Error} When schema creation fails
     * @example
     * const repository = new MongoDbNoteRepository(url, dbName);
     * await repository.init(); // Connects to MongoDB and creates schema
     */
    async init() {
        try {
            // Connect to MongoDB using the provided URL and database name
            await mongoose.connect(this.url, { dbName: this.dbName });
            // const connectionUrl = this.url.endsWith('/') ? this.url + this.dbName : this.url + '/' + this.dbName;
            // await mongoose.connect(connectionUrl);
            // await mongoose.connect(`${this.url}/${this.dbName}`);
            console.log(`Connected to MongoDB database: ${this.dbName}`);

            // Define the schema if it doesn't exist
            if (!this.NoteModel) {
                const noteSchema = new mongoose.Schema({
                    title: { type: String, required: true },
                    content: { type: String, required: true },
                    createdAt: { type: Date, default: Date.now },
                    updatedAt: { type: Date, default: Date.now }
                });

                this.NoteModel = mongoose.model('Note', noteSchema);
            }
        } catch (error) {
            console.error('Failed to initialize MongoDB repository:', error);
            throw error;
        }
    }

    /**
     * Find all notes in the database, sorted by most recently updated first
     * @returns {Promise<Note[]>} Promise resolving to an array of Note objects
     * @throws {Error} When database query fails or MongoDB is unreachable
     * @example
     * const notes = await repository.findAll();
     * console.log(`Found ${notes.length} notes`);
     * // Notes are sorted by updatedAt in descending order (newest first)
     */
    async findAll() {
        try {
            const notes = await this.NoteModel.find().sort({ updatedAt: -1 });
            return notes.map(doc => Note.fromObject({
                id: doc._id.toString(),
                title: doc.title,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            }));
        } catch (error) {
            console.error('Failed to find all notes:', error);
            throw error;
        }
    }

    /**
     * Find a note by its unique identifier
     * @param {string} id - The unique ID of the note to retrieve (MongoDB ObjectId)
     * @returns {Promise<Note|null>} Promise resolving to a Note object or null if not found
     * @throws {Error} When database query fails (except for invalid ObjectId format)
     * @example
     * const note = await repository.findById('507f1f77bcf86cd799439011');
     * if (note) {
     *   console.log(`Found note: ${note.title}`);
     * } else {
     *   console.log('Note not found');
     * }
     */
    async findById(id) {
        try {
            const doc = await this.NoteModel.findById(id);
            if (!doc) {
                return null;
            }
            return Note.fromObject({
                id: doc._id.toString(),
                title: doc.title,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            });
        } catch (error) {
            if (error.name === 'CastError') {
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
     * @throws {Error} When note creation fails due to validation errors or database issues
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
            const newNote = new this.NoteModel({
                title: note.title,
                content: note.content,
                createdAt: now,
                updatedAt: now
            });
            
            const savedNote = await newNote.save();
            
            return Note.fromObject({
                id: savedNote._id.toString(),
                title: savedNote.title,
                content: savedNote.content,
                createdAt: new Date(savedNote.createdAt),
                updatedAt: new Date(savedNote.updatedAt)
            });
        } catch (error) {
            console.error('Failed to create note:', error);
            throw error;
        }
    }

    /**
     * Update an existing note in the database
     * @param {string} id - The ID of the note to update (MongoDB ObjectId)
     * @param {Object} note - The updated note data
     * @param {string} note.title - The updated title of the note
     * @param {string} note.content - The updated content of the note
     * @returns {Promise<Note|null>} Promise resolving to the updated Note object or null if not found
     * @throws {Error} When update fails due to validation errors or database issues
     * @example
     * const updatedNote = await repository.update('507f1f77bcf86cd799439011', {
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
            const now = new Date();
            const updatedDoc = await this.NoteModel.findByIdAndUpdate(
                id,
                {
                    title: note.title,
                    content: note.content,
                    updatedAt: now
                },
                { new: true } // Return the updated document
            );
            
            if (!updatedDoc) {
                return null;
            }
            
            return Note.fromObject({
                id: updatedDoc._id.toString(),
                title: updatedDoc.title,
                content: updatedDoc.content,
                createdAt: updatedDoc.createdAt,
                updatedAt: updatedDoc.updatedAt
            });
        } catch (error) {
            if (error.name === 'CastError') {
                return null;
            }
            console.error(`Failed to update note with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a note from the database
     * @param {string} id - The ID of the note to delete (MongoDB ObjectId)
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
     * @throws {Error} When deletion fails due to database issues
     * @example
     * const deleted = await repository.delete('507f1f77bcf86cd799439011');
     * if (deleted) {
     *   console.log('Note deleted successfully');
     * } else {
     *   console.log('Note not found');
     * }
     */
    async delete(id) {
        try {
            const result = await this.NoteModel.findByIdAndDelete(id);
            return !!result; // Convert to boolean
        } catch (error) {
            if (error.name === 'CastError') {
                return false;
            }
            console.error(`Failed to delete note with ID ${id}:`, error);
            throw error;
        }
    }
}