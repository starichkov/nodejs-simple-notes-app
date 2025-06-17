// DOM Elements
const notesContainer = document.getElementById('notes-container');
const recycleBinContainer = document.getElementById('recycle-bin-container');
const createNoteBtn = document.getElementById('create-note-btn');
const noteModal = document.getElementById('note-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const cancelBtn = document.getElementById('cancel-btn');
const headerActions = document.querySelector('.header-actions');

// Tab elements
const notesTab = document.getElementById('notes-tab');
const recycleBinTab = document.getElementById('recycle-bin-tab');
const notesView = document.getElementById('notes-view');
const recycleBinView = document.getElementById('recycle-bin-view');

// Current view state
let currentView = 'notes';

// API Base URL
const API_URL = '/api/notes';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes();
    initializeTabs();
    updateRecycleBinCount(); // Initialize count on page load
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
    recycleBinTab.addEventListener('click', () => switchToView('recycleBin'));
}

/**
 * Fetch and update the recycle bin count in the tab
 * @async
 * @returns {Promise<void>}
 */
async function updateRecycleBinCount() {
    try {
        const response = await fetch(`${API_URL}/recycle-bin/count`);
        if (!response.ok) {
            throw new Error('Failed to fetch recycle bin count');
        }
        const data = await response.json();
        const count = data.count;

        // Update tab text with count
        if (count > 0) {
            recycleBinTab.textContent = `Recycle Bin (${count})`;
        } else {
            recycleBinTab.textContent = 'Recycle Bin';
        }

        // If we're in recycle bin view, update the Empty Recycle Bin button
        if (currentView === 'recycleBin') {
            addEmptyRecycleBinButton(count);
        }
    } catch (error) {
        console.error('Error fetching recycle bin count:', error);
        // Keep default text on error
        recycleBinTab.textContent = 'Recycle Bin';
    }
}

/**
 * Add the Empty Recycle Bin button to the header actions
 * @param {number} count - The number of notes in the recycle bin
 * @returns {void}
 */
