import type { IssueCluster, ManifestoPromise } from '@tgim/shared';
import { isSovereignMode } from '@tgim/shared';

export type GeneratedPromise = Pick<ManifestoPromise, 'cluster_id' | 'time_horizon' | 'title' | 'description' | 'target_metric'>;

export interface ManifestoGeneration {
  provider: 'openai' | 'deterministic';
  model: string;
  promises: GeneratedPromise[];
}

const horizons = ['100-day', '1-year', '3-year', '5-year'] as const;

function deterministic(clusters: IssueCluster[]): ManifestoGeneration {
  return {
    provider: 'deterministic',
    model: 'tgim-evidence-template-v1',
    promises: clusters.map((cluster, index) => ({
      cluster_id: cluster.id,
      time_horizon: horizons[index % horizons.length],
      title: `Resolve ${cluster.title}`,
      description: `Act on the verified ${cluster.category} evidence reported by residents: ${cluster.summary || cluster.title}. Publish progress against the stated target.`,
      target_metric: `Resolve at least 90% of reports linked to cluster ${cluster.id}`,
    })),
  };
}

const promiseSchema = {
  type: 'object',
  properties: {
    promises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cluster_id: { type: 'string' },
          time_horizon: { type: 'string', enum: [...horizons] },
          title: { type: 'string' },
          description: { type: 'string' },
          target_metric: { type: 'string' },
        },
        required: ['cluster_id', 'time_horizon', 'title', 'description', 'target_metric'],
        additionalProperties: false,
      },
    },
  },
  required: ['promises'],
  additionalProperties: false,
} as const;

function outputText(response: any): string | null {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

export async function generateManifestoPromises(clusters: IssueCluster[]): Promise<ManifestoGeneration> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (isSovereignMode() || !apiKey || process.env.AI_PROVIDER === 'deterministic') return deterministic(clusters);
  const model = process.env.OPENAI_MANIFESTO_MODEL || 'gpt-5.6-terra';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      store: false,
      input: [
        {
          role: 'system',
          content: 'Draft concise, measurable civic promises using only the supplied verified evidence. Preserve every source cluster id exactly. Do not invent budgets, agencies, statistics, or claims. Output remains a human-reviewed draft.',
        },
        { role: 'user', content: JSON.stringify({ clusters }) },
      ],
      text: { format: { type: 'json_schema', name: 'tgim_manifesto', strict: true, schema: promiseSchema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI manifesto generation failed (${response.status})`);
  const body = await response.json();
  const text = outputText(body);
  if (!text) throw new Error('OpenAI manifesto generation returned no structured output');
  const parsed = JSON.parse(text) as { promises: GeneratedPromise[] };
  const sourceIds = new Set(clusters.map(cluster => cluster.id));
  if (parsed.promises.some(promise => !promise.cluster_id || !sourceIds.has(promise.cluster_id))) {
    throw new Error('Generated manifesto contained an unknown source cluster');
  }
  return { provider: 'openai', model, promises: parsed.promises };
}
