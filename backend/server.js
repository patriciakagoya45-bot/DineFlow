
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');

const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const customerRoutes = require('./routes/customerRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Homepage
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to DineFlow Restaurant Management System',
        status: 'Backend is running successfully'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'DineFlow API is healthy'
    });
});

const PORT = process.env.PORT || 5000;

// Start local server
const startServer = async () => {
    try {
        console.log('Checking MongoDB configuration...');

        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing');
        }

        await connectDB();

        app.listen(PORT, () => {
            console.log(`DineFlow Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start DineFlow:', error.message);
        process.exit(1);
    }
};

// Only start the server when running this file directly
if (require.main === module) {
    startServer();
}

module.exports = app;
