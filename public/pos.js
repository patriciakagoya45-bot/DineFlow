const currency = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0
});

const productGrid = document.getElementById('productGrid');
const categoryFilters = document.getElementById('categoryFilters');
const cartItems = document.getElementById('cartItems');
const posMessage = document.getElementById('posMessage');
const customerSelect = document.getElementById('customerSelect');
const searchInput = document.querySelector('.search-box input');
const isCustomer = document.body.dataset.accountType === 'customer';

let menuItems = [];
let customers = [];
let activeCategory = 'all';
const cart = new Map();

async function apiRequest(endpoint, options = {}) {
    return DineFlowAuth.request(endpoint, options);
}

function showMessage(message, isError = false) {
    posMessage.textContent = message;
    posMessage.classList.toggle('error', isError);
}

function getCategoryName(item) {
    if (item.category && typeof item.category === 'object') {
        return item.category.name || 'Uncategorized';
    }
    return 'Uncategorized';
}

function renderCategories() {
    const categories = [...new Set(menuItems.map(getCategoryName))];
    categoryFilters.replaceChildren();

    const filters = [{ label: 'All dishes', value: 'all' }]
        .concat(categories.map(name => ({ label: name, value: name })));

    filters.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `pill${activeCategory === category.value ? ' active' : ''}`;
        button.textContent = category.label;
        button.addEventListener('click', () => {
            activeCategory = category.value;
            renderCategories();
            renderMenu();
        });
        categoryFilters.appendChild(button);
    });
}

function renderMenu() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase();
    const visibleItems = menuItems.filter(item => {
        const matchesCategory =
            activeCategory === 'all' || getCategoryName(item) === activeCategory;
        const matchesSearch = `${item.name} ${item.description || ''} ${getCategoryName(item)}`
            .toLocaleLowerCase()
            .includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    productGrid.replaceChildren();
    if (!visibleItems.length) {
        const message = document.createElement('p');
        message.className = 'empty-menu';
        message.textContent = menuItems.length
            ? 'No dishes match your search.'
            : 'No available dishes yet. Add menu items in Menu Items.';
        productGrid.appendChild(message);
        return;
    }

    visibleItems.forEach(item => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `product-card${cart.has(item._id) ? ' selected' : ''}`;
        card.setAttribute('aria-pressed', String(cart.has(item._id)));
        card.setAttribute('aria-label', `Add ${item.name} to the order`);

        const imageArea = document.createElement('span');
        imageArea.className = 'product-image';
        if (item.image) {
            const image = document.createElement('img');
            image.src = item.image;
            image.alt = item.name;
            image.loading = 'lazy';
            image.addEventListener('error', () => {
                image.remove();
                imageArea.classList.add('image-fallback');
                imageArea.textContent = '🍽';
            }, { once: true });
            imageArea.appendChild(image);
        } else {
            imageArea.classList.add('image-fallback');
            imageArea.textContent = '🍽';
        }

        const info = document.createElement('span');
        info.className = 'product-info';

        const name = document.createElement('span');
        name.className = 'product-name';
        name.textContent = item.name;

        const details = document.createElement('span');
        details.className = 'product-details';
        details.textContent = getCategoryName(item);

        const price = document.createElement('span');
        price.className = 'price';
        price.textContent = currency.format(Number(item.price) || 0);

        info.append(name, details, price);
        card.append(imageArea, info);

        if (cart.has(item._id)) {
            const badge = document.createElement('span');
            badge.className = 'check-badge';
            badge.textContent = '✓';
            card.appendChild(badge);
        }

        card.addEventListener('click', () => {
            const current = cart.get(item._id);
            cart.set(item._id, current ? current + 1 : 1);
            renderMenu();
            renderCart();
            showMessage('');
        });

        productGrid.appendChild(card);
    });
}

