import { randomBytes, createHash, randomUUID } from 'node:crypto';
import axios from 'axios';

const AUTH_BASE = 'https://polza.ai/api/auth';

export function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64url')
    .slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

export function generateState(): string {
  return randomUUID();
}

export function buildAuthorizeUrl(params: {
  callbackUrl: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('callback_url', params.callbackUrl);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('app_name', 'AI CLI');
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  callbackUrl: string;
}): Promise<{ key: string; user_id: string }> {
  const { data } = await axios.post(`${AUTH_BASE}/token`, {
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
    callback_url: params.callbackUrl,
  });
  return data as { key: string; user_id: string };
}
