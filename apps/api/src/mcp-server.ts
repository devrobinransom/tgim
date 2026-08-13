import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dbService } from './services/db.service.js';
import type { McpPrincipal } from './mcp-auth.js';
import { isPublicVisibility, toPublicExternalCase, toPublicIssue } from './public-projection.js';

const jsonResult = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });

export function createMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer({ name: 'tgim-civic-accountability', version: '1.0.0' });
  const audit = async (eventType: string, targetId: string, payload?: unknown) => {
    await dbService.audit.log({ actor_id: `mcp:${principal.clientId}`, event_type: eventType, target_table: 'mcp', target_id: targetId, payload });
  };

  server.tool('tgim_list_services', 'List active civic service routes. Does not expose authority credentials.', async () => {
    const services = await dbService.authorities.findMany({ active: true });
    await audit('mcp.services.list', 'services');
    return jsonResult(services.map(({ open311_endpoint: _endpoint, ...service }) => ({ ...service, live_open311_configured: Boolean(_endpoint) })));
  });

  server.tool('tgim_search_public_issues', 'Search public-safe civic issue reports. Exact reporter identity and coordinates are never available.', {
    area_id: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }, async ({ area_id, category, limit }) => {
    const issues = (await dbService.issues.findMany({ area_id, category })).filter(isPublicVisibility).slice(0, limit).map(toPublicIssue);
    await audit('mcp.issues.search', area_id || category || 'all', { count: issues.length });
    return jsonResult({ items: issues, count: issues.length, privacy: 'public projection only' });
  });

  server.tool('tgim_get_issue_accountability', 'Read the public accountability record for a visible issue, including official case statuses.', {
    issue_id: z.string(),
  }, async ({ issue_id }) => {
    const issue = await dbService.issues.findUnique(issue_id);
    if (!issue || !isPublicVisibility(issue)) return jsonResult({ error: 'Issue not found' });
    const officialCases = await dbService.externalCases.findByIssue(issue_id);
    await audit('mcp.issue.accountability', issue_id, { official_case_count: officialCases.length });
    return jsonResult({ issue: toPublicIssue(issue), official_cases: officialCases.map(toPublicExternalCase) });
  });

  return server;
}
