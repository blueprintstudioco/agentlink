/**
 * Skill Matcher - Ranks agents by capability match to a task description
 * 
 * Uses keyword extraction and fuzzy matching to find the best-fit agents
 * for a given task.
 */

export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  availability: 'online' | 'busy' | 'offline' | 'away';
  total_tasks_completed?: number;
  avg_task_duration_seconds?: number;
  hourly_rate_limit?: number;
}

export interface MatchResult {
  agent: Agent;
  score: number;
  matchedCapabilities: string[];
  availabilityBonus: number;
  experienceBonus: number;
  reason: string;
}

// Common capability synonyms for fuzzy matching
const CAPABILITY_SYNONYMS: Record<string, string[]> = {
  'code': ['coding', 'programming', 'development', 'software', 'developer'],
  'write': ['writing', 'content', 'copywriting', 'author', 'documentation'],
  'analyze': ['analysis', 'analytics', 'data', 'research', 'investigate'],
  'design': ['designing', 'ui', 'ux', 'graphic', 'visual', 'creative'],
  'communicate': ['communication', 'email', 'messaging', 'outreach', 'correspondence'],
  'automate': ['automation', 'scripting', 'workflow', 'bot'],
  'search': ['searching', 'research', 'find', 'lookup', 'query'],
  'organize': ['organization', 'manage', 'schedule', 'planning', 'coordinate'],
  'translate': ['translation', 'language', 'localize', 'i18n'],
  'summarize': ['summary', 'digest', 'brief', 'overview', 'recap'],
};

/**
 * Extract keywords from a task description
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its',
    'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'where', 'when',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'some', 'any', 'no', 'not', 'only', 'just', 'also', 'very', 'just'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Check if a capability matches a keyword (including synonyms)
 */
function capabilityMatches(capability: string, keyword: string): boolean {
  const capLower = capability.toLowerCase();
  const keyLower = keyword.toLowerCase();

  // Direct match
  if (capLower.includes(keyLower) || keyLower.includes(capLower)) {
    return true;
  }

  // Check synonyms
  for (const [root, synonyms] of Object.entries(CAPABILITY_SYNONYMS)) {
    const allTerms = [root, ...synonyms];
    const capInSynonyms = allTerms.some(s => capLower.includes(s));
    const keyInSynonyms = allTerms.some(s => keyLower.includes(s));
    if (capInSynonyms && keyInSynonyms) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate match score between task keywords and agent capabilities
 */
function calculateMatchScore(
  keywords: string[],
  capabilities: string[]
): { score: number; matched: string[] } {
  const matched: string[] = [];
  let totalScore = 0;

  for (const capability of capabilities) {
    for (const keyword of keywords) {
      if (capabilityMatches(capability, keyword)) {
        if (!matched.includes(capability)) {
          matched.push(capability);
          totalScore += 1;
        }
      }
    }
  }

  // Normalize score based on keyword count (max 1.0)
  const normalizedScore = keywords.length > 0 
    ? Math.min(totalScore / keywords.length, 1.0) 
    : 0;

  return { score: normalizedScore, matched };
}

/**
 * Match agents to a task description and return ranked results
 * 
 * @param taskDescription - The task to match agents against
 * @param agents - List of agents to consider
 * @param options - Matching options
 * @returns Ranked list of agents with match scores
 */
export function matchAgentsToTask(
  taskDescription: string,
  agents: Agent[],
  options: {
    /** Only return agents that are online */
    onlineOnly?: boolean;
    /** Minimum score threshold (0-1) */
    minScore?: number;
    /** Maximum number of results */
    limit?: number;
    /** Weight for availability bonus (default 0.1) */
    availabilityWeight?: number;
    /** Weight for experience bonus (default 0.05) */
    experienceWeight?: number;
  } = {}
): MatchResult[] {
  const {
    onlineOnly = false,
    minScore = 0,
    limit = 10,
    availabilityWeight = 0.1,
    experienceWeight = 0.05,
  } = options;

  const keywords = extractKeywords(taskDescription);

  if (keywords.length === 0) {
    // No meaningful keywords - return all agents sorted by availability
    return agents
      .filter(a => !onlineOnly || a.availability === 'online')
      .slice(0, limit)
      .map(agent => ({
        agent,
        score: 0,
        matchedCapabilities: [],
        availabilityBonus: agent.availability === 'online' ? availabilityWeight : 0,
        experienceBonus: 0,
        reason: 'No specific requirements - any agent can help',
      }));
  }

  const results: MatchResult[] = [];

  for (const agent of agents) {
    // Filter by availability if requested
    if (onlineOnly && agent.availability !== 'online') {
      continue;
    }

    const { score: baseScore, matched } = calculateMatchScore(
      keywords,
      agent.capabilities || []
    );

    // Calculate bonuses based on availability
    let availabilityBonus = 0;
    switch (agent.availability) {
      case 'online': availabilityBonus = availabilityWeight; break;
      case 'busy': availabilityBonus = availabilityWeight * 0.5; break;
      case 'away': availabilityBonus = availabilityWeight * 0.25; break;
      case 'offline': availabilityBonus = 0; break;
    }

    const experienceBonus = agent.total_tasks_completed 
      ? Math.min(agent.total_tasks_completed / 100, 1) * experienceWeight 
      : 0;

    const totalScore = baseScore + availabilityBonus + experienceBonus;

    if (totalScore >= minScore) {
      // Generate human-readable reason
      const reasons: string[] = [];
      if (matched.length > 0) {
        reasons.push(`Matches: ${matched.join(', ')}`);
      }
      if (agent.availability === 'online') {
        reasons.push('Online');
      }
      if (agent.total_tasks_completed && agent.total_tasks_completed > 10) {
        reasons.push(`Experienced (${agent.total_tasks_completed} tasks)`);
      }

      results.push({
        agent,
        score: totalScore,
        matchedCapabilities: matched,
        availabilityBonus,
        experienceBonus,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'General match',
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Match task to agents (alias for matchAgentsToTask with different options interface)
 */
export function matchTaskToAgents(
  taskDescription: string,
  agents: Agent[],
  options: {
    requireOnline?: boolean;
    maxResults?: number;
    preferExperienced?: boolean;
  } = {}
): MatchResult[] {
  return matchAgentsToTask(taskDescription, agents, {
    onlineOnly: options.requireOnline,
    limit: options.maxResults,
    experienceWeight: options.preferExperienced ? 0.1 : 0.05,
  });
}

/**
 * Find the best agent for a task
 */
export function findBestAgent(
  taskDescription: string,
  agents: Agent[],
  onlineOnly = true
): MatchResult | null {
  const results = matchAgentsToTask(taskDescription, agents, {
    onlineOnly,
    limit: 1,
  });
  return results[0] || null;
}

/**
 * Suggest capabilities based on a task description
 */
export function suggestCapabilities(taskDescription: string): string[] {
  const keywords = extractKeywords(taskDescription);
  const suggestions = new Set<string>();

  for (const keyword of keywords) {
    // Check if keyword matches any capability category
    for (const [root, synonyms] of Object.entries(CAPABILITY_SYNONYMS)) {
      if ([root, ...synonyms].some(s => keyword.includes(s) || s.includes(keyword))) {
        suggestions.add(root);
      }
    }
    // Also include the raw keyword if it seems like a capability
    if (keyword.length > 3) {
      suggestions.add(keyword);
    }
  }

  return Array.from(suggestions);
}
