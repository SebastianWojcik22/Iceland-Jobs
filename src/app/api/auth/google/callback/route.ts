import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { saveTokens } from '@/lib/google/gmail';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard/admin?gmail=error`);
  }

  try {
    const response = await axios.post<TokenResponse>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Store in Supabase Storage so the cron job can read them without a user session.
    // Previously stored in user_settings (requires auth.getUser()) which broke
    // server-side cron requests that run without any active session.
    await saveTokens({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    });

    return NextResponse.redirect(`${origin}/dashboard/admin?gmail=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/admin?gmail=error`);
  }
}
