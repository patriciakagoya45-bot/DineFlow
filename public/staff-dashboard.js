const staffCurrency = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0
});

const staffOrdersTable = document.getElementById('staffOrders');
const staffMessage = document.getElementById('staffDashboardMessage');
let staffAccountId = '';
let currentStaffRole = '';

function staffCell(value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    return cell;
}

function renderStaffOrders(orders) {
    staffOrdersTable.replaceChildren();
    if (!orders.length) {
        const row = document.createElement('tr');
        const cell = staffCell(currentStaffRole === 'chef'
            ? 'No orders are waiting for the kitchen.'
            : 'No orders are waiting for service.');
        cell.colSpan = currentStaffRole === 'chef' ? 7 : 10;
        row.appendChild(cell);
        staffOrdersTable.appendChild(row);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        const dishSummary = (order.items || [])
            .map(item => `${item.name} × ${item.quantity}`)
            .join(', ');
        const date = order.createdAt
            ? new Date(order.createdAt).toLocaleString()
            : '—';

        row.appendChild(staffCell(order.orderNumber || '—'));
        if (currentStaffRole !== 'chef') {
            row.appendChild(staffCell(order.customer?.phone
                ? `${order.customer.name} (${order.customer.phone})`
                : order.customer?.name || 'Walk-in customer'));
        }
        row.append(
            staffCell(order.tableNumber || '—'),
            staffCell(String(order.guestCount || 1)),
            staffCell(dishSummary || '—'),
            staffCell(order.notes || '—')
        );
        if (currentStaffRole !== 'chef') {
            row.append(
                staffCell(staffCurrency.format(Number(order.totalAmount) || 0)),
                staffCell(order.paymentMethod || '—')
            );
        }

        const statusCell = document.createElement('td');
        const statusLabel = document.createElement('span');
        statusLabel.className = `status ${order.status || 'pending'}`;
        statusLabel.textContent = order.status || 'pending';
        statusCell.appendChild(statusLabel);
        row.appendChild(statusCell);

        const actionCell = document.createElement('td');
        const servedById = order.servedBy?._id || order.servedBy;
        if (currentStaffRole === 'chef') {
            const nextStatus = order.status === 'pending'
                ? 'preparing'
                : order.status === 'preparing'
                    ? 'ready'
                    : '';
            if (nextStatus) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = nextStatus === 'ready' ? 'Mark ready' : 'Start preparation';
                button.addEventListener('click', () => updateOrderStatus(order._id, nextStatus));
                actionCell.appendChild(button);
            }
        } else if (currentStaffRole === 'waiter' && !servedById) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Take order';
            button.addEventListener('click', () => updateOrderStatus(order._id, order.status));
            actionCell.appendChild(button);
        } else if (currentStaffRole === 'waiter' && order.status === 'ready') {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Complete service';
            button.addEventListener('click', () => updateOrderStatus(order._id, 'completed'));
            actionCell.appendChild(button);
        } else {
            actionCell.textContent = order.servedBy?.name || 'Unassigned';
        }
        row.appendChild(actionCell);
        staffOrdersTable.appendChild(row);
    });
}

async function updateOrderStatus(id, status) {
    try {
        await DineFlowAuth.request(`orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        await loadStaffOrders();
    } catch (error) {
        staffMessage.textContent = error.message;
        staffMessage.classList.add('error');
    }
}

async function loadStaffOrders() {
    const refresh = document.getElementById('refreshStaffOrders');
    refresh.disabled = true;
    staffMessage.textContent = '';
    try {
        const result = await DineFlowAuth.request('orders');
        const orders = result.data || [];
        const assignedToStaff = orders.filter(order => {
            const servedById = order.servedBy?._id || order.servedBy;
            return String(servedById || '') === staffAccountId;
        });
        const openOrders = orders.filter(order => ['pending', 'preparing', 'ready'].includes(order.status));
        document.getElementById('staffOrderCount').textContent =
            (currentStaffRole === 'chef' ? orders.length : assignedToStaff.length).toLocaleString('en-UG');
        document.getElementById('staffOpenCount').textContent =
            (currentStaffRole === 'chef'
                ? orders.filter(order => order.status === 'ready').length
                : assignedToStaff.filter(order => openOrders.includes(order)).length).toLocaleString('en-UG');
        renderStaffOrders(orders);
    } catch (error) {
        staffMessage.textContent = error.message;
        staffMessage.classList.add('error');
    } finally {
        refresh.disabled = false;
    }
}

document.getElementById('refreshStaffOrders').addEventListener('click', loadStaffOrders);
document.addEventListener('DOMContentLoaded', async () => {
    const account = await DineFlowAuth.requireRole('staff');
    if (!account) return;
    staffAccountId = account.id;
    currentStaffRole = account.role;
    const chef = account.role === 'chef';
    const manager = ['admin', 'manager'].includes(account.role);
    document.getElementById('staffWelcome').textContent = chef
        ? 'Kitchen Dashboard'
        : manager ? 'Staff Overview' : 'Waiter Dashboard';
    document.getElementById('staffDescription').textContent = chef
        ? 'Prepare incoming orders and mark dishes ready to serve.'
        : manager
            ? 'Review staff assignments and active restaurant orders.'
            : 'Claim customer orders, view table details and complete service.';
    document.getElementById('firstStatLabel').textContent = chef ? 'Kitchen queue' : 'Orders assigned';
    document.getElementById('firstStatHint').textContent = chef ? 'Orders being prepared or ready' : 'Orders assigned to your account';
    document.getElementById('secondStatLabel').textContent = chef ? 'Ready to serve' : 'In progress';
    document.getElementById('secondStatHint').textContent = chef ? 'Orders finished by the kitchen' : 'Pending, preparing or ready';
    document.getElementById('ordersHeading').textContent = chef ? 'Kitchen Queue' : 'Service Orders';
    document.getElementById('ordersHint').textContent = chef
        ? 'Incoming dishes, quantities and special instructions. Customer and payment details are hidden.'
        : 'Unassigned customer orders can be claimed by an available waiter.';
    document.querySelectorAll('[data-waiter-only]').forEach(element => {
        element.hidden = chef;
    });
    await loadStaffOrders();
});