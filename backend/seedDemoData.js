require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Customer = require('./models/Customer');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const User = require('./models/User');

const staffProfiles = [
    { name: 'Demo Alex Morgan', role: 'waiter' },
    { name: 'Demo Jamie Patel', role: 'chef' },
    { name: 'Demo Taylor Kim', role: 'manager' },
    { name: 'Demo Casey Rivera', role: 'waiter' }
];

const customerProfiles = [
    ['Jordan Lee', 'jordan.lee'],
    ['Morgan Reed', 'morgan.reed'],
    ['Riley Adams', 'riley.adams'],
    ['Avery Brooks', 'avery.brooks'],
    ['Quinn Parker', 'quinn.parker'],
    ['Drew Bennett', 'drew.bennett'],
    ['Skyler James', 'skyler.james'],
    ['Emerson Clark', 'emerson.clark'],
    ['Rowan Ellis', 'rowan.ellis'],
    ['Finley Gray', 'finley.gray']
];

const menuProfiles = [
    { name: 'Demo Garden Bowl', price: 18000 },
    { name: 'Demo Grilled Chicken', price: 26000 },
    { name: 'Demo Beef Wrap', price: 22000 },
    { name: 'Demo Veggie Pasta', price: 20000 },
    { name: 'Demo Mango Juice', price: 8000 }
];

const catalogProfiles = [
    {
        category: 'Main Dishes',
        items: [
            {
                name: 'Pan-Seared Tilapia',
                description: 'Tilapia fillet served with seasoned vegetables and rice.',
                price: 32000,
                preparationTime: 25
            },
            {
                name: 'Beef Pilau',
                description: 'Fragrant spiced rice with tender beef and kachumbari.',
                price: 24000,
                preparationTime: 30
            },
            {
                name: 'Chicken Shawarma Plate',
                description: 'Grilled chicken, flatbread, fresh salad, and garlic sauce.',
                price: 28000,
                preparationTime: 20
            }
        ]
    },
    {
        category: 'Drinks',
        items: [
            {
                name: 'Fresh Passion Juice',
                description: 'Freshly blended passion fruit juice.',
                price: 7000,
                preparationTime: 5
            },
            {
                name: 'Iced Hibiscus Tea',
                description: 'Chilled hibiscus tea with a hint of citrus.',
                price: 6000,
                preparationTime: 5
            },
            {
                name: 'Tropical Lemonade',
                description: 'Lemonade with pineapple and a touch of mint.',
                price: 8000,
                preparationTime: 5
            }
        ]
    },
    {
        category: 'Smoothies',
        items: [
            {
                name: 'Mango Pineapple Smoothie',
                description: 'Mango and pineapple blended until smooth.',
                price: 11000,
                preparationTime: 7
            },
            {
                name: 'Avocado Banana Smoothie',
                description: 'Creamy avocado and banana smoothie.',
                price: 12000,
                preparationTime: 7
            },
            {
                name: 'Berry Yogurt Smoothie',
                description: 'Mixed berries blended with chilled yogurt.',
                price: 13000,
                preparationTime: 7
            }
        ]
    },
    {
        category: 'Desserts',
        items: [
            {
                name: 'Chocolate Fudge Cake',
                description: 'Rich chocolate cake served with chocolate sauce.',
                price: 14000,
                preparationTime: 5
            },
            {
                name: 'Vanilla Cheesecake',
                description: 'Baked vanilla cheesecake with a biscuit crust.',
                price: 15000,
                preparationTime: 5
            },
            {
                name: 'Caramel Banana Sundae',
                description: 'Vanilla ice cream topped with banana and caramel.',
                price: 12000,
                preparationTime: 5
            }
        ]
    }
];

async function ensureStaff() {
    const staff = [];

    for (let index = 0; index < staffProfiles.length; index += 1) {
        const profile = staffProfiles[index];
        const email = `demo.staff.${index + 1}@example.invalid`;
        let user = await User.findOne({ email });

        if (!user) {
            const unusablePassword = crypto.randomBytes(32).toString('hex');
            const password = await bcrypt.hash(unusablePassword, 12);

            user = await User.create({
                ...profile,
                email,
                password,
                isActive: false
            });
        }

        staff.push(user);
    }

    return staff;
}

