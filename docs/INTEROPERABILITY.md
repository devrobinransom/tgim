# TGIM Civic-System Interoperability

TGIM is the independent evidence and accountability record. Municipal grievance systems remain the systems of action for their own cases. Their statuses are linked, never treated as authoritative TGIM verification outcomes.

## Status separation

- `Issue.status` is TGIM's independent evidence state.
- `ExternalGrievanceCase.status` is the state reported by an authority or external provider.
- Closing an external case does not resolve an issue or cluster.
- A moderator or volunteer must complete the relevant TGIM verification workflow separately.
- Every external-case link and status change writes an audit event.

## Authority routing

`CivicAuthority` associates an area and issue category with an institutional service code. The initial seed routes roads, water, and waste reports in the launch ward. Production deployments should import authoritative jurisdiction boundaries and allow overlapping category-specific ownership.

Routes:

- `GET /api/v1/authorities?areaId=&category=` lists active services.
- `GET /api/v1/authorities/route?areaId=&category=` resolves eligible services.
- `POST /api/v1/authorities` creates a service definition as a platform admin.

## Official grievance records

- `POST /api/v1/issues/:id/external-cases` links a case as an officer, moderator, or admin.
- `PATCH /api/v1/external-cases/:id` synchronizes its status as an officer or admin.
- `GET /api/v1/issues/:id/accountability` returns a privacy-safe issue, independent status, official cases, and status totals.

Raw provider payloads are private persistence data and are not exposed by public DTOs.

## Open311 GeoReport v2 surface

- `GET /open311/v2/services.json`
- `POST /open311/v2/requests.json`
- `GET /open311/v2/requests/:id.json`

JSON and `application/x-www-form-urlencoded` request bodies are accepted. Created requests receive a TGIM issue ID and a linked interoperability case. Public responses use blurred coordinates and never expose reporter identity or exact locations.

## Next connector work

Outbound Open311 submission runs through the durable `external_case.submit` job. Successful submissions enqueue `external_case.poll`; non-terminal cases poll again after six hours. Authorities without a configured endpoint use a deterministic local adapter for development, while production authorities submit form-encoded GeoReport requests and may use `OPEN311_API_KEY`.

The public record also supports public documents and citizen appeals. Agency closure, appeal, and synchronization timestamps remain separate from TGIM milestone verification and citizen verdicts.

Future provider-specific adapters should preserve the provider's public appeal URL and redacted raw response for operator diagnosis.
