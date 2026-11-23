
const API = '/api';

const paymentForm = document.getElementById('paymentForm');
const paymentTable = document.getElementById('paymentTable');
const paymentMessage = document.getElementById('paymentMessage');

let orders = [];
let payments = [];
let paymentRole = '';

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    paymentMessage.textContent = message;
    paymentMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadOrders() {
    const result = await apiRequest('orders');
    orders = (result.data || []).filter(order => !order.paymentStatus);

    const orderSelect = document.getElementById('order');
    orderSelect.innerHTML = '<option value="">Choose Order</option>';

    orders.forEach(order => {
        const option = document.createElement('option');
        option.value = order._id;
        option.textContent =
            `${order.orderNumber} - UGX ${Number(order.totalAmount).toLocaleString('en-UG')}`;
        orderSelect.appendChild(option);
    });
}

async function loadPayments() {
    try {
        const result = await apiRequest('payments');
        payments = result.data || [];
        renderPayments();
    } catch (error) {
        showMessage(error.message, true);
        paymentTable.textContent = 'Unable to load payments.';
    }
}

function renderPayments() {
    paymentTable.textContent = '';

    if (payments.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.textContent = 'No payment records found.';
        row.appendChild(cell);
        paymentTable.appendChild(row);
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');

        const orderNumber =
            payment.order?.orderNumber || 'Order unavailable';

        const values = [
            orderNumber,
            `UGX ${Number(payment.amount).toLocaleString('en-UG')}`,
            payment.paymentMethod,
            payment.transactionReference || 'N/A'
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        const statusSelect = document.createElement('select');

        const availableStatuses = paymentRole === 'waiter'
            ? ['pending', 'successful', 'failed']
            : ['pending', 'successful', 'failed', 'refunded'];
        availableStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });

        statusSelect.value = payment.paymentStatus;

        statusSelect.addEventListener('change', () => {
            updatePaymentStatus(payment._id, statusSelect.value);
        });

        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        const actionsCell = document.createElement('td');
        if (['admin', 'manager'].includes(paymentRole)) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'action-button delete-button';
            deleteButton.addEventListener('click', () => deletePayment(payment._id));
            actionsCell.appendChild(deleteButton);
        }
        row.appendChild(actionsCell);

        paymentTable.appendChild(row);
    });
}

function openForm() {
    paymentForm.hidden = false;
    paymentForm.reset();
    document.getElementById('formTitle').textContent =
        'Record New Payment';
}

function closeForm() {
    paymentForm.hidden = true;
    paymentForm.reset();
}

document.getElementById('order').addEventListener('change', event => {
    const selectedOrder = orders.find(
        order => order._id === event.target.value
    );

    document.getElementById('amount').value =
        selectedOrder ? selectedOrder.totalAmount : '';
});

paymentForm.addEventListener('submit', async event => {
    event.preventDefault();

    const paymentData = {
        order: document.getElementById('order').value,
        amount: Number(document.getElementById('amount').value),
        paymentMethod: document.getElementById('paymentMethod').value,
        transactionReference:
            document.getElementById('transactionReference').value.trim(),
        paymentStatus: document.getElementById('paymentStatus').value
    };

    if (!paymentData.order) {
        showMessage('Please select an order.', true);
        return;
    }

    try {
        await apiRequest('payments', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });

        showMessage('Payment record created successfully.');
        closeForm();
        await loadPayments();

    } catch (error) {
        showMessage(error.message, true);
    }
});

async function updatePaymentStatus(id, paymentStatus) {
    try {
        await apiRequest(`payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ paymentStatus })
        });

        showMessage('Payment status updated.');
        await loadPayments();

    } catch (error) {
        showMessage(error.message, true);
        await loadPayments();
    }
}

async function deletePayment(id) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }

    try {
        await apiRequest(`payments/${id}`, {
            method: 'DELETE'
        });

        showMessage('Payment record deleted.');
        await loadPayments();

    } catch (error) {
        showMessage(error.message, true);
    }
}

document.getElementById('addPaymentBtn')
    .addEventListener('click', openForm);

document.getElementById('cancelBtn')
    .addEventListener('click', closeForm);

async function initializePayments() {
    try {
        const account = await DineFlowAuth.currentAccount();
        paymentRole = account.role;
        if (paymentRole === 'waiter') {
            document.querySelectorAll('#paymentStatus option[value="refunded"]')
                .forEach(option => option.remove());
        }
        await loadOrders();
        await loadPayments();
    } catch (error) {
        showMessage(error.message, true);
    }
}

initializePayments();
