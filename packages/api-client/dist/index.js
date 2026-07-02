export class ApiError extends Error {
    status;
    body;
    constructor(status, message, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'ApiError';
    }
}
export function createApiClient({ baseUrl, fetch: fetchImpl }) {
    const doFetch = fetchImpl ?? globalThis.fetch;
    const root = baseUrl.replace(/\/$/, '');
    async function request(method, path, body) {
        const res = await doFetch(`${root}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : null;
        if (!res.ok) {
            const message = parsed && typeof parsed === 'object' && 'error' in parsed
                ? JSON.stringify(parsed.error)
                : res.statusText;
            throw new ApiError(res.status, message, parsed);
        }
        return parsed;
    }
    function query(params) {
        const entries = Object.entries(params).filter((e) => e[1] !== undefined && e[1] !== '');
        if (entries.length === 0)
            return '';
        return '?' + new URLSearchParams(entries).toString();
    }
    return {
        health: () => request('GET', '/health'),
        auth: {
            setRole: (userId, role) => request('POST', '/api/v1/auth/role', { userId, role }),
        },
        areas: {
            list: () => request('GET', '/api/v1/areas'),
            search: (q) => request('GET', `/api/v1/areas/search${query({ q })}`),
        },
        issues: {
            list: (filter) => request('GET', `/api/v1/issues${query(filter ?? {})}`),
            get: (id) => request('GET', `/api/v1/issues/${id}`),
            create: (input) => request('POST', '/api/v1/issues', input),
            support: (id) => request('POST', `/api/v1/issues/${id}/support`),
        },
        verification: {
            submit: (input) => request('POST', '/api/v1/verification', input),
        },
        manifesto: {
            generate: (areaId) => request('POST', '/api/v1/manifesto/generate', { areaId }),
            get: (areaId) => request('GET', `/api/v1/manifesto/${areaId}`),
        },
        party: {
            listPromises: (status) => request('GET', `/api/v1/party/promises${query({ status })}`),
            adopt: (input) => request('POST', '/api/v1/party/promises/adopt', input),
        },
        tracker: {
            updatesFor: (promiseId) => request('GET', `/api/v1/tracker/updates/${promiseId}`),
            addUpdate: (input) => request('POST', '/api/v1/tracker/updates', input),
        },
        audit: {
            list: () => request('GET', '/api/v1/audit'),
        },
    };
}
