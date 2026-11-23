const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);