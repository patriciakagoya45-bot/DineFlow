(() => {
    const API = '/api';
    const TOKEN_KEY = 'dineflowSessionToken';
    const STAFF_ROLES = ['admin', 'manager', 'waiter', 'chef'];

    function token() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function authHeaders() {
        const value = token();
        return value ? { Authorization: `Bearer ${value}` } : {};
    }

    function dashboardFor(account) {
    switch (account.role) {
        case 'admin':
        case 'manager':
            return 'index.html';

        case 'chef':
            return 'staff-dashboard.html';

        case 'waiter':
            return 'staff-dashboard.html';

        case 'customer':
            return 'customer-dashboard.html';

        default:
            return 'login.html';
    }
}

    function loginPage() {
        return new URL('login.html', window.location.href).href;
    }

    async function request(endpoint, options = {}) {
        const { redirectOnUnauthorized = true, ...fetchOptions } = options;
        const headers = {
            ...authHeaders(),
            ...fetchOptions.headers
        };
        if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(`${API}/${endpoint}`, {
            ...fetchOptions,
            headers
        });

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error('The server returned an invalid response.');
        }

        if (!response.ok || !result.success) {
            if (response.status === 401 && token() && redirectOnUnauthorized) {
                sessionStorage.removeItem(TOKEN_KEY);
                window.location.assign(loginPage());
            }
            throw new Error(result.message || `Request failed (${response.status})`);
        }

        return result;
    }

    async function currentAccount() {
        const result = await request('auth/me', { redirectOnUnauthorized: false });
        return result.data.account;
    }

    function appendSessionControl(account) {
        const bar = document.querySelector('.topbar, .top-bar');
        const allowedPages = {
            admin: ['index.html', 'staff.html', 'staff-dashboard.html', 'orders.html', 'menu.html', 'categories.html', 'customers.html', 'payments.html', 'team.html', 'reports.html', 'settings.html'],
            manager: ['index.html', 'staff.html', 'staff-dashboard.html', 'orders.html', 'menu.html', 'categories.html', 'customers.html', 'payments.html', 'team.html', 'reports.html'],
            waiter: ['staff.html', 'staff-dashboard.html', 'orders.html', 'payments.html'],
            chef: ['staff-dashboard.html'],
            customer: ['customer-dashboard.html']
        }[account.role] || [];
        document.querySelectorAll('nav a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) return;
            const page = new URL(href, window.location.href).pathname.split('/').pop();
            if (!allowedPages.includes(page)) link.remove();
        });

        if (!bar || bar.querySelector('[data-session-control]') ||
            document.querySelector('[data-customer-logout]')) return;

        const control = document.createElement('div');
        control.className = 'session-control';
        control.dataset.sessionControl = 'true';

        const identity = document.createElement('span');
        identity.textContent = `${account.name} · ${account.role}`;

        const logout = document.createElement('button');
        logout.type = 'button';
        logout.textContent = 'Log out';
        logout.addEventListener('click', signOut);

        control.append(identity, logout);
        bar.appendChild(control);
    }

    async function requireRole(requiredRole) {
        let account;
        try {
            account = await currentAccount();
        } catch {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.replace(loginPage());
            return null;
        }

        const allowed = requiredRole === 'staff'
            ? STAFF_ROLES.includes(account.role)
            : requiredRole === 'management'
                ? ['admin', 'manager'].includes(account.role)
                : requiredRole === 'payment'
                    ? ['admin', 'manager', 'waiter'].includes(account.role)
                    : requiredRole === 'service'
                        ? ['admin', 'manager', 'waiter'].includes(account.role)
                : account.role === requiredRole;

        if (!allowed) {
            window.location.replace(dashboardFor(account));
            return null;
        }

        appendSessionControl(account);
        return account;
    }

    async function signOut() {
        try {
            if (token()) {
                await request('auth/logout', { method: 'POST' });
            }
        } catch (error) {
            console.error('Sign-out request failed:', error);
        } finally {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.assign(loginPage());
        }
    }

    window.DineFlowAuth = {
        API,
        TOKEN_KEY,
        token,
        authHeaders,
        request,
        currentAccount,
        requireRole,
        dashboardFor,
        signOut,
        saveToken(value) {
            sessionStorage.setItem(TOKEN_KEY, value);
        },
        clearToken() {
            sessionStorage.removeItem(TOKEN_KEY);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const requiredRole = document.body.dataset.authRequired;
        if (requiredRole) requireRole(requiredRole);
    });
})();