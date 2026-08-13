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
export function createApiClient({ baseUrl, fetch: fetchImpl, getToken, headers }) {
    const doFetch = fetchImpl ?? globalThis.fetch;
    const root = baseUrl.replace(/\/$/, '');
    async function resolveHeaders(body) {
        const resolvedHeaders = typeof headers === 'function' ? await headers() : headers;
        const next = new Headers(resolvedHeaders);
        if (body)
            next.set('Content-Type', 'application/json');
        const token = getToken ? await getToken() : null;
        if (token)
            next.set('Authorization', `Bearer ${token}`);
        return next;
    }
    async function request(method, path, body) {
        const res = await doFetch(`${root}${path}`, {
            method,
            headers: await resolveHeaders(body),
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
    async function requestBlob(path) {
        const res = await doFetch(`${root}${path}`, { headers: await resolveHeaders() });
        if (!res.ok)
            throw new ApiError(res.status, res.statusText);
        return res.blob();
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
            me: () => request('GET', '/api/v1/auth/me'),
            setRole: (userId, role) => request('POST', '/api/v1/auth/role', { userId, role }),
        },
        areas: {
            list: () => request('GET', '/api/v1/areas'),
            search: (q) => request('GET', `/api/v1/areas/search${query({ q })}`),
        },
        pincodes: {
            list: () => request('GET', '/api/v1/pincodes'),
            geocode: (input) => request('POST', '/api/v1/geocode/pincode', input),
        },
        forms: {
            get: (slug) => request('GET', `/api/v1/forms/${encodeURIComponent(slug)}`),
            create: (input) => request('POST', '/api/v1/forms', input),
            publish: (slug) => request('POST', `/api/v1/forms/${encodeURIComponent(slug)}/publish`),
            submit: (slug, input) => request('POST', `/api/v1/forms/${encodeURIComponent(slug)}/responses`, input),
            responses: (slug) => request('GET', `/api/v1/forms/${encodeURIComponent(slug)}/responses`),
        },
        polls: {
            list: (areaId) => request('GET', `/api/v1/polls${query({ areaId })}`),
            create: (input) => request('POST', '/api/v1/polls', input),
            publish: (id) => request('POST', `/api/v1/polls/${id}/publish`),
            vote: (id, input) => request('POST', `/api/v1/polls/${id}/votes`, input),
            results: (id) => request('GET', `/api/v1/polls/${id}/results`),
        },
        issues: {
            list: (filter) => request('GET', `/api/v1/issues${query(filter ?? {})}`),
            get: (id) => request('GET', `/api/v1/issues/${id}`),
            create: (input) => request('POST', '/api/v1/issues', input),
            support: (id) => request('POST', `/api/v1/issues/${id}/support`),
            page: (filter) => request('GET', `/api/v1/issues/page${query(Object.fromEntries(Object.entries(filter ?? {}).map(([key, value]) => [key, value === undefined ? undefined : String(value)])))}`),
            accountability: (id) => request('GET', `/api/v1/issues/${id}/accountability`),
            linkExternalCase: (id, input) => request('POST', `/api/v1/issues/${id}/external-cases`, input),
            submitToAuthority: (id, input) => request('POST', `/api/v1/issues/${id}/submit-to-authority`, input),
        },
        clusters: {
            publicGet: (id) => request('GET', `/api/v1/public/clusters/${id}`),
        },
        authorities: {
            list: (filter) => request('GET', `/api/v1/authorities${query(filter ?? {})}`),
            route: (category, areaId) => request('GET', `/api/v1/authorities/route${query({ category, areaId })}`),
            create: (input) => request('POST', '/api/v1/authorities', input),
        },
        externalCases: {
            update: (id, input) => request('PATCH', `/api/v1/external-cases/${id}`, input),
            documents: (id) => request('GET', `/api/v1/external-cases/${id}/documents`),
            addDocument: (id, input) => request('POST', `/api/v1/external-cases/${id}/documents`, input),
            appeal: (id, input) => request('POST', `/api/v1/external-cases/${id}/appeals`, input),
        },
        open311: {
            services: () => request('GET', '/open311/v2/services.json'),
            createRequest: (input) => request('POST', '/open311/v2/requests.json', input),
            request: (id) => request('GET', `/open311/v2/requests/${id}.json`),
        },
        media: {
            upload: (input) => request('POST', '/api/v1/media/uploads', input),
        },
        verification: {
            submit: (input) => request('POST', '/api/v1/verification', input),
            assignments: () => request('GET', '/api/v1/verification/assignments'),
            assign: (input) => request('POST', '/api/v1/verification/assignments', input),
            updateAssignment: (id, input) => request('POST', `/api/v1/verification/assignments/${id}/status`, input),
        },
        manifesto: {
            generate: (areaId) => request('POST', '/api/v1/manifesto/generate', { areaId }),
            get: (areaId) => request('GET', `/api/v1/manifesto/${areaId}`),
            publicGet: (areaId) => request('GET', `/api/v1/public/manifestos/${areaId}`),
            publish: (id) => request('POST', `/api/v1/manifesto/${id}/publish`, { confirmation: true }),
        },
        party: {
            listPromises: (status) => request('GET', `/api/v1/party/promises${query({ status })}`),
            adopt: (input) => request('POST', '/api/v1/party/promises/adopt', input),
            updatePromise: (id, input) => request('PATCH', `/api/v1/party/promises/${id}`, input),
            accountability: (id) => request('GET', `/api/v1/public/promises/${id}/accountability`),
            createMilestone: (id, input) => request('POST', `/api/v1/party/promises/${id}/milestones`, input),
            updateMilestone: (id, input) => request('PATCH', `/api/v1/promise-milestones/${id}`, input),
            verdict: (id, input) => request('PUT', `/api/v1/party/promises/${id}/verdict`, input),
        },
        tracker: {
            updatesFor: (promiseId) => request('GET', `/api/v1/tracker/updates/${promiseId}`),
            addUpdate: (input) => request('POST', '/api/v1/tracker/updates', input),
        },
        volunteers: {
            apply: (input) => request('POST', '/api/v1/volunteers/applications', input),
            applications: () => request('GET', '/api/v1/volunteers/applications'),
            review: (id, input) => request('POST', `/api/v1/volunteers/applications/${id}/review`, input),
        },
        disputes: {
            list: (promiseId) => request('GET', `/api/v1/disputes${query({ promiseId })}`),
            create: (input) => request('POST', '/api/v1/disputes', input),
            resolve: (id, input) => request('POST', `/api/v1/disputes/${id}/resolve`, input),
        },
        notifications: {
            preferences: () => request('GET', '/api/v1/notifications/preferences'),
            updatePreferences: (input) => request('PUT', '/api/v1/notifications/preferences', input),
            list: () => request('GET', '/api/v1/notifications'),
            markRead: (id) => request('POST', `/api/v1/notifications/${id}/read`),
        },
        moderation: {
            list: () => request('GET', '/api/v1/moderation/actions'),
            create: (input) => request('POST', '/api/v1/moderation/actions', input),
        },
        aggregates: {
            area: (areaId) => request('GET', `/api/v1/aggregates/areas/${areaId}`),
        },
        exports: {
            areaCsvUrl: (areaId) => `${root}/api/v1/exports/areas/${encodeURIComponent(areaId)}.csv`,
            manifestoPdf: (id) => requestBlob(`/api/v1/exports/manifestos/${id}.pdf`),
            manifestoPdfUrl: (id) => `${root}/api/v1/exports/manifestos/${id}.pdf`,
        },
        audit: {
            list: () => request('GET', '/api/v1/audit'),
            page: (filter) => request('GET', `/api/v1/audit/page${query(Object.fromEntries(Object.entries(filter ?? {}).map(([key, value]) => [key, value === undefined ? undefined : String(value)])))}`),
        },
    };
}
