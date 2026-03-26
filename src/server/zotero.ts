import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { Router } from 'express';

export const zoteroRouter = Router();

const oauth = new OAuth({
  consumer: {
    key: process.env.ZOTERO_CLIENT_KEY || '',
    secret: process.env.ZOTERO_CLIENT_SECRET || '',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

zoteroRouter.post('/request-token', async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    const request_data = {
      url: 'https://www.zotero.org/oauth/request',
      method: 'POST',
      data: { oauth_callback: callbackUrl },
    };

    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: oauth.toHeader(oauth.authorize(request_data)) as unknown as Record<string, string>,
    });

    if (!response.ok) throw new Error(`Failed to get request token: ${response.statusText}`);

    const text = await response.text();
    const params = new URLSearchParams(text);
    res.json({
      token: params.get('oauth_token'),
      secret: params.get('oauth_token_secret'),
      url: `https://www.zotero.org/oauth/authorize?oauth_token=${params.get('oauth_token')}&library_access=1&notes_access=1&write_access=1`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

zoteroRouter.post('/access-token', async (req, res) => {
  try {
    const { oauthToken, requestTokenSecret, oauthVerifier } = req.body;
    const request_data = {
      url: 'https://www.zotero.org/oauth/access',
      method: 'POST',
      data: { oauth_verifier: oauthVerifier },
    };

    const token = {
      key: oauthToken,
      secret: requestTokenSecret,
    };

    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: oauth.toHeader(oauth.authorize(request_data, token)) as unknown as Record<
        string,
        string
      >,
    });

    if (!response.ok) throw new Error(`Failed to get access token: ${response.statusText}`);

    const text = await response.text();
    const params = new URLSearchParams(text);

    res.json({
      userId: params.get('userID'),
      apiKey: params.get('oauth_token'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

zoteroRouter.post('/api', async (req, res) => {
  try {
    const { endpoint, credentials, params } = req.body;

    const url = new URL(`https://api.zotero.org/users/${credentials.userId}/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value as string)
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Zotero-API-Key': credentials.apiKey,
        'Zotero-API-Version': '3',
      },
    });

    if (!response.ok) throw new Error(`Zotero API Error: ${response.statusText}`);

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
