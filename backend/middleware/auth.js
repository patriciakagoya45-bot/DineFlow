const crypto = require('crypto');
const Session = require('../models/Session');
const User = require('../models/User');
const Customer = require('../models/Customer');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function requireAuth(req, res, next) {
    const authorization = req.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ')
        ? authorization.slice(7).trim()
        : '';

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Please sign in to continue'
        });
    }

    try {
        const session = await Session.findOne({
            tokenHash: hashToken(token),
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please sign in again.'
            });
        }

        const account = session.role === 'customer'
            ? await Customer.findById(session.customer)
            : await User.findById(session.user);

        if (!account || (session.role !== 'customer' && !account.isActive)) {
            await Session.deleteOne({ _id: session._id });
            return res.status(401).json({
                success: false,
                message: 'This account is unavailable. Please sign in again.'
            });
        }

        req.auth = {
            id: account._id,
            role: session.role,
            name: account.name,
            email: account.email,
            phone: account.phone,
            sessionId: session._id
        };
        next();
    } catch (error) {
        next(error);
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
}

module.exports = { hashToken, requireAuth, requireRole };