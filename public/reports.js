
function formatCurrency(amount) {
    return "UGX " + Number(amount || 0).toLocaleString("en-US");
}

async function fetchData(endpoint) {
    const result = await DineFlowAuth.request(endpoint);
    return result.data || [];
}

async function loadReports() {
    try {
        const [orders, payments] = await Promise.all([
            fetchData("orders"),
            fetchData("payments")
        ]);

        // Order statistics
        document.getElementById("totalOrders").textContent =
            orders.length;

        document.getElementById("completedOrders").textContent =
            orders.filter(order => order.status === "completed").length;

        document.getElementById("pendingOrders").textContent =
            orders.filter(order => order.status === "pending").length;

        // Only successful payment records count as revenue.
        const successfulPayments = payments.filter(
            payment => payment.paymentStatus === "successful"
        );

        const revenue = successfulPayments.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
        );

        document.getElementById("totalRevenue").textContent =
            formatCurrency(revenue);

        loadBestSellingItems(orders);
        loadPaymentSummary(successfulPayments);
        loadSalesChart(successfulPayments);

    } catch (error) {
        console.error("Reports error:", error);
        alert("Unable to load reports. Check that your backend is running.");
    }
}

// Best-selling menu items
function loadBestSellingItems(orders) {
    const sales = {};

    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const name =
                item.name ||
                item.menuItem?.name ||
                "Unknown Item";

            if (!sales[name]) {
                sales[name] = {
                    quantity: 0,
                    amount: 0
                };
            }

            const quantity = Number(item.quantity || 0);
            const price = Number(
                item.unitPrice || item.menuItem?.price || 0
            );

            sales[name].quantity += quantity;
            sales[name].amount += Number(
                item.subtotal || price * quantity
            );
        });
    });

    const sortedItems = Object.entries(sales)
        .sort((a, b) => b[1].quantity - a[1].quantity);

    const table = document.getElementById("bestSellingTable");

    if (sortedItems.length === 0) {
        table.innerHTML =
            '<tr><td colspan="3">No sales records available.</td></tr>';
        return;
    }

    table.innerHTML = sortedItems.map(([name, data]) => `
        <tr>
            <td>${escapeHTML(name)}</td>
            <td>${data.quantity}</td>
            <td>${formatCurrency(data.amount)}</td>
        </tr>
    `).join("");
}

// Payment method summary
function loadPaymentSummary(payments) {
    const summary = {};

    payments.forEach(payment => {
        const method = payment.paymentMethod || "Unknown";

        if (!summary[method]) {
            summary[method] = {
                count: 0,
                amount: 0
            };
        }

        summary[method].count++;
        summary[method].amount += Number(payment.amount || 0);
    });

    const table = document.getElementById("paymentSummary");

    const entries = Object.entries(summary);

    if (entries.length === 0) {
        table.innerHTML =
            '<tr><td colspan="3">No successful payments available.</td></tr>';
        return;
    }

    table.innerHTML = entries.map(([method, data]) => `
        <tr>
            <td>${escapeHTML(method)}</td>
            <td>${data.count}</td>
            <td>${formatCurrency(data.amount)}</td>
        </tr>
    `).join("");
}

// Seven-day sales chart
function loadSalesChart(payments) {
    const chart = document.getElementById("salesChart");
    const dailySales = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        dailySales.push({
            date,
            label: date.toLocaleDateString("en-US", {
                weekday: "short"
            }),
            amount: 0
        });
    }

    payments.forEach(payment => {
        const paymentDate = new Date(
            payment.paymentDate || payment.createdAt
        );

        if (Number.isNaN(paymentDate.getTime())) return;

        paymentDate.setHours(0, 0, 0, 0);

        const day = dailySales.find(
            item => item.date.getTime() === paymentDate.getTime()
        );

        if (day) {
            day.amount += Number(payment.amount || 0);
        }
    });

    const maxAmount = Math.max(
        ...dailySales.map(day => day.amount),
        1
    );

    chart.innerHTML = dailySales.map(day => {
        const height = (day.amount / maxAmount) * 150;

        return `
            <div class="chart-column">
                <span class="chart-value">
                    ${day.amount > 0
                        ? Math.round(day.amount / 1000) + "k"
                        : "0"}
                </span>

                <div class="chart-bar"
                     style="height: ${height}px"
                     title="${formatCurrency(day.amount)}">
                </div>

                <span class="chart-label">${day.label}</span>
            </div>
        `;
    }).join("");
}

// Escape text before inserting database values into HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

document.addEventListener("DOMContentLoaded", loadReports);
s