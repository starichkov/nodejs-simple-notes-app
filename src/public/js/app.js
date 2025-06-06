// DOM Elements
const notesContainer = document.getElementById('notes-container');
const trashContainer = document.getElementById('trash-container');
const createNoteBtn = document.getElementById('create-note-btn');
const noteModal = document.getElementById('note-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const cancelBtn = document.getElementById('cancel-btn');

// Tab elements
const notesTab = document.getElementById('notes-tab');
const trashTab = document.getElementById('trash-tab');
const notesView = document.getElementById('notes-view');
const trashView = document.getElementById('trash-view');

// Current view state
let currentView = 'notes';

// API Base URL
const API_URL = '/api/notes';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes();
    initializeTabs();
});
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
 * Initialize tab navigation
 * @returns {void}
 */
function initializeTabs() {
    notesTab.addEventListener('click', () => switchToView('notes'));
    trashTab.addEventListener('click', () => switchToView('trash'));
}

/**
 * Switch between notes and trash views
 * @param {string} view - The view to switch to ('notes' or 'trash')
 * @returns {void}
 */
function switchToView(view) {
    currentView = view;
    
    // Update tab active states
    if (view === 'notes') {
        notesTab.classList.add('active');
        trashTab.classList.remove('active');
        notesView.classList.add('active');
        trashView.classList.remove('active');
        createNoteBtn.style.display = 'block';
        fetchNotes();
    } else {
        trashTab.classList.add('active');
        notesTab.classList.remove('active');
        trashView.classList.add('active');
        notesView.classList.remove('active');
        createNoteBtn.style.display = 'none';
        fetchTrashedNotes();
    }
}

/**
 * Fetch all active notes from the API and display them in the UI
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
 * Fetch all trashed notes from the API and display them in the UI
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When API request fails or response is not ok
 */
async function fetchTrashedNotes() {
    try {
        const response = await fetch(`${API_URL}/trash`);
        if (!response.ok) {
            throw new Error('Failed to fetch trashed notes');
        }
        const notes = await response.json();
        displayTrashedNotes(notes);
    } catch (error) {
        console.error('Error fetching trashed notes:', error);
        trashContainer.innerHTML = `<div class="error">Error loading trashed notes: ${error.message}</div>`;
    }
}

/**
 * Display active notes in the UI container
 * @param {Object[]} notes - Array of note objects to display
 * @returns {void}
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
                <button class="btn btn-warning trash-btn" data-id="${note.id}">Move to Trash</button>
            </div>
        </div>
    `).join('');

    // Add event listeners using event delegation
    notesContainer.addEventListener('click', handleNoteActions);
}

/**
 * Display trashed notes in the UI container
 * @param {Object[]} notes - Array of trashed note objects to display
 * @returns {void}
 */
function displayTrashedNotes(notes) {
    if (notes.length === 0) {
        trashContainer.innerHTML = '<div class="no-notes">Trash is empty.</div>';
        return;
    }

    trashContainer.innerHTML = notes.map(note => {
        const trashedDate = new Date(note.deletedAt).toLocaleDateString();
        return `
            <div class="note-card trashed" data-id="${note.id}">
                <div class="note-meta">Moved to trash on ${trashedDate}</div>
                <h3>${escapeHtml(note.title)}</h3>
                <p>${escapeHtml(note.content)}</p>
                <div class="note-actions">
                    <button class="btn btn-primary restore-btn" data-id="${note.id}">Restore</button>
                    <button class="btn btn-danger permanent-delete-btn" data-id="${note.id}">Delete Permanently</button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners using event delegation
    trashContainer.addEventListener('click', handleTrashActions);
}

/**
 * Open the modal dialog for creating a new note
 * @returns {void}
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
        if (currentView === 'notes') {
            fetchNotes();
        }
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'creating'} note:`, error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Move a note to trash after user confirmation
 * @async
 * @param {string} id - The unique identifier of the note to move to trash
 * @returns {Promise<void>}
 * @throws {Error} When move to trash fails
 */
async function moveToTrash(id) {
    if (!confirm('Are you sure you want to move this note to trash?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to move note to trash');
        }

        fetchNotes();
    } catch (error) {
        console.error('Error moving note to trash:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Restore a note from trash
 * @async
 * @param {string} id - The unique identifier of the note to restore
 * @returns {Promise<void>}
 * @throws {Error} When restore fails
 */
async function restoreNote(id) {
    try {
        const response = await fetch(`${API_URL}/${id}/restore`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to restore note');
        }

        fetchTrashedNotes();
    } catch (error) {
        console.error('Error restoring note:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Permanently delete a note after user confirmation
 * @async
 * @param {string} id - The unique identifier of the note to permanently delete
 * @returns {Promise<void>}
 * @throws {Error} When permanent deletion fails
 */
async function permanentDeleteNote(id) {
    if (!confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}/permanent`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to permanently delete note');
        }

        fetchTrashedNotes();
    } catch (error) {
        console.error('Error permanently deleting note:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Handle clicks on note action buttons using event delegation
 * @param {Event} e - The click event on the notes container
 * @returns {void}
 */
function handleNoteActions(e) {
    const target = e.target;

    if (target.tagName === 'BUTTON' && target.dataset.id) {
        const noteId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            openEditNoteModal(noteId);
        } else if (target.classList.contains('trash-btn')) {
            moveToTrash(noteId);
        }
    }
}

/**
 * Handle clicks on trash action buttons using event delegation
 * @param {Event} e - The click event on the trash container
 * @returns {void}
 */
function handleTrashActions(e) {
    const target = e.target;

    if (target.tagName === 'BUTTON' && target.dataset.id) {
        const noteId = target.dataset.id;

        if (target.classList.contains('restore-btn')) {
            restoreNote(noteId);
        } else if (target.classList.contains('permanent-delete-btn')) {
            permanentDeleteNote(noteId);
        }
    }
}

/**
 * Escape HTML characters to prevent XSS attacks
 * @param {string} unsafe - The unsafe string that may contain HTML characters
 * @returns {string} The escaped string safe for HTML insertion
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
