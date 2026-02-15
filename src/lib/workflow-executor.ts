/**
 * Workflow Executor - Phase 3 Orchestration
 * 
 * Executes workflow steps sequentially, maintaining context between steps.
 * Supports various step types: agent_call, condition, transform, delay, webhook
 */

import { supabaseAdmin } from './supabase';

// Step types
export type StepType = 'agent_call' | 'condition' | 'transform' | 'delay' | 'webhook' | 'set_context';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, unknown>;
  // For conditions: which step to jump to on true/false
  on_success?: string;
  on_failure?: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  enabled: boolean;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  context: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  nextStep?: string;
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  workflow: Workflow
): Promise<ExecutionResult> {
  try {
    switch (step.type) {
      case 'agent_call':
        return await executeAgentCall(step, context);

      case 'condition':
        return executeCondition(step, context);

      case 'transform':
        return executeTransform(step, context);

      case 'delay':
        return await executeDelay(step, context);

      case 'webhook':
        return await executeWebhook(step, context);

      case 'set_context':
        return executeSetContext(step, context);

      default:
        return { success: false, error: `Unknown step type: ${step.type}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Call an agent via OpenClaw gateway
 */
async function executeAgentCall(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<ExecutionResult> {
  const { agent_id, session_key, message, timeout_ms = 30000 } = step.config as {
    agent_id?: string;
    session_key?: string;
    message?: string;
    timeout_ms?: number;
  };

  if (!message) {
    return { success: false, error: 'agent_call requires a message' };
  }

  // Interpolate context variables in message
  const interpolatedMessage = interpolateString(message, context);

  // TODO: Actually call the agent via gateway
  // For now, simulate the call
  console.log(`[Workflow] Agent call: ${interpolatedMessage}`);
  
  return {
    success: true,
    output: {
      response: `[Simulated agent response to: ${interpolatedMessage}]`,
      agent_id,
      session_key,
    },
  };
}

/**
 * Evaluate a condition and determine next step
 */
function executeCondition(
  step: WorkflowStep,
  context: Record<string, unknown>
): ExecutionResult {
  const { expression, on_true, on_false } = step.config as {
    expression?: string;
    on_true?: string;
    on_false?: string;
  };

  if (!expression) {
    return { success: false, error: 'condition requires an expression' };
  }

  // Simple expression evaluator (safe subset)
  const result = evaluateExpression(expression, context);

  return {
    success: true,
    output: { condition_result: result },
    nextStep: result ? on_true : on_false,
  };
}

/**
 * Transform data using a simple mapping
 */
function executeTransform(
  step: WorkflowStep,
  context: Record<string, unknown>
): ExecutionResult {
  const { mappings } = step.config as {
    mappings?: Record<string, string>;
  };

  if (!mappings) {
    return { success: true, output: {} };
  }

  const output: Record<string, unknown> = {};
  for (const [key, valuePath] of Object.entries(mappings)) {
    output[key] = getNestedValue(context, valuePath);
  }

  return { success: true, output };
}

/**
 * Delay execution for a specified time
 */
async function executeDelay(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<ExecutionResult> {
  const { duration_ms = 1000 } = step.config as { duration_ms?: number };

  await new Promise((resolve) => setTimeout(resolve, duration_ms));

  return { success: true, output: { delayed_ms: duration_ms } };
}

/**
 * Call an external webhook
 */
async function executeWebhook(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<ExecutionResult> {
  const { url, method = 'POST', headers = {}, body } = step.config as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };

  if (!url) {
    return { success: false, error: 'webhook requires a url' };
  }

  const interpolatedUrl = interpolateString(url, context);
  const interpolatedBody = body ? JSON.parse(interpolateString(JSON.stringify(body), context)) : undefined;

  try {
    const response = await fetch(interpolatedUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: interpolatedBody ? JSON.stringify(interpolatedBody) : undefined,
    });

    const responseData = await response.json().catch(() => null);

    return {
      success: response.ok,
      output: {
        status: response.status,
        data: responseData,
      },
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook failed',
    };
  }
}

/**
 * Set values in the workflow context
 */
function executeSetContext(
  step: WorkflowStep,
  context: Record<string, unknown>
): ExecutionResult {
  const { values } = step.config as { values?: Record<string, unknown> };

  if (!values) {
    return { success: true, output: {} };
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') {
      output[key] = interpolateString(value, context);
    } else {
      output[key] = value;
    }
  }

  return { success: true, output };
}

// Helper: Interpolate {{variable}} in strings
function interpolateString(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : '';
  });
}

// Helper: Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Helper: Simple expression evaluator (safe subset)
function evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
  // Support simple comparisons: "context.value == 'expected'"
  const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
  
  for (const op of operators) {
    if (expression.includes(op)) {
      const [leftPath, rightValue] = expression.split(op).map((s) => s.trim());
      const leftVal = getNestedValue(context, leftPath);
      const rightVal = rightValue.replace(/^['"]|['"]$/g, ''); // Strip quotes

      switch (op) {
        case '===':
        case '==':
          return String(leftVal) === rightVal;
        case '!==':
        case '!=':
          return String(leftVal) !== rightVal;
        case '>':
          return Number(leftVal) > Number(rightVal);
        case '<':
          return Number(leftVal) < Number(rightVal);
        case '>=':
          return Number(leftVal) >= Number(rightVal);
        case '<=':
          return Number(leftVal) <= Number(rightVal);
      }
    }
  }

  // Truthy check
  const value = getNestedValue(context, expression);
  return Boolean(value);
}

/**
 * Main workflow executor
 */
export async function executeWorkflow(
  workflowId: string,
  initialContext: Record<string, unknown> = {}
): Promise<WorkflowRun> {
  // Fetch the workflow
  const { data: workflow, error: fetchError } = await supabaseAdmin
    .from('ocv_workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (fetchError || !workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Create a run record
  const { data: run, error: createError } = await supabaseAdmin
    .from('ocv_workflow_runs')
    .insert({
      workflow_id: workflowId,
      status: 'running',
      current_step: 0,
      context: initialContext,
    })
    .select()
    .single();

  if (createError || !run) {
    throw new Error(`Failed to create run: ${createError?.message}`);
  }

  // Execute steps
  const steps = workflow.steps as WorkflowStep[];
  let currentStepIndex = 0;
  let context = { ...initialContext };
  let error: string | null = null;

  try {
    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      
      // Update run status
      await supabaseAdmin
        .from('ocv_workflow_runs')
        .update({ current_step: currentStepIndex, context })
        .eq('id', run.id);

      // Execute the step
      const result = await executeStep(step, context, workflow);

      if (!result.success) {
        error = result.error || 'Step failed';
        break;
      }

      // Merge output into context
      if (result.output) {
        context = {
          ...context,
          [step.id]: result.output,
          _last_output: result.output,
        };
      }

      // Determine next step
      if (result.nextStep) {
        const nextIndex = steps.findIndex((s) => s.id === result.nextStep);
        if (nextIndex >= 0) {
          currentStepIndex = nextIndex;
        } else {
          currentStepIndex++;
        }
      } else {
        currentStepIndex++;
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Execution error';
  }

  // Update final run status
  const finalStatus = error ? 'failed' : 'completed';
  const { data: finalRun } = await supabaseAdmin
    .from('ocv_workflow_runs')
    .update({
      status: finalStatus,
      current_step: currentStepIndex,
      context,
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id)
    .select()
    .single();

  return finalRun || { ...run, status: finalStatus, error, context };
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflowRun(runId: string): Promise<void> {
  await supabaseAdmin
    .from('ocv_workflow_runs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('status', 'running');
}
