import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { generateStructuredPlan } from './gemini-client.js';

const StepSchema = z.object({
  order: z.number(),
  action: z.enum(['navigate', 'click', 'fill', 'select', 'check', 'upload', 'wait', 'assert']),
  locatorHint: z.string(),
  input: z.string().optional(),
  expectedVisibleResult: z.string(),
  riskFlags: z.array(z.enum(['payment', 'delete', 'approve', 'refund', 'settlement', 'kyc', 'sms', 'logout', 'destructive'])),
  source: z.literal('llm-inferred').default('llm-inferred')
});

const RoutePlanSchema = z.object({
  routeId: z.string(),
  portal: z.string(),
  path: z.string(),
  requiredRole: z.string(),
  preconditions: z.string().optional(),
  steps: z.array(StepSchema),
  negativeCases: z.array(z.string()),
  uiChecks: z.array(z.string()),
  source: z.literal('llm-inferred').default('llm-inferred')
});

export type RoutePlan = z.infer<typeof RoutePlanSchema>;

const ANALYSIS_DIR = path.resolve(process.cwd(), 'analysis');
const PLANS_DIR = path.resolve(process.cwd(), 'plans');
const FRONTEND_SRC = path.resolve(process.cwd(), '../Frontend/src');

export async function runPlanner() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const portalArgIdx = args.indexOf('--portal');
  const targetPortal = portalArgIdx !== -1 ? args[portalArgIdx + 1] : null;
  const routeArgIdx = args.indexOf('--route');
  const targetRoute = routeArgIdx !== -1 ? args[routeArgIdx + 1] : null;

  console.log('=====================================================================');
  console.log(`PHASE 2: GEMINI TEST PLANNING ${isDryRun ? '(DRY-RUN MODE)' : ''}`);
  console.log('=====================================================================\n');

  if (!fs.existsSync(ANALYSIS_DIR)) {
    console.error('Missing analysis directory. Run `npm run qa:analyze` first.');
    process.exit(1);
  }

  const routes = JSON.parse(fs.readFileSync(path.join(ANALYSIS_DIR, 'routes.json'), 'utf8'));
  const components = JSON.parse(fs.readFileSync(path.join(ANALYSIS_DIR, 'components.json'), 'utf8'));

  let filteredRoutes = routes;
  if (targetPortal) {
    filteredRoutes = filteredRoutes.filter((r: any) => r.portal === targetPortal);
  }
  if (targetRoute) {
    filteredRoutes = filteredRoutes.filter((r: any) => r.path === targetRoute);
  }

  console.log(`Generating / validating plans for ${filteredRoutes.length} routes...\n`);

  let totalChars = 0;
  let plannedCount = 0;

  for (const route of filteredRoutes) {
    const compInventory = components[route.routeId];
    const portalDir = path.join(PLANS_DIR, route.portal);
    if (!fs.existsSync(portalDir)) {
      fs.mkdirSync(portalDir, { recursive: true });
    }

    const planFilePath = path.join(portalDir, `${route.routeId}.json`);

    // Prepare prompt
    const prompt = `You are a QA automation engineer designing test cases for the following route:
Route ID: ${route.routeId}
Path: ${route.path}
Portal: ${route.portal}
Role: ${route.requiredRole}
Component File: ${route.componentFile}
Interactive Elements Discovered:
- Buttons: ${JSON.stringify(compInventory?.buttons || [])}
- Inputs: ${JSON.stringify(compInventory?.inputs || [])}
- Modals: ${JSON.stringify(compInventory?.modals || [])}
- Navigates To: ${JSON.stringify(compInventory?.navigatesTo || [])}
- Socket Listeners: ${JSON.stringify(compInventory?.socketEventsListened || [])}

Generate a structured UI QA plan following these rules:
1. Every step must have an action (navigate, click, fill, select, check, upload, wait, assert) and a robust locatorHint (role/name, label, testid).
2. Mark any risky actions (payments, real deletion, SMS, refunds, settlement, KYC upload) in riskFlags.
3. Include negative test cases (empty submit, invalid inputs, boundary values, rapid clicks).
4. Include UI checks (empty states, loading spinners, error text, text overflow).
5. Always tag source as "llm-inferred".

Output JSON format strictly matching schema.`;

    totalChars += prompt.length;

    if (isDryRun) {
      console.log(`[Dry-Run] Route: ${route.routeId} (${route.path}) -> Prompt size: ${prompt.length} chars`);
      // Create a deterministic fallback plan for dry-run
      const fallbackPlan: RoutePlan = {
        routeId: route.routeId,
        portal: route.portal,
        path: route.path,
        requiredRole: route.requiredRole,
        preconditions: route.precondition,
        steps: [
          {
            order: 1,
            action: 'navigate',
            locatorHint: route.path,
            expectedVisibleResult: `Page loaded at ${route.path}`,
            riskFlags: [],
            source: 'llm-inferred'
          },
          ...(compInventory?.buttons.slice(0, 3).map((btn: string, i: number) => ({
            order: i + 2,
            action: 'click' as const,
            locatorHint: `button:has-text("${btn}")`,
            expectedVisibleResult: `Button ${btn} clicked without crash`,
            riskFlags: [] as any[],
            source: 'llm-inferred' as const
          })) || [])
        ],
        negativeCases: ['Empty form submission validation', 'Rapid double click resilience'],
        uiChecks: ['Loading spinner dismissal', 'Responsive layout without horizontal overflow'],
        source: 'llm-inferred'
      };

      fs.writeFileSync(planFilePath, JSON.stringify(fallbackPlan, null, 2), 'utf8');
      plannedCount++;
    } else {
      try {
        const result = await generateStructuredPlan<RoutePlan>({
          prompt,
          schema: RoutePlanSchema as any,
          promptVersion: 'v1.0'
        });

        fs.writeFileSync(planFilePath, JSON.stringify(result.data, null, 2), 'utf8');
        console.log(`[Plan Generated] ${route.routeId} -> ${planFilePath} (Cached: ${result.fromCache})`);
        plannedCount++;
      } catch (err: any) {
        console.error(`[Plan Failed] ${route.routeId}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Finished planning. Total prompts processed: ${plannedCount}. Total characters: ${totalChars} (~${Math.ceil(totalChars / 4)} tokens).`);
  console.log(`Plans stored in: ${PLANS_DIR}/\n`);
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith('planner-cli.ts')) {
  runPlanner();
}
