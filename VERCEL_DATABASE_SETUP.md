# Vercel Database Connection Setup

## Problem
Vercel serverless functions can't reach Supabase database on port 5432.

## Solution
Use Supabase's **Session Pooler** (NOT Transaction Pooler) for IPv4 compatibility with Vercel.

## Steps to Fix:

### 1. Get Session Pooler URL from Supabase

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection String** section
5. **Important**: Select **Session pooler** method (this provides free IPv4 proxying)
6. Copy the **URI** connection string

It should look like:
```
postgresql://postgres.rcssplhcspjpvwdtwqwl:YOUR_ACTUAL_PASSWORD_HERE@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**Critical**: Replace `YOUR_ACTUAL_PASSWORD_HERE` with your **real database password** (same password you use in `.env.local` for local development).

**Important**: 
- Use **Session pooler**, NOT Transaction pooler
- Use port `5432` (Session pooler), NOT `6543` (Transaction pooler)
- The hostname should be `aws-0-REGION.pooler.supabase.com`
- Session pooler provides **free IPv4 proxying** and is recommended for Vercel

**Why Session Pooler?**
- Free IPv4 proxying (no $4/month add-on needed)
- Recommended for Vercel deployments
- Uses port 5432

### 2. Get Your Database Password

The password is stored in Supabase:

1. Go to **Settings** → **Database** → **Database Password**
2. Copy your password (or reset it if needed)
3. This is the **same password** you use in `.env.local`

### 3. Update DATABASE_URL in Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (loopvesper)
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL` and click the three dots (`...`)
5. Click **Edit**
6. Replace `[YOUR-PASSWORD]` with your actual password from Supabase
7. Paste the **complete** connection string (with real password)
8. Click **Save**
9. **Redeploy** the project (go to Deployments → ... → Redeploy)

### 4. Alternative: Enable Direct Connection (NOT Recommended)

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

