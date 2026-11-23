
const currencyFormatter = new Intl.NumberFormat('en-UG', {
    maximumFractionDigits: 0
});

async function fetchData(endpoint) {
    const result = await DineFlowAuth.request(endpoint);

    if (!Array.isArray(result.data)) {
        throw new Error(`${endpoint}: the server returned an invalid data list`);
    }

    return result;
}

function displayOrders(orders) {
    const table = document.getElementById('ordersTable');
    table.textContent = '';

    if (!orders || orders.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 6;
        cell.textContent = 'No orders found.';

        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    orders.slice(0, 10).forEach(order => {
        const row = document.createElement('tr');

        const customerName =
            order.customer?.name || 'Walk-in Customer';

        const values = [
            order.orderNumber || 'N/A',
            customerName,
            order.orderType || 'N/A',
            `UGX ${currencyFormatter.format(Number(order.totalAmount) || 0)}`,
            order.servedBy?.name || 'Self-service'
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        const statusLabel = document.createElement('span');

        const status = order.status || 'pending';

        statusLabel.textContent = status;
        statusLabel.className = `status ${status}`;

        statusCell.appendChild(statusLabel);
        row.appendChild(statusCell);

        table.appendChild(row);
    });
}

function isToday(value) {
    const date = new Date(value);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
}

function updateDailyMetrics(orders, payments) {
    const todayOrders = orders.filter(order => isToday(order.createdAt));
    const successfulPaymentsToday = payments.filter(payment =>
        payment.paymentStatus === 'successful' && isToday(payment.paymentDate)
    );
    const revenue = successfulPaymentsToday.reduce(
        (total, payment) => total + Number(payment.amount || 0), 0
    );
    const activeTables = new Set(orders
        .filter(order => order.orderType === 'dine-in' && order.tableNumber &&
            ['pending', 'preparing', 'ready'].includes(order.status))
        .map(order => order.tableNumber));
    const guestsServed = orders
        .filter(order => order.status === 'completed' && isToday(order.updatedAt || order.createdAt))
        .reduce((total, order) => total + Number(order.guestCount || 1), 0);

    document.getElementById('dailyRevenue').textContent =
        `UGX ${currencyFormatter.format(revenue)}`;
    document.getElementById('activeTables').textContent = activeTables.size.toLocaleString('en-UG');
    document.getElementById('guestsServed').textContent = guestsServed.toLocaleString('en-UG');
    document.getElementById('dailyOrders').textContent = todayOrders.length.toLocaleString('en-UG');
}

async function loadDashboard() {
    const refreshButton = document.getElementById('refreshBtn');
    const message = document.getElementById('dashboardMessage');

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = 'Loading...';
    }

    message.textContent = '';
    try {
        const endpoints = ['orders', 'menu-items', 'customers', 'payments'];
        const results = await Promise.allSettled(endpoints.map(fetchData));
        const [orders, menuItems, customers, payments] = results;
        const metricIds = [
            'totalOrders',
            'totalMenuItems',
            'totalCustomers',
            'totalPayments'
        ];

        results.forEach((result, index) => {
            document.getElementById(metricIds[index]).textContent =
                result.status === 'fulfilled'
                    ? result.value.data.length.toLocaleString('en-UG')
                    : '—';
        });

        if (orders.status === 'fulfilled') {
            displayOrders(orders.value.data);
        } else {
            document.getElementById('ordersTable').textContent =
                'Unable to load recent orders.';
        }

        if (orders.status === 'fulfilled' && payments.status === 'fulfilled') {
            updateDailyMetrics(orders.value.data, payments.value.data);
        }

        if (orders.status === 'fulfilled') {
            const settings = await DineFlowAuth.request('settings/floor').catch(() => null);
            if (settings?.data?.tableCount) {
                document.getElementById('tableCapacity').textContent =
                    `of ${settings.data.tableCount} configured tables`;
            }
        }

        const errors = results
            .filter(result => result.status === 'rejected')
            .map(result => result.reason.message);

        if (errors.length) {
            message.textContent =
                `Some dashboard data could not be loaded: ${errors.join('; ')}.`;
            message.classList.add('error');
        } else {
            message.textContent = 'Dashboard data is up to date.';
            message.classList.remove('error');
        }

    } catch (error) {
        console.error('Dashboard error:', error);
        message.textContent = error.message || 'Unable to load dashboard data.';
        message.classList.add('error');
        document.getElementById('ordersTable').textContent =
            'Unable to load recent orders. Check that the DineFlow API is running.';
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = 'Refresh Data';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const refreshButton = document.getElementById('refreshBtn');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadDashboard);
    }

    DineFlowAuth.currentAccount().then(account => {
        document.getElementById('dashboardName').textContent = account.name;
        document.getElementById('dashboardRole').textContent = account.role;
        document.getElementById('dashboardAvatar').textContent = account.name.slice(0, 1).toUpperCase();
    }).catch(() => {});

    loadDashboard();
});