async function ensureCustomers() {
    const customers = [];

    for (let index = 0; index < customerProfiles.length; index += 1) {
        const [name, emailName] = customerProfiles[index];
        const phone = `000000${String(index + 1).padStart(4, '0')}`;
        const email = `${emailName}@example.invalid`;
        let customer = await Customer.findOne({ phone });

        if (!customer) {
            customer = await Customer.create({ name, phone, email });
        }

        customers.push(customer);
    }

    return customers;
}

async function ensureMenuItems() {
    let category = await Category.findOne({ name: 'Demo Menu' });
    if (!category) {
        category = await Category.create({
            name: 'Demo Menu',
            description: 'Sample category created for demonstration data.'
        });
    }

    const menuItems = [];
    for (const profile of menuProfiles) {
        let menuItem = await MenuItem.findOne({ name: profile.name });

        if (!menuItem) {
            menuItem = await MenuItem.create({
                ...profile,
                category: category._id,
                availability: 'available'
            });
        }

        menuItems.push(menuItem);
    }

    return menuItems;
}

async function ensureCatalogItems() {
    let itemCount = 0;

    for (const group of catalogProfiles) {
        let category = await Category.findOne({ name: group.category });

        if (!category) {
            category = await Category.create({
                name: group.category,
                description: `Menu items for ${group.category.toLowerCase()}.`
            });
        }

        for (const profile of group.items) {
            const existingItem = await MenuItem.findOne({
                name: profile.name,
                category: category._id
            });

            if (!existingItem) {
                await MenuItem.create({
                    ...profile,
                    category: category._id,
                    availability: 'available'
                });
            }

            itemCount += 1;
        }
    }

    return itemCount;
}

async function ensureOrders(customers, menuItems, staff) {
    const orders = [];
    const orderTypes = ['dine-in', 'takeaway', 'delivery'];
    const statuses = ['completed', 'preparing', 'ready', 'pending'];

    for (let index = 0; index < 10; index += 1) {
        const orderNumber = `DEMO-${String(index + 1).padStart(4, '0')}`;
        let order = await Order.findOne({ orderNumber });

        if (!order) {
            const menuItem = menuItems[index % menuItems.length];
            const quantity = (index % 3) + 1;
            const subtotal = menuItem.price * quantity;

            order = await Order.create({
                orderNumber,
                customer: customers[index]._id,
                servedBy: staff[index % staff.length]._id,
                items: [{
                    menuItem: menuItem._id,
                    name: menuItem.name,
                    quantity,
                    unitPrice: menuItem.price,
                    subtotal
                }],
                totalAmount: subtotal,
                orderType: orderTypes[index % orderTypes.length],
                tableNumber: index % orderTypes.length === 0
                    ? String((index % 12) + 1)
                    : undefined,
                status: statuses[index % statuses.length],
                notes: 'Demo order'
            });
        }

        orders.push(order);
    }

    return orders;
}

async function ensurePayments(orders) {
    const methods = ['cash', 'mobile-money', 'card', 'bank-transfer'];
    const statuses = ['successful', 'successful', 'pending', 'failed'];

    for (let index = 0; index < 8; index += 1) {
        const transactionReference =
            `DEMO-PAY-${String(index + 1).padStart(4, '0')}`;
        const exists = await Payment.exists({ transactionReference });

        if (!exists) {
            await Payment.create({
                order: orders[index]._id,
                amount: orders[index].totalAmount,
                paymentMethod: methods[index % methods.length],
                transactionReference,
                paymentStatus: statuses[index % statuses.length]
            });
        }
    }
}

async function seedDemoData() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from the .env file.');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const staff = await ensureStaff();
    const customers = await ensureCustomers();
    const menuItems = await ensureMenuItems();
    const catalogItemCount = await ensureCatalogItems();
    const orders = await ensureOrders(customers, menuItems, staff);
    await ensurePayments(orders);

    console.log(
        `Demo data is ready: 10 orders, 8 payments, 4 inactive staff members, and ${catalogItemCount} categorized menu items.`
    );
}

seedDemoData()
    .catch(error => {
        console.error(`Unable to seed demo data: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
