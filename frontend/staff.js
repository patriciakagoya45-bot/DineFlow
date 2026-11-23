
const API = 'http://localhost:5000/api';

const staffForm = document.getElementById('staffForm');
const staffTable = document.getElementById('staffTable');
const staffMessage = document.getElementById('staffMessage');

let staffMembers = [];
let canManageStaff = false;

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    staffMessage.textContent = message;
    staffMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadStaff() {
    try {
        const account = await DineFlowAuth.currentAccount();
        canManageStaff = account.role === 'admin';
        document.getElementById('addStaffBtn').hidden = !canManageStaff;
        document.getElementById('staffForm').hidden = true;
        document.getElementById('staffActionsHeader').hidden = !canManageStaff;
        const result = await apiRequest('users');
        staffMembers = result.data || [];
        renderStaff();
    } catch (error) {
        showMessage(error.message, true);
        staffTable.textContent = 'Unable to load staff records.';
    }
}

function renderStaff() {
    staffTable.textContent = '';

    if (staffMembers.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent = 'No staff members registered.';

        row.appendChild(cell);
        staffTable.appendChild(row);
        return;
    }

    staffMembers.forEach(staff => {
        const row = document.createElement('tr');

        const values = [
            staff.name,
            staff.email,
            staff.role,
            staff.isActive ? 'Active' : 'Inactive'
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        if (canManageStaff) {
            const actions = document.createElement('td');

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'action-button edit-button';
            editButton.addEventListener('click', () => editStaff(staff._id));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'action-button delete-button';
            deleteButton.addEventListener('click', () => deleteStaff(staff._id));

            actions.append(editButton, deleteButton);
            row.appendChild(actions);
        }

        staffTable.appendChild(row);
    });
}

function openForm() {
    staffForm.hidden = false;
    staffForm.reset();

    document.getElementById('staffId').value = '';
    document.getElementById('formTitle').textContent =
        'Register Staff Member';

    document.getElementById('password').required = true;
    document.getElementById('password').value = '';
    document.getElementById('passwordHint').textContent =
        'Password is required when registering a new employee.';

    document.getElementById('isActive').value = 'true';
}

function closeForm() {
    staffForm.hidden = true;
    staffForm.reset();
}

function editStaff(id) {
    const staff = staffMembers.find(item => item._id === id);

    if (!staff) return;

    staffForm.hidden = false;

    document.getElementById('formTitle').textContent =
        'Update Staff Member';

    document.getElementById('staffId').value = staff._id;
    document.getElementById('name').value = staff.name;
    document.getElementById('email').value = staff.email;
    document.getElementById('role').value = staff.role;
    document.getElementById('isActive').value =
        String(staff.isActive !== false);

    document.getElementById('password').value = '';
    document.getElementById('password').required = false;
    document.getElementById('passwordHint').textContent =
        'Leave blank to keep the existing password.';

    staffForm.scrollIntoView({ behavior: 'smooth' });
}

staffForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = document.getElementById('staffId').value;
    const password = document.getElementById('password').value;

    const staffData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        role: document.getElementById('role').value,
        isActive: document.getElementById('isActive').value === 'true'
    };

    if (password) {
        staffData.password = password;
    }

    try {
        if (id) {
            await apiRequest(`users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(staffData)
            });

            showMessage('Staff member updated successfully.');
        } else {
            await apiRequest('users', {
                method: 'POST',
                body: JSON.stringify(staffData)
            });

            showMessage('Staff member registered successfully.');
        }

        closeForm();
        await loadStaff();

    } catch (error) {
        showMessage(error.message, true);
    }
});

async function deleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff account?')) {
        return;
    }

    try {
        await apiRequest(`users/${id}`, {
            method: 'DELETE'
        });

        showMessage('Staff account deleted successfully.');
        await loadStaff();

    } catch (error) {
        showMessage(error.message, true);
    }
}

document.getElementById('addStaffBtn')
    .addEventListener('click', openForm);

document.getElementById('cancelBtn')
    .addEventListener('click', closeForm);

loadStaff();
