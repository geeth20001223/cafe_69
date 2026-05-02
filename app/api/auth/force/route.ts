import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to') || '/dashboard/inventory';
  
  // Create a response that redirects to login
  const res = NextResponse.redirect(new URL(`/auth.v1?redirect=${encodeURIComponent(to)}`, req.url));
  
  // Clear the auth cookie to force re-authentication
  res.cookies.delete('cafe69_token');
  
  return res;
}
