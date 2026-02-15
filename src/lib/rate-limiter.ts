/**
 * Rate Limiter - Check and track agent request limits
 */

import { supabaseAdmin } from './supabase';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Check if an agent can make a request (and increment counter if allowed)
 */
export async function checkRateLimit(agentId: string): Promise<RateLimitResult> {
  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);
  
  const nextHour = new Date(hourBucket);
  nextHour.setHours(nextHour.getHours() + 1);
  
  // Use the database function for atomic check-and-increment
  const { data, error } = await supabaseAdmin.rpc('check_agent_rate_limit', {
    p_agent_id: agentId,
  });
  
  if (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow the request but log the error
    return {
      allowed: true,
      currentCount: 0,
      maxLimit: 100,
      resetAt: nextHour,
    };
  }
  
  const result = data?.[0];
  
  if (!result) {
    return {
      allowed: true,
      currentCount: 0,
      maxLimit: 100,
      resetAt: nextHour,
    };
  }
  
  const retryAfterSeconds = result.allowed 
    ? undefined 
    : Math.ceil((nextHour.getTime() - Date.now()) / 1000);
  
  return {
    allowed: result.allowed,
    currentCount: result.current_count,
    maxLimit: result.max_limit,
    resetAt: nextHour,
    retryAfterSeconds,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(agentId: string): Promise<RateLimitResult> {
  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);
  
  const nextHour = new Date(hourBucket);
  nextHour.setHours(nextHour.getHours() + 1);
  
  // Get agent's hourly limit
  const { data: agent } = await supabaseAdmin
    .from('ocv_agents')
    .select('hourly_rate_limit')
    .eq('id', agentId)
    .single();
  
  const maxLimit = agent?.hourly_rate_limit || 100;
  
  // Get current count
  const { data: rateLimit } = await supabaseAdmin
    .from('ocv_agent_rate_limits')
    .select('request_count')
    .eq('agent_id', agentId)
    .eq('hour_bucket', hourBucket.toISOString())
    .single();
  
  const currentCount = rateLimit?.request_count || 0;
  const allowed = currentCount < maxLimit;
  
  return {
    allowed,
    currentCount,
    maxLimit,
    resetAt: nextHour,
    retryAfterSeconds: allowed ? undefined : Math.ceil((nextHour.getTime() - Date.now()) / 1000),
  };
}

/**
 * Update agent stats after task completion
 */
export async function updateAgentStats(
  agentId: string,
  durationSeconds: number,
  tokensUsed: number = 0
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('update_agent_task_stats', {
    p_agent_id: agentId,
    p_duration_seconds: durationSeconds,
    p_tokens_used: tokensUsed,
  });
  
  if (error) {
    console.error('Failed to update agent stats:', error);
  }
}

/**
 * Middleware helper for rate limiting API routes
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.maxLimit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.maxLimit - result.currentCount).toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };
  
  if (result.retryAfterSeconds) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }
  
  return headers;
}
