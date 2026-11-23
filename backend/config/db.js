
const mongoose = require('mongoose');

let cachedConnection = null;
let connectionPromise = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing');
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_URI)
            .then((connection) => {
                cachedConnection = connection;

                console.log(
                    `MongoDB Connected Successfully: ${connection.connection.host}`
                );

                return connection;
            })
            .catch((error) => {
                connectionPromise = null;
                cachedConnection = null;

                console.error(
                    'MongoDB Connection Error:',
                    error.message
                );

                throw error;
            });
    }

    return connectionPromise;
};

module.exports = connectDB;
