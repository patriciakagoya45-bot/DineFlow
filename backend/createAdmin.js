require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const User = require('./models/User');

async function createAdmin() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from the .env file.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    const prompt = readline.createInterface({ input: stdin, output: stdout });

    try {
        const name = (await prompt.question('Administrator name: ')).trim();
        const email = (await prompt.question('Administrator email: '))
            .trim()
            .toLowerCase();
        const password = await prompt.question('Password (minimum 8 characters): ');

        if (!name || !email || password.length < 8) {
            throw new Error('Name, email, and a password of at least 8 characters are required.');
        }

        if (await User.exists({ email })) {
            throw new Error('That email is already registered.');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });

        console.log(`Administrator account created for ${email}.`);
    } finally {
        prompt.close();
    }
}

createAdmin()
    .catch(error => {
        console.error(`Unable to create administrator: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
