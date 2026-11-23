const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Session = require('../models/Session');
const PasswordResetToken = require('../models/PasswordResetToken');
const { hashToken } = require('../middleware/auth');
const sendPasswordResetEmail = require('../passwordResetEmail');

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;
const PASSWORD_RESET_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

function publicAccount(account, role) {
    return {
        id: String(account._id),
        name: account.name,
        email: account.email || '',
        phone: account.phone || '',
        role
    };
}

async function createSession(account, role, res) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await Session.create({
        tokenHash: hashToken(token),
        role,
        user: role === 'customer' ? undefined : account._id,
        customer: role === 'customer' ? account._id : undefined,
        expiresAt
    });

    return res.status(200).json({
        success: true,
        message: 'Signed in successfully',
        data: {
            token,
            expiresAt,
            account: publicAccount(account, role)
        }
    });
}

async function registerCustomer(req, res) {
    try {
        const name = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const phone = String(req.body.phone || '').trim();
        const password = String(req.body.password || '');

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, phone and password are required'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        const existingAccount = await Customer.findOne({
            $or: [{ email }, { phone }]
        });
        if (existingAccount) {
            return res.status(409).json({
                success: false,
                message: 'An account already uses this email or phone number'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const customer = await Customer.create({
            name,
            email,
            phone,
            password: hashedPassword
        });

        return await createSession(customer, 'customer', res);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account already uses this email or phone number'
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function login(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const accountType = req.body.accountType || 'auto';

        if (!email || !password ||
            !['auto', 'admin', 'manager', 'chef', 'waiter', 'customer'].includes(accountType)) {
            return res.status(400).json({
                success: false,
                message: 'Choose an account type and enter your email and password'
            });
        }

        let isCustomer = accountType === 'customer';
        let account;
        let passwordMatches = false;

        if (accountType === 'auto') {
            const [staffAccount, customerAccount] = await Promise.all([
                User.findOne({ email }).select('+password'),
                Customer.findOne({ email }).select('+password')
            ]);
            const staffMatches = Boolean(staffAccount?.password) &&
                await bcrypt.compare(password, staffAccount.password);
            const customerMatches = Boolean(customerAccount?.password) &&
                await bcrypt.compare(password, customerAccount.password);

            if (staffMatches && customerMatches) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is linked to multiple accounts. Choose an account type.'
                });
            }

            if (staffMatches) {
                account = staffAccount;
            } else if (customerMatches) {
                account = customerAccount;
                isCustomer = true;
            }
            passwordMatches = Boolean(account);
        } else {
            account = isCustomer
                ? await Customer.findOne({ email }).select('+password')
                : await User.findOne({ email }).select('+password');
            passwordMatches = Boolean(account?.password) &&
                await bcrypt.compare(password, account.password);
        }

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Email or password is incorrect'
            });
        }

        if (!isCustomer && !account.isActive) {
            return res.status(403).json({
                success: false,
                message: 'This staff account is inactive. Contact a manager.'
            });
        }

        if (!isCustomer && accountType !== 'auto' && account.role !== accountType) {
            return res.status(403).json({
                success: false,
                message: 'The selected account type does not match your registered staff role.'
            });
        }

        return await createSession(account, isCustomer ? 'customer' : account.role, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function requestPasswordReset(req, res) {
    const developmentResetLinks = [];
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (email) {
            const [staffAccount, customerAccount] = await Promise.all([
                User.findOne({ email }),
                Customer.findOne({ email })
            ]);
            const accounts = [
                ...(staffAccount ? [{ account: staffAccount, role: staffAccount.role, ownerField: 'user' }] : []),
                ...(customerAccount ? [{ account: customerAccount, role: 'customer', ownerField: 'customer' }] : [])
            ];

            for (const { account, role, ownerField } of accounts) {
                const ownerQuery = { [ownerField]: account._id };
                const recentlyIssued = await PasswordResetToken.exists({
                    ...ownerQuery,
                    createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
                });
                if (recentlyIssued) continue;

                await PasswordResetToken.deleteMany(ownerQuery);
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MS);
                await PasswordResetToken.create({
                    tokenHash: hashToken(token),
                    [ownerField]: account._id,
                    expiresAt
                });

                const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
                const resetUrl = new URL('/reset-password.html', appUrl);
                resetUrl.searchParams.set('token', token);
                const emailSent = await sendPasswordResetEmail({
                    to: account.email,
                    name: account.name,
                    role,
                    resetUrl: resetUrl.toString()
                });
                if (!emailSent) {
                    developmentResetLinks.push({
                        role,
                        path: `/reset-password.html?token=${encodeURIComponent(token)}`
                    });
                }
            }
        }

        const response = { success: true, message: PASSWORD_RESET_MESSAGE };
        if (process.env.NODE_ENV !== 'production' && developmentResetLinks.length) {
            response.data = { resetLinks: developmentResetLinks };
        }
        return res.status(200).json(response);
    } catch (error) {
        console.error(`Password reset request failed: ${error.message}`);
        return res.status(200).json({ success: true, message: PASSWORD_RESET_MESSAGE });
    }
}

async function resetPassword(req, res) {
    try {
        const token = String(req.body.token || '').trim();
        const password = String(req.body.password || '');
        if (!/^[a-f\d]{64}$/i.test(token)) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or expired. Request a new one.'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        const resetRecord = await PasswordResetToken.findOneAndDelete({
            tokenHash: hashToken(token),
            expiresAt: { $gt: new Date() }
        });
        if (!resetRecord) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or expired. Request a new one.'
            });
        }

        const account = resetRecord.user
            ? await User.findById(resetRecord.user)
            : await Customer.findById(resetRecord.customer);
        if (!account) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or expired. Request a new one.'
            });
        }

        account.password = await bcrypt.hash(password, 12);
        await account.save();

        const ownerQuery = resetRecord.user
            ? { user: account._id }
            : { customer: account._id };
        await Promise.all([
            Session.deleteMany(ownerQuery),
            PasswordResetToken.deleteMany(ownerQuery)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Password updated. You can now sign in.'
        });
    } catch (error) {
        console.error(`Password reset failed: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Unable to reset password. Request a new link and try again.'
        });
    }
}

async function currentAccount(req, res) {
    res.status(200).json({
        success: true,
        data: {
            account: {
                id: String(req.auth.id),
                name: req.auth.name,
                email: req.auth.email || '',
                phone: req.auth.phone || '',
                role: req.auth.role
            }
        }
    });
}

async function logout(req, res) {
    await Session.deleteOne({ _id: req.auth.sessionId });
    res.status(200).json({
        success: true,
        message: 'Signed out successfully'
    });
}

module.exports = {
    registerCustomer,
    login,
    requestPasswordReset,
    resetPassword,
    currentAccount,
    logout
};