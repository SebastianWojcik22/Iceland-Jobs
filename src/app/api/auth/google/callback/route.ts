import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@/lib/supabase/server';

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

    const tokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        key: 'gmail_tokens',
        value: tokens,
      });
    }

    return NextResponse.redirect(`${origin}/dashboard/admin?gmail=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/admin?gmail=error`);
  }
}
