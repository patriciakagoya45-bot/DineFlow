const customerCurrency = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0
});
const customerOrdersTable = document.getElementById('customerOrders');

function customerTableCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

function renderCustomerOrders(orders) {
    customerOrdersTable.replaceChildren();
    if (!orders.length) {
        const row = document.createElement('tr');
        const cell = customerTableCell('You have not placed any orders yet.');
        cell.colSpan = 7;
        row.appendChild(cell);
        customerOrdersTable.appendChild(row);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        const dishes = (order.items || [])
            .map(item => `${item.name} × ${item.quantity}`)
            .join(', ');

        row.append(
            customerTableCell(order.orderNumber || '—'),
            customerTableCell(dishes || '—'),
            customerTableCell(customerCurrency.format(Number(order.totalAmount) || 0)),
            customerTableCell(`${order.paymentMethod || '—'} · ${order.paymentStatus || 'pending'}`)
        );
        const status = document.createElement('td');
        const statusLabel = document.createElement('span');
        statusLabel.className = `status ${order.status || 'pending'}`;
        statusLabel.textContent = order.status || 'pending';
        status.appendChild(statusLabel);
        row.append(
            status,
            customerTableCell(order.servedBy?.name || 'Self-service / awaiting staff'),
            customerTableCell(order.createdAt ? new Date(order.createdAt).toLocaleString() : '—')
        );
        customerOrdersTable.appendChild(row);
    });
}

async function loadCustomerOrders() {
    try {
        const result = await DineFlowAuth.request('orders');
        renderCustomerOrders(result.data || []);
    } catch (error) {
        customerOrdersTable.replaceChildren();
        const row = document.createElement('tr');
        const cell = customerTableCell(error.message);
        cell.colSpan = 7;
        row.appendChild(cell);
        customerOrdersTable.appendChild(row);
    }
}

document.getElementById('refreshCustomerOrders')
    .addEventListener('click', loadCustomerOrders);

async function loadCustomerProfile() {
    const result = await DineFlowAuth.request('customers/me');
    document.getElementById('profileName').value = result.data.name || '';
    document.getElementById('profilePhone').value = result.data.phone || '';
    document.getElementById('profileAddress').value = result.data.address || '';
}

document.getElementById('customerProfileForm').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('profileMessage');
    try {
        const result = await DineFlowAuth.request('customers/me', {
            method: 'PUT',
            body: JSON.stringify({
                name: document.getElementById('profileName').value.trim(),
                phone: document.getElementById('profilePhone').value.trim(),
                address: document.getElementById('profileAddress').value.trim()
            })
        });
        message.textContent = result.message;
        document.getElementById('customerName').textContent = result.data.name;
        document.getElementById('customerGreeting').textContent = `Welcome, ${result.data.name}`;
    } catch (error) {
        message.textContent = error.message;
    }
});

document.querySelector('[data-customer-logout]')
    .addEventListener('click', DineFlowAuth.signOut);
document.addEventListener('DOMContentLoaded', async () => {
    const account = await DineFlowAuth.requireRole('customer');
    if (!account) return;
    document.getElementById('customerName').textContent = account.name;
    document.getElementById('customerGreeting').textContent = `Welcome, ${account.name}`;
    await Promise.all([loadCustomerOrders(), loadCustomerProfile()]);
});
document.addEventListener('dineflow:order-created', loadCustomerOrders);