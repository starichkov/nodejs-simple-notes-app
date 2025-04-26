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

// Fetch all notes from the API
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

// Display notes in the UI
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

// Open modal for creating a new note
function openCreateNoteModal() {
    modalTitle.textContent = 'Create New Note';
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteModal.classList.add('modal-visible');
}

// Open modal for editing an existing note
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

// Close the modal
function closeModal() {
    noteModal.classList.remove('modal-visible');
}

// Handle form submission (create or update note)
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

// Delete a note
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

// Handle clicks on note action buttons using event delegation
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

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
