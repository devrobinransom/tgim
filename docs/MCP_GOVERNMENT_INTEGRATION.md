# TGIM authenticated MCP integration guide

TGIM exposes a Streamable HTTP MCP endpoint at `POST /mcp` for approved government bodies, utilities, NGOs, parties, volunteer groups, and research institutions. It is an authenticated integration surface, not a public data export.

## Before connecting

The TGIM platform team must configure these API environment variables:

```text
MCP_TOKEN_ISSUER=https://identity.example.gov/realms/civic
MCP_JWKS_URL=https://identity.example.gov/realms/civic/protocol/openid-connect/certs
MCP_TOKEN_AUDIENCE=tgim-mcp
```

The partner creates a confidential OAuth/OIDC client using client credentials. Its access tokens must be RS256-signed, short-lived, have `aud=tgim-mcp`, and include the `tgim.read` scope. TGIM rejects missing, expired, wrong-issuer, wrong-audience, or unsigned tokens. Do not put an API key, client secret, citizen data, or an OAuth token in an MCP tool argument.

## Initial tools

| Tool | What it returns | Privacy boundary |
| --- | --- | --- |
| `tgim_list_services` | Active civic service routes and whether an Open311 endpoint is configured | No credentials or endpoint URL |
| `tgim_search_public_issues` | Filtered public issue projections | Never reporter identity or exact coordinates |
| `tgim_get_issue_accountability` | A public issue and its official case status history | Hidden reports return not found |

Every MCP tool call is audit logged with the OAuth client identity. The endpoint is stateless, so each request is independently authenticated.

## Open311 and recipient-data boundary

The MCP server currently exposes public accountability data only. It does **not** expose citizen evidence, exact locations, contact data, or unpublished moderation material. Those require a separate recipient access grant, an approved data-sharing agreement, an explicit purpose, and a citizen’s active consent for the particular authority case.

For an Open311 authority connection, provide the service catalogue, sandbox/production base URLs, callback policy, API credential delivery process, status mappings, and named UAT contacts. TGIM will not represent an unconfigured authority as live; a missing endpoint must remain a pending integration, not a demo success.

## Acceptance checklist

1. Exchange client credentials for a token with `tgim.read` and the `tgim-mcp` audience.
2. Call MCP initialization and `tgim_list_services` with the bearer token.
3. Confirm hidden reports, exact coordinates, reporter fields, and evidence URLs are absent.
4. Test token expiry, wrong audience, and missing scope: each must be rejected.
5. For Open311, submit and poll against the authority sandbox, reconcile the returned service request ID, and record the result in the joint UAT log before enabling the production route.