function addEmptyRecycleBinButton(count) {
    // Remove existing button if it exists
    const existingBtn = document.getElementById('empty-recycle-bin-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // Only add the button if there are notes to delete
    if (count > 0) {
        const emptyBinButton = document.createElement('button');
        emptyBinButton.id = 'empty-recycle-bin-btn';
        emptyBinButton.className = 'btn btn-danger';
        emptyBinButton.textContent = `Empty Recycle Bin (${count})`;
        emptyBinButton.addEventListener('click', emptyRecycleBin);

        // Add to header actions
        headerActions.appendChild(emptyBinButton);
    }
}

/**
 * Switch between notes and recycle bin views
 * @param {string} view - The view to switch to ('notes' or 'recycleBin')
 * @returns {void}
 */
function switchToView(view) {
    currentView = view;

    // Update tab active states
    if (view === 'notes') {
        notesTab.classList.add('active');
        recycleBinTab.classList.remove('active');
        notesView.classList.add('active');
        recycleBinView.classList.remove('active');
        createNoteBtn.style.display = 'block';
        // Remove Empty Recycle Bin button if it exists
        const emptyBinBtn = document.getElementById('empty-recycle-bin-btn');
        if (emptyBinBtn) {
            emptyBinBtn.remove();
        }
        fetchNotes();
    } else {
        recycleBinTab.classList.add('active');
        notesTab.classList.remove('active');
        recycleBinView.classList.add('active');
        notesView.classList.remove('active');
        createNoteBtn.style.display = 'none';
        fetchDeletedNotes();
        // Get the count of deleted notes to add the Empty Recycle Bin button
        fetch(`${API_URL}/recycle-bin/count`)
            .then(response => response.json())
            .then(data => {
                addEmptyRecycleBinButton(data.count);
            })
            .catch(error => console.error('Error fetching recycle bin count:', error));
    }
    // Update count whenever switching views
    updateRecycleBinCount();
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
 * Fetch all deleted notes from the API and display them in the UI
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When API request fails or response is not ok
 */
async function fetchDeletedNotes() {
    try {
        const response = await fetch(`${API_URL}/recycle-bin`);
        if (!response.ok) {
            throw new Error('Failed to fetch deleted notes');
        }
        const notes = await response.json();
        displayDeletedNotes(notes);
    } catch (error) {
        console.error('Error fetching deleted notes:', error);
        recycleBinContainer.innerHTML = `<div class="error">Error loading deleted notes: ${error.message}</div>`;
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
                <button class="btn btn-warning delete-btn" data-id="${note.id}">Move to Recycle Bin</button>
            </div>
        </div>
    `).join('');

    // Add event listeners using event delegation
    notesContainer.addEventListener('click', handleNoteActions);
}

/**
 * Display deleted notes in the UI container
 * @param {Object[]} notes - Array of deleted note objects to display
 * @returns {void}
 */
function displayDeletedNotes(notes) {
    if (notes.length === 0) {
        recycleBinContainer.innerHTML = '<div class="no-notes">Recycle Bin is empty.</div>';
        return;
    }

    const notesHTML = notes.map(note => {
        const deletedDate = new Date(note.deletedAt).toLocaleDateString();
        return `
            <div class="note-card deleted" data-id="${note.id}">
                <div class="note-meta">Moved to Recycle Bin on ${deletedDate}</div>
                <h3>${escapeHtml(note.title)}</h3>
                <p>${escapeHtml(note.content)}</p>
                <div class="note-actions">
                    <button class="btn btn-primary restore-btn" data-id="${note.id}">Restore</button>
                    <button class="btn btn-danger permanent-delete-btn" data-id="${note.id}">Delete Permanently</button>
                </div>
            </div>
        `;
    }).join('');

    recycleBinContainer.innerHTML = notesHTML;

    // Add event listeners using event delegation
    recycleBinContainer.addEventListener('click', handleRecycleBinActions);

    // Update the Empty Recycle Bin button in the header
    addEmptyRecycleBinButton(notes.length);
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
 * Move a note to recycle bin after user confirmation
 * @async
 * @param {string} id - The unique identifier of the note to move to recycle bin
 * @returns {Promise<void>}
 * @throws {Error} When move to recycle bin fails
 */
async function moveToRecycleBin(id) {
    if (!confirm('Are you sure you want to move this note to recycle bin?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to move note to recycle bin');
        }

        fetchNotes();
        updateRecycleBinCount(); // Update count after moving to recycle bin
    } catch (error) {
        console.error('Error moving note to recycle bin:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Restore a note from recycle bin
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

        fetchDeletedNotes();
        updateRecycleBinCount(); // Update count after restore
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

        fetchDeletedNotes();
        updateRecycleBinCount(); // Update count after permanent deletion
    } catch (error) {
        console.error('Error permanently deleting note:', error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Empty the recycle bin by permanently deleting all deleted notes
 * @async
 * @returns {Promise<void>}
 * @throws {Error} When empty recycle bin fails
 */
async function emptyRecycleBin() {
    if (!confirm('Are you sure you want to permanently delete ALL notes in the recycle bin? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/recycle-bin`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to empty recycle bin');
        }

        const data = await response.json();
        alert(`Successfully deleted ${data.deletedCount} notes from recycle bin.`);

        fetchDeletedNotes();
        updateRecycleBinCount(); // Update count after emptying
    } catch (error) {
        console.error('Error emptying recycle bin:', error);
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
        } else if (target.classList.contains('delete-btn')) {
            moveToRecycleBin(noteId);
        }
    }
}

/**
 * Handle clicks on recycle bin action buttons using event delegation
 * @param {Event} e - The click event on the recycle bin container
 * @returns {void}
 */
function handleRecycleBinActions(e) {
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
