
const API = '/api';

const categoryForm = document.getElementById('categoryForm');
const categoryTable = document.getElementById('categoryTable');
const categoryMessage = document.getElementById('categoryMessage');

let categories = [];

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    categoryMessage.textContent = message;
    categoryMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadCategories() {
    try {
        const result = await apiRequest('categories');
        categories = result.data || [];
        renderCategories();
    } catch (error) {
        showMessage(error.message, true);
        categoryTable.textContent = 'Unable to load categories.';
    }
}

function renderCategories() {
    categoryTable.textContent = '';

    if (categories.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No categories found.';
        row.appendChild(cell);
        categoryTable.appendChild(row);
        return;
    }

    categories.forEach(category => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = category.name;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = category.description || 'No description';

        const statusCell = document.createElement('td');
        statusCell.textContent = category.isActive ? 'Active' : 'Inactive';

        const actionsCell = document.createElement('td');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'action-button edit-button';
        editButton.addEventListener('click', () => editCategory(category._id));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'action-button delete-button';
        deleteButton.addEventListener('click', () => deleteCategory(category._id));

        actionsCell.append(editButton, deleteButton);

        row.append(nameCell, descriptionCell, statusCell, actionsCell);
        categoryTable.appendChild(row);
    });
}

function openForm() {
    categoryForm.hidden = false;
    categoryForm.reset();

    document.getElementById('categoryId').value = '';
    document.getElementById('formTitle').textContent = 'Add New Category';
    document.getElementById('isActive').value = 'true';
}

function closeForm() {
    categoryForm.hidden = true;
    categoryForm.reset();
}

function editCategory(id) {
    const category = categories.find(item => item._id === id);

    if (!category) return;

    categoryForm.hidden = false;

    document.getElementById('formTitle').textContent = 'Update Category';
    document.getElementById('categoryId').value = category._id;
    document.getElementById('name').value = category.name;
    document.getElementById('description').value =
        category.description || '';
    document.getElementById('isActive').value =
        String(category.isActive !== false);

    categoryForm.scrollIntoView({ behavior: 'smooth' });
}

categoryForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = document.getElementById('categoryId').value;

    const categoryData = {
        name: document.getElementById('name').value.trim(),
        description: document.getElementById('description').value.trim(),
        isActive: document.getElementById('isActive').value === 'true'
    };

    try {
        if (id) {
            await apiRequest(`categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });

            showMessage('Category updated successfully.');
        } else {
            await apiRequest('categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });

            showMessage('Category created successfully.');
        }

        closeForm();
        await loadCategories();

    } catch (error) {
        showMessage(error.message, true);
    }
});

async function deleteCategory(id) {
    const confirmed = confirm(
        'Are you sure you want to delete this category?'
    );

    if (!confirmed) return;

    try {
        await apiRequest(`categories/${id}`, {
            method: 'DELETE'
        });

        showMessage('Category deleted successfully.');
        await loadCategories();

    } catch (error) {
        showMessage(error.message, true);
    }
}

document.getElementById('addCategoryBtn')
    .addEventListener('click', openForm);

document.getElementById('cancelBtn')
    .addEventListener('click', closeForm);

loadCategories();
