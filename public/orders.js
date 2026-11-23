
const API = '/api';

const orderForm = document.getElementById('orderForm');
const ordersTable = document.getElementById('ordersTable');
const orderItemsTable = document.getElementById('orderItemsTable');
const orderMessage = document.getElementById('orderMessage');

let customers = [];
let menuItems = [];

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    orderMessage.textContent = message;
    orderMessage.style.color = isError ? '#b42318' : 'var(--primary)';
}

async function loadFormData() {
    const [customerResult, menuResult] = await Promise.all([
        apiRequest('customers'),
        apiRequest('menu-items')
    ]);

    customers = customerResult.data || [];
    menuItems = (menuResult.data || []).filter(
        item => item.availability === 'available'
    );

    const customerSelect = document.getElementById('customer');
    customerSelect.innerHTML = '<option value="">Choose Customer</option>';

    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer._id;
        option.textContent = `${customer.name} - ${customer.phone}`;
        customerSelect.appendChild(option);
    });
}

function addOrderItemRow() {
    const row = document.createElement('tr');

    const itemCell = document.createElement('td');
    const itemSelect = document.createElement('select');
    itemSelect.className = 'order-item-select';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Dish';
    itemSelect.appendChild(defaultOption);

    menuItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item._id;
        option.textContent = item.name;
        itemSelect.appendChild(option);
    });

    itemCell.appendChild(itemSelect);

    const quantityCell = document.createElement('td');
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.value = '1';
    quantityInput.className = 'order-item-quantity';
    quantityCell.appendChild(quantityInput);

    const priceCell = document.createElement('td');
    const subtotalCell = document.createElement('td');

    const actionCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
        row.remove();
        calculateTotal();
    });

    actionCell.appendChild(removeButton);

    itemSelect.addEventListener('change', calculateTotal);
    quantityInput.addEventListener('input', calculateTotal);

    row.append(
        itemCell,
        quantityCell,
        priceCell,
        subtotalCell,
        actionCell
    );

    orderItemsTable.appendChild(row);
    calculateTotal();
}

function calculateTotal() {
    let total = 0;

    Array.from(orderItemsTable.rows).forEach(row => {
        const itemId = row.querySelector('.order-item-select').value;
        const quantity = Number(
            row.querySelector('.order-item-quantity').value
        );

        const item = menuItems.find(menuItem => menuItem._id === itemId);
        const price = item ? Number(item.price) : 0;
        const subtotal = price * quantity;

        row.cells[2].textContent =
            `UGX ${price.toLocaleString('en-UG')}`;

        row.cells[3].textContent =
            `UGX ${subtotal.toLocaleString('en-UG')}`;

        total += subtotal;
    });

    document.getElementById('orderTotal').textContent =
        `Total: UGX ${total.toLocaleString('en-UG')}`;
}

async function loadOrders() {
    try {
        const result = await apiRequest('orders');
        renderOrders(result.data || []);
    } catch (error) {
        showMessage(error.message, true);
        ordersTable.textContent = 'Unable to load orders.';
    }
}

function renderOrders(orders) {
    ordersTable.textContent = '';

    if (orders.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 10;
        cell.textContent = 'No orders recorded.';
        row.appendChild(cell);
        ordersTable.appendChild(row);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');

        const customerName =
            order.customer?.name || 'Unknown Customer';

        const values = [
            order.orderNumber,
            customerName,
            order.orderType,
            order.tableNumber || '—',
            String(order.guestCount || 1),
            `UGX ${Number(order.totalAmount).toLocaleString('en-UG')}`,
            order.paymentMethod || 'See payment record',
            order.servedBy?.name || 'Self-service'
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        const statusSelect = document.createElement('select');

        [
            'pending',
            'preparing',
            'ready',
            'completed',
            'cancelled'
        ].forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });

        statusSelect.value = order.status;
        statusSelect.addEventListener('change', () =>
            updateOrderStatus(order._id, statusSelect.value)
        );

        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        const actionCell = document.createElement('td');
        DineFlowAuth.currentAccount().then(account => {
            if (account.role === 'waiter' && !order.servedBy) {
                const claimButton = document.createElement('button');
                claimButton.textContent = 'Take order';
                claimButton.addEventListener('click', () => updateOrderStatus(order._id, order.status));
                actionCell.appendChild(claimButton);
            }
            if (['admin', 'manager'].includes(account.role)) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'action-button delete-button';
                deleteButton.addEventListener('click', () => deleteOrder(order._id));
                actionCell.appendChild(deleteButton);
            }
        });
        row.appendChild(actionCell);

        ordersTable.appendChild(row);
    });
}

async function updateOrderStatus(id, status) {
    try {
        await apiRequest(`orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        showMessage('Order status updated.');
        await loadOrders();

    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteOrder(id) {
    if (!confirm('Are you sure you want to delete this order?')) {
        return;
    }

    try {
        await apiRequest(`orders/${id}`, {
            method: 'DELETE'
        });

        showMessage('Order deleted successfully.');
        await loadOrders();

    } catch (error) {
        showMessage(error.message, true);
    }
}

function openOrderForm() {
    orderForm.hidden = false;
    orderForm.reset();
    orderItemsTable.textContent = '';
    calculateTotal();
}

function closeOrderForm() {
    orderForm.hidden = true;
    orderForm.reset();
    orderItemsTable.textContent = '';
    calculateTotal();
}

orderForm.addEventListener('submit', async event => {
    event.preventDefault();

    const items = Array.from(orderItemsTable.rows)
        .map(row => ({
            menuItem: row.querySelector('.order-item-select').value,
            quantity: Number(
                row.querySelector('.order-item-quantity').value
            )
        }))
        .filter(item => item.menuItem && item.quantity > 0);

    if (items.length === 0) {
        showMessage('Please add at least one menu item.', true);
        return;
    }

    const orderType = document.getElementById('orderType').value;
    const tableNumber = document.getElementById('tableNumber').value.trim();
    const guestCount = Number(document.getElementById('guestCount').value);

    if (orderType === 'dine-in' && !tableNumber) {
        showMessage('Please enter a table number for dine-in.', true);
        return;
    }

    const orderData = {
        customer: document.getElementById('customer').value,
        orderType,
        tableNumber,
        guestCount,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value.trim(),
        items
    };

    if (!orderData.customer) {
        showMessage('Please select a customer.', true);
        return;
    }

    try {
        await apiRequest('orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        showMessage('Order created successfully.');
        closeOrderForm();
        await loadOrders();

    } catch (error) {
        showMessage(error.message, true);
    }
});

document.getElementById('addOrderBtn')
    .addEventListener('click', openOrderForm);

document.getElementById('cancelOrderBtn')
    .addEventListener('click', closeOrderForm);

document.getElementById('addOrderItemBtn')
    .addEventListener('click', addOrderItemRow);

async function initializeOrders() {
    try {
        await loadFormData();
        await loadOrders();
    } catch (error) {
        showMessage(error.message, true);
    }
}

initializeOrders();
