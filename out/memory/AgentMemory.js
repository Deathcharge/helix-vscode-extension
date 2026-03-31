"use strict";
/**
 * Helix VS Code Extension - Agent Memory Persistence
 * ===================================================
 * Stores per-agent facts across conversations as JSON files.
 *
 * Storage location depends on `helix.memory.scope`:
 *   - "global"    -> context.globalStorageUri / agent-memory /
 *   - "workspace" -> context.storageUri       / agent-memory /
 *
 * Each agent gets its own file: `{agentName}.json`
 *
 * Features:
 *  - CRUD for per-agent facts (key-value with timestamps)
 *  - Auto-extraction from assistant responses
 *  - User "remember X" command detection
 *  - Keyword-based relevant-fact injection into chat context
 *  - Configurable max facts per agent with oldest-first pruning
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMemory = void 0;
exports.getAgentMemory = getAgentMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
// ── Stop words for keyword extraction ───────────────────────────────────────
const STOP_WORDS = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'out',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
    'and',
    'but',
    'or',
    'nor',
    'not',
    'so',
    'yet',
    'both',
    'either',
    'neither',
    'each',
    'every',
    'all',
    'any',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'just',
    'because',
    'if',
    'when',
    'what',
    'which',
    'who',
    'whom',
    'this',
    'that',
    'these',
    'those',
    'i',
    'me',
    'my',
    'myself',
    'we',
    'our',
    'ours',
    'ourselves',
    'you',
    'your',
    'yours',
    'yourself',
    'yourselves',
    'he',
    'him',
    'his',
    'himself',
    'she',
    'her',
    'hers',
    'herself',
    'it',
    'its',
    'itself',
    'they',
    'them',
    'their',
    'theirs',
    'themselves',
    'how',
    'here',
    'there',
    'where',
    'why',
    'about',
    'up',
    'down',
    'also',
    'like',
    'well',
    'back',
    'much',
    'still',
    'now',
    'even',
    'way',
    'get',
    'got',
    'make',
    'made',
]);
const AUTO_EXTRACT_RULES = [
    {
        // "I'll remember that you prefer tabs over spaces."
        pattern: /I'll remember that\s+(.+?)(?:\.\s|\.?$)/i,
        extract: m => {
            const val = m[1]?.trim();
            if (!val || val.length < 5) {
                return null;
            }
            return { key: slugify(val), value: val };
        },
    },
    {
        // "Noted: always use strict mode."
        pattern: /Noted:\s*(.+?)(?:\.\s|\.?$)/i,
        extract: m => {
            const val = m[1]?.trim();
            if (!val || val.length < 5) {
                return null;
            }
            return { key: slugify(val), value: val };
        },
    },
    {
        // "Your preference: dark theme."
        pattern: /Your preference:\s*(.+?)(?:\.\s|\.?$)/i,
        extract: m => {
            const val = m[1]?.trim();
            if (!val || val.length < 5) {
                return null;
            }
            return { key: 'preference-' + slugify(val), value: val };
        },
    },
    {
        // "I've noted that you like functional patterns."
        pattern: /I've noted (?:that )?(.+?)(?:\.\s|\.?$)/i,
        extract: m => {
            const val = m[1]?.trim();
            if (!val || val.length < 5) {
                return null;
            }
            return { key: slugify(val), value: val };
        },
    },
    {
        // "Understood, you want explicit return types."
        pattern: /Understood[,!]?\s+(.+?)(?:\.\s|\.?$)/i,
        extract: m => {
            const val = m[1]?.trim();
            if (!val || val.length < 10) {
                return null;
            }
            return { key: slugify(val), value: val };
        },
    },
];
/** Pattern to detect user "remember" commands. */
const REMEMBER_PATTERN = /^(?:remember|save|store|note)\s+(?:that\s+)?(.+)/i;
// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
/**
 * Extract meaningful keywords from a string for fact matching.
 * Returns lowercase tokens with stop words removed.
 */
