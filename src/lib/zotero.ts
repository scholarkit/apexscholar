export interface ZoteroCredentials {
    userId: string;
    apiKey: string;
}

export const zoteroService = {
    /**
     * Start the OAuth flow by getting a request token
     */
    async getRequestToken(callbackUrl: string): Promise<{ token: string; secret: string; url: string }> {
        const response = await fetch('/api/zotero/request-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callbackUrl }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get request token: ${response.statusText} ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Exchange the authorized request token for an access token (API Key) & UserID
     */
    async getAccessToken(requestToken: string, requestTokenSecret: string, oauthVerifier: string): Promise<ZoteroCredentials> {
        const response = await fetch('/api/zotero/access-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oauthToken: requestToken, requestTokenSecret, oauthVerifier }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get access token: ${response.statusText} ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Generic wrapper for Zotero API calls (proxied through backend to avoid CORS)
     */
    async fetchAPI(endpoint: string, credentials: ZoteroCredentials, params: Record<string, string | number> = {}) {
        const response = await fetch('/api/zotero/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, credentials, params }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Zotero Proxy API Error: ${response.statusText} ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Fetch user's collections
     */
    async getCollections(credentials: ZoteroCredentials) {
        return this.fetchAPI('collections', credentials);
    },

    /**
     * Fetch items from a specific collection (or root library)
     * implements Pagination (?limit=100&start=x) and Incremental Fetching (?since=[version])
     */
    async getItems(credentials: ZoteroCredentials, collectionId: string | 'library', start = 0, limit = 100, sinceVersion?: number) {
        const params: Record<string, string> = {
            start: start.toString(),
            limit: limit.toString(),
            format: 'json',
            itemType: '-attachment'
        };

        if (sinceVersion) {
            params.since = sinceVersion.toString();
        }

        const endpoint = collectionId === 'library' ? 'items/top' : `collections/${collectionId}/items/top`;
        return this.fetchAPI(endpoint, credentials, params);
    }
};
