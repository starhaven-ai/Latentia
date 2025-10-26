# Vercel Environment Variables Setup

## Required Environment Variables

You **must** configure these in Vercel for authentication to work:

### 1. Supabase Configuration (Required for Authentication)

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://rcssplhcspjpvwdtwqwl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Database Connection (Already Configured)

```
DATABASE_URL=postgresql://postgres.rcssplhcspjpvwdtwqwl:YOUR_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Important**: Replace `YOUR_PASSWORD` with your actual database password (URL-encoded).

### 3. AI Model API Keys

```
GEMINI_API_KEY=your-google-api-key
REPLICATE_API_TOKEN=your-replicate-api-token
```

### 4. Application URL

```
NEXT_PUBLIC_APP_URL=https://loopvesper.vercel.app
```

## How to Check Current Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`loopvesper`)
3. Go to **Settings** → **Environment Variables**
4. Verify all variables above are set

## After Adding Variables

1. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click **...** (three dots) on the latest deployment
   - Click **Redeploy**

2. Wait for deployment to complete (~2 minutes)

3. Test authentication by logging in

## Troubleshooting

### "Session not found" or "Unauthorized" errors

**Cause**: Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Solution**: 
1. Check Vercel environment variables have both Supabase variables set
2. Make sure they don't have extra quotes or spaces
3. Redeploy after adding/changing variables

### Projects not loading after login

**Cause**: Database connection issue or missing environment variables

**Solution**:
1. Check Vercel logs for errors
2. Verify `DATABASE_URL` is set correctly in Vercel
3. Verify the connection string uses Session pooler format (port 5432)

