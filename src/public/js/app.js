// DOM Elements
const notesContainer = document.getElementById('notes-container');
const createNoteBtn = document.getElementById('create-note-btn');
const noteModal = document.getElementById('note-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const cancelBtn = document.getElementById('cancel-btn');

// API Base URL
const API_URL = '/api/notes';

// Event Listeners
document.addEventListener('DOMContentLoaded', fetchNotes);
createNoteBtn.addEventListener('click', openCreateNoteModal);
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
noteForm.addEventListener('submit', handleFormSubmit);
window.addEventListener('click', (e) => {
    if (e.target === noteModal) {
        closeModal();
    }
});

/**
 * Fetch all notes from the API and display them in the UI
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When API request fails or response is not ok
 * @example
 * // Automatically called on page load
 * await fetchNotes();
 */
async function fetchNotes() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch notes');
        }
        const notes = await response.json();
        displayNotes(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        notesContainer.innerHTML = `<div class="error">Error loading notes: ${error.message}</div>`;
    }
}

/**
 * Display notes in the UI container, handling empty state
 * @param {Object[]} notes - Array of note objects to display
 * @param {string} notes[].id - Unique identifier of the note
 * @param {string} notes[].title - Title of the note
 * @param {string} notes[].content - Content of the note
 * @returns {void}
 * @example
 * const notes = [
 *   { id: '1', title: 'Sample Note', content: 'Sample content' }
 * ];
 * displayNotes(notes);
 */
function displayNotes(notes) {
    if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="no-notes">No notes found. Create your first note!</div>';
        return;
    }

    notesContainer.innerHTML = notes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(note.content)}</p>
            <div class="note-actions">
                <button class="btn btn-secondary edit-btn" data-id="${note.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${note.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners using event delegation
    notesContainer.addEventListener('click', handleNoteActions);
}

/**
 * Open the modal dialog for creating a new note
 * @returns {void}
 * @example
 * // Called when user clicks "Create New Note" button
 * openCreateNoteModal();
 */
function openCreateNoteModal() {
    modalTitle.textContent = 'Create New Note';
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteModal.classList.add('modal-visible');
}

/**
 * Open the modal dialog for editing an existing note
 * @async
 * @param {string} id - The unique identifier of the note to edit
 * @returns {Promise<void>}
 * @throws {Error} When note fetch fails or note is not found
 * @example
 * // Called when user clicks "Edit" button on a note
 * await openEditNoteModal('note_123');
 */
async function openEditNoteModal(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch note');
        }
        const note = await response.json();

        modalTitle.textContent = 'Edit Note';
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        noteModal.classList.add('modal-visible');
    } catch (error) {
        console.error('Error fetching note for edit:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Close the modal dialog and hide it from view
 * @returns {void}
 * @example
 * // Called when user clicks close button or cancel
 * closeModal();
 */
function closeModal() {
    noteModal.classList.remove('modal-visible');
}

/**
 * Handle form submission for creating or updating a note
 * @async
 * @param {Event} e - The form submit event
 * @returns {Promise<void>}
 * @throws {Error} When note creation/update fails
 * @example
 * // Automatically called when form is submitted
 * noteForm.addEventListener('submit', handleFormSubmit);
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const noteData = {
        title: noteTitleInput.value.trim(),
        content: noteContentInput.value.trim()
    };

    if (!noteData.title || !noteData.content) {
        alert('Title and content are required');
        return;
    }

    const id = noteIdInput.value;
    const isEdit = !!id;

    try {
        const url = isEdit ? `${API_URL}/${id}` : API_URL;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) {
            throw new Error(`Failed to ${isEdit ? 'update' : 'create'} note`);
        }

        closeModal();
        fetchNotes();
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'creating'} note:`, error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Delete a note after user confirmation
 * @async
 * @param {string} id - The unique identifier of the note to delete
 * @returns {Promise<void>}
 * @throws {Error} When note deletion fails
 * @example
 * // Called when user clicks "Delete" button on a note
 * await deleteNote('note_123');
 */
async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete note');
        }

        fetchNotes();
    } catch (error) {
        console.error('Error deleting note:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Handle clicks on note action buttons using event delegation
 * @param {Event} e - The click event on the notes container
 * @returns {void}
 * @example
 * // Automatically handles edit and delete button clicks
 * notesContainer.addEventListener('click', handleNoteActions);
 */
function handleNoteActions(e) {
    const target = e.target;

    // Check if the clicked element is a button with a data-id attribute
    if (target.tagName === 'BUTTON' && target.dataset.id) {
        const noteId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            openEditNoteModal(noteId);
        } else if (target.classList.contains('delete-btn')) {
            deleteNote(noteId);
        }
    }
}

/**
 * Escape HTML characters to prevent XSS attacks
 * @param {string} unsafe - The unsafe string that may contain HTML characters
 * @returns {string} The escaped string safe for HTML insertion
 * @example
 * const safe = escapeHtml('<script>alert("xss")</script>');
 * // Returns: "&lt;script&gt;alert("xss")&lt;/script&gt;"
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
