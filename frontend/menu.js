
const API = '/api';

const menuTable = document.getElementById('menuTable');
const menuForm = document.getElementById('menuForm');
const menuMessage = document.getElementById('menuMessage');

let menuItems = [];
let categories = [];

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    menuMessage.textContent = message;
    menuMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadCategories() {
    const result = await apiRequest('categories');
    categories = result.data || [];

    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">Select Category</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category._id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

async function loadMenuItems() {
    try {
        const result = await apiRequest('menu-items');
        menuItems = result.data || [];
        renderMenuItems();
    } catch (error) {
        showMessage(error.message, true);
        menuTable.textContent = 'Unable to load menu items.';
    }
}

function renderMenuItems() {
    menuTable.textContent = '';

    if (menuItems.length === 0) {
        menuTable.innerHTML =
            '<tr><td colspan="7">No menu items found.</td></tr>';
        return;
    }

    menuItems.forEach(item => {
        const row = document.createElement('tr');

        const imageCell = document.createElement('td');
        if (item.image) {
            const image = document.createElement('img');
            image.className = 'menu-thumbnail';
            image.src = item.image;
            image.alt = item.name;
            image.loading = 'lazy';
            imageCell.appendChild(image);
        } else {
            imageCell.textContent = '—';
        }
        row.appendChild(imageCell);

        const categoryName =
            typeof item.category === 'object'
                ? item.category?.name || 'Uncategorized'
                : 'Uncategorized';

        const values = [
            item.name,
            categoryName,
            `UGX ${Number(item.price).toLocaleString('en-UG')}`,
            `${item.preparationTime || 0} minutes`,
            item.availability || 'available'
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement('td');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'action-button edit-button';
        editButton.addEventListener('click', () => editMenuItem(item._id));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'action-button delete-button';
        deleteButton.addEventListener('click', () => deleteMenuItem(item._id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        menuTable.appendChild(row);
    });
}

function openForm() {
    menuForm.hidden = false;
    document.getElementById('formTitle').textContent = 'Add New Menu Item';
    document.getElementById('menuItemId').value = '';
    menuForm.reset();
    document.getElementById('image').value = '';
    document.getElementById('imagePreview').hidden = true;
    document.getElementById('imageUploadMessage').textContent = 'JPG, PNG, WEBP or GIF, up to 5 MB.';
}

function closeForm() {
    menuForm.hidden = true;
    menuForm.reset();
    document.getElementById('imagePreview').hidden = true;
}

function editMenuItem(id) {
    const item = menuItems.find(menuItem => menuItem._id === id);

    if (!item) return;

    menuForm.hidden = false;
    document.getElementById('formTitle').textContent = 'Update Menu Item';

    document.getElementById('menuItemId').value = item._id;
    document.getElementById('name').value = item.name;
    document.getElementById('description').value = item.description || '';
    document.getElementById('image').value = item.image || '';
    const preview = document.getElementById('imagePreview');
    preview.src = item.image || '';
    preview.hidden = !item.image;
    document.getElementById('category').value =
        typeof item.category === 'object'
            ? item.category?._id || ''
            : item.category || '';
    document.getElementById('price').value = item.price;
    document.getElementById('preparationTime').value =
        item.preparationTime || 20;
    document.getElementById('availability').value =
        item.availability || 'available';

    menuForm.scrollIntoView({ behavior: 'smooth' });
}

menuForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = document.getElementById('menuItemId').value;

    const menuData = {
        name: document.getElementById('name').value.trim(),
        description: document.getElementById('description').value.trim(),
        image: document.getElementById('image').value.trim(),
        category: document.getElementById('category').value,
        price: Number(document.getElementById('price').value),
        preparationTime: Number(
            document.getElementById('preparationTime').value
        ),
        availability: document.getElementById('availability').value
    };

    try {
        if (id) {
            await apiRequest(`menu-items/${id}`, {
                method: 'PUT',
                body: JSON.stringify(menuData)
            });
            showMessage('Menu item updated successfully.');
        } else {
            await apiRequest('menu-items', {
                method: 'POST',
                body: JSON.stringify(menuData)
            });
            showMessage('Menu item added successfully.');
        }

        closeForm();
        await loadMenuItems();

    } catch (error) {
        showMessage(error.message, true);
    }
});

async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) {
        return;
    }

    try {
        await apiRequest(`menu-items/${id}`, {
            method: 'DELETE'
        });

        showMessage('Menu item deleted successfully.');
        await loadMenuItems();

    } catch (error) {
        showMessage(error.message, true);
    }
}

document.getElementById('addMenuBtn')
    .addEventListener('click', openForm);

document.getElementById('imageFile').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    const message = document.getElementById('imageUploadMessage');
    const formData = new FormData();
    formData.append('image', file);
    message.textContent = 'Uploading image...';
    try {
        const result = await apiRequest('menu-items/upload-image', {
            method: 'POST',
            body: formData
        });
        document.getElementById('image').value = result.data.image;
        const preview = document.getElementById('imagePreview');
        preview.src = result.data.image;
        preview.hidden = false;
        message.textContent = 'Image uploaded.';
    } catch (error) {
        message.textContent = error.message;
        showMessage(error.message, true);
        event.target.value = '';
    }
});

document.getElementById('cancelBtn')
    .addEventListener('click', closeForm);

async function initializeMenu() {
    try {
        await loadCategories();
        await loadMenuItems();
    } catch (error) {
        showMessage(error.message, true);
    }
}

initializeMenu();
