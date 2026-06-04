/* global process */
import { OAuth2Client } from 'google-auth-library';

const googleOAuthClient = new OAuth2Client();

/**
 * Xác thực Google ID Token và trả về google sub ID nếu hợp lệ.
 */
export async function verifyGoogleToken(idToken: string | undefined): Promise<string | null> {
  if (!idToken) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('Google client ID is not configured on this server.');
    return null;
  }
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    return payload ? payload.sub : null;
  } catch (e) {
    console.error('Google token verification failed:', e);
    return null;
  }
}

/**
 * Xác thực Github Access Token và trả về github ID nếu hợp lệ.
 */
export async function verifyGithubToken(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'BeerVoter-Server',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      console.error('GitHub token verification failed status:', response.status);
      return null;
    }
    const data = (await response.json()) as { id: number | string };
    return data && data.id ? String(data.id) : null;
  } catch (e) {
    console.error('GitHub token verification failed error:', e);
    return null;
  }
}
