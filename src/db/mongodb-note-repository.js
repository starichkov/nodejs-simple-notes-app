import mongoose from 'mongoose';
import { NoteRepository } from './note-repository.js';
import { Note } from '../models/note.js';

/**
 * MongoDB implementation of the NoteRepository interface.
 */
export class MongoDbNoteRepository extends NoteRepository {
    /**
     * Create a new MongoDbNoteRepository
     * @param {string} url - MongoDB connection URL
     * @param {string} dbName - Database name
     */
    constructor(url, dbName) {
        super();
        this.url = url;
        this.dbName = dbName;
        this.NoteModel = null;
    }

    /**
     * Initialize the repository by connecting to MongoDB and setting up the schema
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Connect to MongoDB
            await mongoose.connect(`${this.url}/${this.dbName}`);
            console.log('Connected to MongoDB');

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
     * Find all notes
     * @returns {Promise<Array>} Promise resolving to an array of Note objects
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
     * Find a note by its ID
     * @param {string} id - The ID of the note to find
     * @returns {Promise<Object|null>} Promise resolving to a Note object or null if not found
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
     * Create a new note
     * @param {Object} note - The note to create
     * @returns {Promise<Object>} Promise resolving to the created Note object
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
                createdAt: savedNote.createdAt,
                updatedAt: savedNote.updatedAt
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
     * Delete a note by its ID
     * @param {string} id - The ID of the note to delete
     * @returns {Promise<boolean>} Promise resolving to true if deleted, false if not found
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