
const API = 'http://localhost:5000/api';

const customerForm = document.getElementById('customerForm');
const customerTable = document.getElementById('customerTable');
const customerMessage = document.getElementById('customerMessage');

let customers = [];

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    customerMessage.textContent = message;
    customerMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadCustomers() {
    try {
        const result = await apiRequest('customers');
        customers = result.data || [];
        renderCustomers();
    } catch (error) {
        showMessage(error.message, true);
        customerTable.textContent = 'Unable to load customers.';
    }
}

function renderCustomers() {
    customerTable.textContent = '';

    if (customers.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 6;
        cell.textContent = 'No customers registered yet.';

        row.appendChild(cell);
        customerTable.appendChild(row);
        return;
    }

    customers.forEach(customer => {
        const row = document.createElement('tr');

        const values = [
            customer.name,
            customer.phone,
            customer.email || 'Not provided',
            customer.address || 'Not provided',
            customer.loyaltyPoints ?? 0
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
        editButton.addEventListener('click', () =>
            editCustomer(customer._id)
        );

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'action-button delete-button';
        deleteButton.addEventListener('click', () =>
            deleteCustomer(customer._id)
        );

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        customerTable.appendChild(row);
    });
}

function openForm() {
    customerForm.hidden = false;
    customerForm.reset();

    document.getElementById('customerId').value = '';
    document.getElementById('formTitle').textContent =
        'Register New Customer';

    document.getElementById('loyaltyPoints').value = 0;
}

function closeForm() {
    customerForm.hidden = true;
    customerForm.reset();
}

function editCustomer(id) {
    const customer = customers.find(item => item._id === id);

    if (!customer) return;

    customerForm.hidden = false;

    document.getElementById('formTitle').textContent =
        'Update Customer';

    document.getElementById('customerId').value = customer._id;
    document.getElementById('name').value = customer.name;
    document.getElementById('phone').value = customer.phone;
    document.getElementById('email').value = customer.email || '';
    document.getElementById('address').value = customer.address || '';
    document.getElementById('loyaltyPoints').value =
        customer.loyaltyPoints ?? 0;

    customerForm.scrollIntoView({ behavior: 'smooth' });
}

customerForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = document.getElementById('customerId').value;

    const customerData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        loyaltyPoints: Number(
            document.getElementById('loyaltyPoints').value
        )
    };

    try {
        if (id) {
            await apiRequest(`customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customerData)
            });

            showMessage('Customer updated successfully.');
        } else {
            await apiRequest('customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });

            showMessage('Customer registered successfully.');
        }

        closeForm();
        await loadCustomers();

    } catch (error) {
        showMessage(error.message, true);
    }
});

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) {
        return;
    }

    try {
        await apiRequest(`customers/${id}`, {
            method: 'DELETE'
        });

        showMessage('Customer deleted successfully.');
        await loadCustomers();

    } catch (error) {
        showMessage(error.message, true);
    }
}

document.getElementById('addCustomerBtn')
    .addEventListener('click', openForm);

document.getElementById('cancelBtn')
    .addEventListener('click', closeForm);

loadCustomers();