function extractKeywords(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}
// ── AgentMemory Class ───────────────────────────────────────────────────────
class AgentMemory {
    // ── Constructor / Singleton ─────────────────────────────────────────────
    constructor(context) {
        /** In-memory cache: agentName -> facts */
        this.cache = new Map();
        /** Agents whose cache is dirty (needs flush to disk) */
        this.dirty = new Set();
        this.context = context;
        this.ensureStorageDir();
    }
    /**
     * Get the singleton instance. The first call **must** provide the
     * ExtensionContext; subsequent calls can omit it.
     */
    static getInstance(context) {
        if (!AgentMemory.instance) {
            if (!context) {
                throw new Error('AgentMemory must be initialized with ExtensionContext on first call');
            }
            AgentMemory.instance = new AgentMemory(context);
        }
        return AgentMemory.instance;
    }
    // ── Backend Sync ────────────────────────────────────────────────────────
    /**
     * Configure backend API details so the local memory store can sync with
     * the Helix backend (cross-platform: web ↔ VS Code same namespace).
     * Call this once authentication succeeds in extension.ts.
     */
    setBackendConfig(apiBase, authToken) {
        this._backendApiBase = apiBase.replace(/\/$/, '');
        this._backendAuthToken = authToken;
    }
    /**
     * Pull core facts from the backend for `agent` and merge them into the
     * local cache.  Remote facts are added only if the key doesn't already
     * exist locally (local takes precedence to avoid overwriting recent edits).
     */
    async syncFromBackend(agent) {
        if (!this._backendApiBase || !this._backendAuthToken) {
            return;
        }
        try {
            const res = await fetch(`${this._backendApiBase}/api/memory/${encodeURIComponent(agent)}`, {
                headers: { Authorization: `Bearer ${this._backendAuthToken}` },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) {
                console.debug(`AgentMemory: backend sync skipped for ${agent} (HTTP ${res.status})`);
                return;
            }
            const data = (await res.json());
            const remoteCore = data.core ?? {};
            const localFacts = await this.loadAgent(agent);
            const localKeys = new Set(localFacts.map(f => f.key));
            let added = 0;
            for (const [key, value] of Object.entries(remoteCore)) {
                if (!localKeys.has(key)) {
                    localFacts.push({
                        key,
                        value,
                        createdAt: new Date().toISOString(),
                        source: 'auto',
                    });
                    added++;
                }
            }
            if (added > 0) {
                this.cache.set(agent, localFacts);
                this.dirty.add(agent);
                this.scheduleFlush();
                console.debug(`AgentMemory: synced ${added} remote facts for ${agent}`);
            }
        }
        catch (err) {
            console.warn(`AgentMemory: backend sync failed for ${agent}:`, err);
        }
    }
    /**
     * Fire-and-forget: push a single fact to the backend core memory store.
     * Silently ignored if backend config is not set.
     */
    _pushToBackend(agent, key, value) {
        if (!this._backendApiBase || !this._backendAuthToken) {
            return;
        }
        fetch(`${this._backendApiBase}/api/memory/${encodeURIComponent(agent)}/core/${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this._backendAuthToken}`,
            },
            body: JSON.stringify({ value }),
            signal: AbortSignal.timeout(8000),
        }).catch(err => {
            console.debug('AgentMemory: backend push failed (non-critical):', err?.message ?? err);
        });
    }
    // ── CRUD ────────────────────────────────────────────────────────────────
    /**
     * Add a fact for an agent.  If a fact with the same key already exists,
     * it is updated in-place (value + timestamp replaced).
     */
    async addFact(agent, key, value, source = 'auto') {
        const config = vscode.workspace.getConfiguration('helix.memory');
        if (!config.get('enabled', true)) {
            return;
        }
        const facts = await this.loadAgent(agent);
        // Upsert: replace existing fact with same key
        const existingIdx = facts.findIndex(f => f.key === key);
        const fact = {
            key,
            value,
            createdAt: new Date().toISOString(),
            source,
        };
        if (existingIdx >= 0) {
            facts[existingIdx] = fact;
        }
        else {
            facts.push(fact);
        }
        // Enforce max limit — prune oldest first
        const maxFacts = config.get('maxMemoriesPerAgent', 500);
        while (facts.length > maxFacts) {
            facts.shift(); // remove oldest (index 0 = earliest createdAt)
        }
        this.cache.set(agent, facts);
        this.dirty.add(agent);
        this.scheduleFlush();
        // Push to backend for cross-platform continuity (fire-and-forget)
        this._pushToBackend(agent, key, value);
    }
    /**
     * Return all facts for an agent, ordered by createdAt ascending.
     */
    async getFacts(agent) {
        const facts = await this.loadAgent(agent);
        return [...facts];
    }
    /**
     * Delete a specific fact by key for an agent.
     */
    async deleteFact(agent, key) {
        const facts = await this.loadAgent(agent);
        const idx = facts.findIndex(f => f.key === key);
        if (idx >= 0) {
            facts.splice(idx, 1);
            this.cache.set(agent, facts);
            this.dirty.add(agent);
            this.scheduleFlush();
        }
    }
    /**
     * Simple substring search across fact keys and values.
     */
    async searchFacts(agent, query) {
        const facts = await this.loadAgent(agent);
        const lower = query.toLowerCase();
        return facts.filter(f => f.key.toLowerCase().includes(lower) ||
            f.value.toLowerCase().includes(lower));
    }
    /**
     * Keyword-based relevance matching.  Extracts keywords from the input
     * message, then scores each fact by how many keywords overlap with its
     * key + value.  Returns facts with at least one keyword hit, sorted by
     * descending relevance score.
     */
    async getRelevantFacts(agent, message) {
        const facts = await this.loadAgent(agent);
        if (facts.length === 0) {
            return [];
        }
        const queryKeywords = extractKeywords(message);
        if (queryKeywords.length === 0) {
            return [];
        }
        const querySet = new Set(queryKeywords);
        const scored = [];
        for (const fact of facts) {
            const factKeywords = extractKeywords(fact.key + ' ' + fact.value);
            let score = 0;
            for (const kw of factKeywords) {
                if (querySet.has(kw)) {
                    score++;
                }
            }
            if (score > 0) {
                scored.push({ fact, score });
            }
        }
        // Sort by score descending, then by recency descending
        scored.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.fact.createdAt.localeCompare(a.fact.createdAt);
        });
        // Return at most 10 facts to keep context window manageable
        return scored.slice(0, 10).map(s => s.fact);
    }
    // ── Conversation hooks ──────────────────────────────────────────────────
    /**
     * Scan a user message for "remember X" commands and store the fact.
     * Returns the extracted fact (if any) so the caller can acknowledge it.
     */
    async extractFromUserMessage(agent, message) {
        const config = vscode.workspace.getConfiguration('helix.memory');
        if (!config.get('enabled', true)) {
            return null;
        }
        const match = REMEMBER_PATTERN.exec(message.trim());
        if (!match || !match[1]) {
            return null;
        }
        const value = match[1].trim();
        if (value.length < 3) {
            return null;
        }
        const key = slugify(value);
        await this.addFact(agent, key, value, 'manual');
        const facts = await this.loadAgent(agent);
        return facts.find(f => f.key === key) ?? null;
    }
    /**
     * Scan an assistant response for auto-extraction patterns.
     * Only runs when `helix.memory.autoLearn` is enabled.
     * Returns all newly extracted facts.
     */
    async extractFromAssistantResponse(agent, response) {
        const config = vscode.workspace.getConfiguration('helix.memory');
        if (!config.get('enabled', true) ||
            !config.get('autoLearn', true)) {
            return [];
        }
        const extracted = [];
        for (const rule of AUTO_EXTRACT_RULES) {
            const match = rule.pattern.exec(response);
            if (!match) {
                continue;
            }
            const result = rule.extract(match);
            if (!result) {
                continue;
            }
            await this.addFact(agent, result.key, result.value, 'auto');
            const facts = await this.loadAgent(agent);
            const stored = facts.find(f => f.key === result.key);
            if (stored) {
                extracted.push(stored);
            }
        }
        return extracted;
    }
    /**
     * Build a context string from relevant facts to inject into a chat
     * request.  Returns `undefined` when memory is disabled or no facts
     * match, so the caller can skip the field entirely.
     */
    async buildContextInjection(agent, message) {
        const config = vscode.workspace.getConfiguration('helix.memory');
        if (!config.get('enabled', true)) {
            return undefined;
        }
        const relevant = await this.getRelevantFacts(agent, message);
        if (relevant.length === 0) {
            return undefined;
        }
        const lines = relevant.map(f => `- ${f.value} (${f.source}, ${f.createdAt})`);
        return '[Agent Memory — relevant facts for this user]\n' + lines.join('\n');
    }
    // ── Storage ─────────────────────────────────────────────────────────────
    /**
     * Resolve the storage directory path based on the configured scope.
     */
    getStoragePath() {
        const scope = vscode.workspace
            .getConfiguration('helix.memory')
            .get('scope', 'workspace');
        let baseUri;
        if (scope === 'global') {
            baseUri = this.context.globalStorageUri;
        }
        else {
            // Workspace scope — fall back to global if no workspace folder
            baseUri = this.context.storageUri ?? this.context.globalStorageUri;
        }
        return path.join(baseUri.fsPath, 'agent-memory');
    }
    /**
     * Ensure the storage directory exists on disk.
     */
    ensureStorageDir() {
        const dir = this.getStoragePath();
        try {
            fs.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            console.warn(`AgentMemory: failed to create storage directory ${dir}:`, err);
        }
    }
    /**
     * Sanitize agent name for use as a filename.
     */
    agentFileName(agent) {
        const safe = agent
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .slice(0, 64);
        return safe + '.json';
    }
    /**
     * Full path to an agent's fact file.
     */
    agentFilePath(agent) {
        return path.join(this.getStoragePath(), this.agentFileName(agent));
    }
    /**
     * Load facts for an agent — from cache if available, else from disk.
     */
    async loadAgent(agent) {
        const cached = this.cache.get(agent);
        if (cached) {
            return cached;
        }
        const filePath = this.agentFilePath(agent);
        let facts = [];
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.version === 1 && Array.isArray(parsed.facts)) {
                    facts = parsed.facts;
                }
            }
        }
        catch (err) {
            console.warn(`AgentMemory: failed to load facts from ${filePath}:`, err);
        }
        this.cache.set(agent, facts);
        return facts;
    }
    /**
     * Persist dirty agent caches to disk.
     */
    async flushToDisk() {
        this.ensureStorageDir();
        for (const agent of this.dirty) {
            const facts = this.cache.get(agent);
            if (!facts) {
                continue;
            }
            const filePath = this.agentFilePath(agent);
            const contents = {
                version: 1,
                agent,
                facts,
            };
            try {
                fs.writeFileSync(filePath, JSON.stringify(contents, null, 2), 'utf-8');
            }
            catch (err) {
                console.warn(`AgentMemory: failed to write facts to ${filePath}:`, err);
            }
        }
        this.dirty.clear();
    }
    /**
     * Schedule a debounced flush — collapses rapid successive writes into
     * a single disk I/O after a short delay.
     */
    scheduleFlush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flushTimer = setTimeout(() => {
            void this.flushToDisk();
        }, AgentMemory.FLUSH_DELAY_MS);
    }
    // ── Lifecycle ───────────────────────────────────────────────────────────
    /**
     * Flush all pending writes and release resources.
     */
    dispose() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
        // Synchronous final flush so nothing is lost on deactivate
        void this.flushToDisk();
        this.cache.clear();
        this.dirty.clear();
        AgentMemory.instance = undefined;
    }
}
exports.AgentMemory = AgentMemory;
/** Milliseconds to debounce disk writes */
AgentMemory.FLUSH_DELAY_MS = 2000;
// ── Singleton accessor ──────────────────────────────────────────────────────
/**
 * Convenience accessor.  Call with `context` once during activation;
 * thereafter call without arguments to retrieve the singleton.
 */
function getAgentMemory(context) {
    return AgentMemory.getInstance(context);
}
//# sourceMappingURL=AgentMemory.js.map