function renderCart() {
    cartItems.replaceChildren();
    if (cart.size === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-cart';
        empty.textContent = 'Add dishes from the menu to start an order.';
        cartItems.appendChild(empty);
    }

    let subtotal = 0;
    cart.forEach((quantity, id) => {
        const item = menuItems.find(menuItem => menuItem._id === id);
        if (!item) return;

        const lineTotal = Number(item.price) * quantity;
        subtotal += lineTotal;

        const row = document.createElement('div');
        row.className = 'order-row';

        const name = document.createElement('div');
        name.className = 'item-name';
        name.textContent = item.name;

        const stepper = document.createElement('div');
        stepper.className = 'stepper';

        const decrement = document.createElement('button');
        decrement.type = 'button';
        decrement.textContent = '−';
        decrement.setAttribute('aria-label', `Remove one ${item.name}`);
        decrement.addEventListener('click', () => {
            if (quantity <= 1) {
                cart.delete(id);
            } else {
                cart.set(id, quantity - 1);
            }
            renderCart();
            renderMenu();
        });

        const quantityLabel = document.createElement('span');
        quantityLabel.textContent = String(quantity);

        const increment = document.createElement('button');
        increment.type = 'button';
        increment.textContent = '+';
        increment.setAttribute('aria-label', `Add one ${item.name}`);
        increment.addEventListener('click', () => {
            cart.set(id, quantity + 1);
            renderCart();
            renderMenu();
        });

        stepper.append(decrement, quantityLabel, increment);

        const price = document.createElement('div');
        price.className = 'row-price';
        price.textContent = currency.format(lineTotal);
        row.append(name, stepper, price);
        cartItems.appendChild(row);
    });

    document.getElementById('subtotalAmount').textContent = currency.format(subtotal);
    document.getElementById('totalAmount').textContent = currency.format(subtotal);
}

function updateOrderType() {
    const isDineIn = document.getElementById('orderType').value === 'dine-in';
    document.getElementById('tableField').hidden = !isDineIn;
}

async function createOrder() {
    if (cart.size === 0) {
        showMessage('Add at least one dish to the order.', true);
        return;
    }

    const customer = isCustomer ? undefined : customerSelect.value;
    if (!isCustomer && !customer) {
        showMessage('Select a customer first. Add one from the Customers page if needed.', true);
        return;
    }

    const orderType = document.getElementById('orderType').value;
    const tableNumber = document.getElementById('tableNumber').value.trim();
    const guestCount = Number(document.getElementById('guestCount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!Number.isInteger(guestCount) || guestCount < 1) {
        showMessage('Enter at least one guest.', true);
        return;
    }
    if (!paymentMethod) {
        showMessage('Choose a payment method before placing the order.', true);
        return;
    }
    if (orderType === 'dine-in' && !tableNumber) {
        showMessage('Enter a table number for dine-in orders.', true);
        return;
    }

    const button = document.getElementById('createOrderBtn');
    button.disabled = true;
    button.textContent = 'Creating...';
    try {
        const orderData = {
            orderType,
            tableNumber: orderType === 'dine-in' ? tableNumber : '',
            guestCount,
            paymentMethod,
            notes: document.getElementById('orderNotes').value.trim(),
            items: [...cart].map(([menuItem, quantity]) => ({ menuItem, quantity }))
        };
        if (!isCustomer) orderData.customer = customer;

        const result = await apiRequest('orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        cart.clear();
        document.getElementById('tableNumber').value = '';
        renderCart();
        renderMenu();
        showMessage(isCustomer
            ? 'Order placed. A waiter will claim it shortly; payment is pending until confirmed.'
            : `${result.message || 'Order created successfully.'} Payment is pending; open Orders to view it.`);
        document.dispatchEvent(new CustomEvent('dineflow:order-created'));
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = 'Create Order';
    }
}

async function initializePOS() {
    try {
        const account = await DineFlowAuth.requireRole(isCustomer ? 'customer' : 'staff');
        if (!account) return;

        const results = await Promise.all([
            apiRequest('menu-items'),
            isCustomer ? Promise.resolve(null) : apiRequest('customers')
        ]);
        const [menuResult, customerResult] = results;

        menuItems = (menuResult.data || [])
            .filter(item => item.availability === 'available');
        if (!isCustomer) {
            customers = customerResult.data || [];
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer._id;
                option.textContent = `${customer.name} (${customer.phone})`;
                customerSelect.appendChild(option);
            });
        }

        renderCategories();
        renderMenu();
        renderCart();
    } catch (error) {
        showMessage(error.message, true);
        productGrid.innerHTML = '';
        const message = document.createElement('p');
        message.className = 'empty-menu';
        message.textContent = 'Could not load menu and customers. Check that the DineFlow API is running.';
        productGrid.appendChild(message);
    }
}

searchInput.addEventListener('input', renderMenu);
document.getElementById('orderType').addEventListener('change', updateOrderType);
document.getElementById('createOrderBtn').addEventListener('click', createOrder);
document.getElementById('clearCartBtn').addEventListener('click', () => {
    cart.clear();
    renderCart();
    renderMenu();
    showMessage('Order cleared.');
});
const alertCloseButton = document.querySelector('.close-alert');
if (alertCloseButton) {
    alertCloseButton.addEventListener('click', () => {
        document.getElementById('stockAlert').hidden = true;
    });
}

updateOrderType();
initializePOS();
