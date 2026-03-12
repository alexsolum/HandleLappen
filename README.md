# HandleAppen

Family shopping list app built with SvelteKit and Supabase.

## Local development

1. Install dependencies:

```sh
npm install
```

2. Start local Supabase:

```sh
npx supabase start
```

3. Copy `.env.example` values into your local env file and start the app:

```sh
npm run dev
```

## Google Auth with Supabase

The app already supports email/password and Google sign-in through Supabase Auth.

### App routes used by OAuth

- Login page: `/logg-inn`
- Register page: `/registrer`
- OAuth callback: `/auth/callback`
- OAuth failure page: `/auth/error`

### Supabase dashboard setup

1. Open Supabase Dashboard.
2. Go to `Authentication -> Providers -> Google`.
3. Enable the Google provider.
4. Paste your Google OAuth client ID and client secret.
5. Add these redirect URLs in Supabase Auth URL configuration:
   - `http://localhost:5173/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback`
   - Your custom production domain callback, if you use one

### Google Cloud Console setup

Create a Web OAuth client in Google Cloud and add the callback URL Supabase gives you in the provider setup screen. Supabase handles the provider exchange; the app only needs the callback route above.

### Local behavior

- Clicking `Fortsett med Google` sends the user to Supabase OAuth.
- After a successful callback, returning users land on their intended page.
- New users without a household are redirected to `/velkommen` to create or join a household.

## Deploying to Vercel

Set these environment variables in Vercel:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If you use the Playwright helpers or admin scripts outside production runtime, also keep `SUPABASE_SERVICE_ROLE_KEY` out of the browser and only in secure local/CI contexts.

After deployment, add the final Vercel domain callback URL to Supabase Auth and to your Google OAuth app.
