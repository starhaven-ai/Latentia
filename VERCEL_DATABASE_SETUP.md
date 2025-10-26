# Vercel Database Connection Setup

## Problem
Vercel serverless functions can't reach Supabase database on port 5432.

## Solution
Use Supabase's **Connection Pooler** instead of direct connection.

## Steps to Fix:

### 1. Get Connection Pooler URL from Supabase

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection String** section
5. Click **Connection Pooling** tab
6. Copy the **URI** connection string

It should look like:
```
postgresql://postgres:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important**: Use port `6543` (connection pooler), NOT `5432` (direct connection).

### 2. Update DATABASE_URL in Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (loopvesper)
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL` and click the three dots (`...`)
5. Click **Edit**
6. Paste the connection pooler URL
7. Click **Save**
8. **Redeploy** the project (go to Deployments → ... → Redeploy)

### 3. Alternative: Enable Direct Connection (NOT Recommended)

If connection pooler doesn't work, you can enable direct connections:

1. In Supabase, go to **Settings** → **Database**
2. Find **Connection Pooling**
3. Enable **Direct connections**
4. Use the direct connection URL

**Note**: This is not recommended for production as it doesn't scale well with serverless functions.

## Why This Happens

Serverless functions (Vercel) have connection limits. Direct database connections (port 5432) exhaust these limits quickly. Connection pooling (port 6543) handles many concurrent connections efficiently.

## Testing

After updating the DATABASE_URL:
1. Wait for Vercel deployment to complete (~2 minutes)
2. Try creating a project again
3. Check Vercel logs if it still fails

