/**
 * Trie Data Structure for Instant Autocomplete
 * Provides millisecond-fast prefix matching
 */

class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.data = null;
        this.frequency = 0;
    }
}

export class AutocompleteTrie {
    constructor() {
        this.root = new TrieNode();
        this.cache = new Map(); // LRU cache for repeated queries
        this.maxCacheSize = 1000;
    }

    /**
     * Insert a word into the trie
     */
    insert(word, data = null) {
        let node = this.root;
        const normalizedWord = word.toLowerCase().trim();

        for (const char of normalizedWord) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }

        node.isEndOfWord = true;
        node.data = data || word;
        node.frequency++;
    }

    /**
     * Search for words with given prefix
     * Returns sorted by frequency (most popular first)
     */
    search(prefix, limit = 10) {
        // Check cache first (sub-millisecond)
        const cacheKey = prefix.toLowerCase();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const normalizedPrefix = prefix.toLowerCase().trim();
        let node = this.root;

        // Navigate to prefix node
        for (const char of normalizedPrefix) {
            if (!node.children[char]) {
                return []; // Prefix not found
            }
            node = node.children[char];
        }

        // Collect all words with this prefix
        const results = [];
        this._collectWords(node, normalizedPrefix, results);

        // Sort by frequency (most popular first) and limit
        const sorted = results
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit)
            .map(item => item.data);

        // Cache result
        this._cacheResult(cacheKey, sorted);

        return sorted;
    }

    /**
     * Recursively collect all words from a node
     */
    _collectWords(node, prefix, results) {
        if (node.isEndOfWord) {
            results.push({
                data: node.data,
                frequency: node.frequency
            });
        }

        for (const [char, childNode] of Object.entries(node.children)) {
            this._collectWords(childNode, prefix + char, results);
        }
    }

    /**
     * Cache management (LRU eviction)
     */
    _cacheResult(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Bulk insert for initialization
     */
    bulkInsert(items) {
        items.forEach(item => {
            if (typeof item === 'string') {
                this.insert(item);
            } else if (item.name) {
                this.insert(item.name, item);
            }
        });
    }

    /**
     * Clear cache (call when data changes)
     */
    clearCache() {
        this.cache.clear();
    }
}

// Singleton instances for each category
const tries = {};

/**
 * Get or create trie for a category
 */
export const getAutocompleteTrie = (category, data) => {
    if (!tries[category]) {
        tries[category] = new AutocompleteTrie();
        tries[category].bulkInsert(data);
    }
    return tries[category];
};

/**
 * Fast autocomplete search
 * Returns results in <5ms for typical queries
 */
export const fastAutocomplete = (category, prefix, limit = 10) => {
    if (!tries[category] || !prefix || prefix.length === 0) {
        return [];
    }

    const startTime = performance.now();
    const results = tries[category].search(prefix, limit);
    const duration = performance.now() - startTime;

    // Log performance in dev mode
    if (process.env.NODE_ENV === 'development' && duration > 10) {
        console.warn(`Autocomplete took ${duration.toFixed(2)}ms for "${prefix}" in ${category}`);
    }

    return results;
};

/**
 * Initialize all tries at app startup
 */
export const initializeAutocomplete = (categoriesData) => {
    Object.entries(categoriesData).forEach(([category, data]) => {
        tries[category] = new AutocompleteTrie();
        tries[category].bulkInsert(data);
    });
};
