import { z } from 'zod';

export const auditConfigSchema = z.object({
  url: z.string().url(),
  flow: z.any().optional(),
  auth: z.object({
    cookies: z.array(z.object({ name: z.string(), value: z.string(), domain: z.string() })),
    headers: z.record(z.string()).optional(),
  }).optional(),
  budget: z.object({
    lcp: z.number().optional(),
    inp: z.number().optional(),
    cls: z.number().optional(),
    bundle: z.number().optional(),
  }).optional(),
  maxRoutes: z.number().default(10),
  output: z.object({ dir: z.string() }).default({ dir: './vibe-out' }),
  modules: z.record(z.string(), z.object({ enabled: z.boolean().optional(), options: z.unknown().optional() })).optional(),
  network: z.enum(['fast', 'slow_4g', '3g']).default('fast'),
  cpu: z.number().default(1),
});

export type AuditConfig = z.infer<typeof auditConfigSchema>;
