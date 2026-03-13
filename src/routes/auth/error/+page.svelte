<script lang="ts">
  import { page } from '$app/state'
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-bold text-red-700">Innlogging feilet</h1>
    <p class="mt-2 text-sm text-gray-600">
      {page.url.searchParams.get('reason') === 'oauth_callback_failed'
        ? 'Google-innloggingen kunne ikke fullføres. Prøv igjen fra innloggingssiden.'
        : 'Autentisering feilet. Prøv igjen.'}
    </p>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <a
        href="/logg-inn"
        class="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Til innlogging
      </a>
      <a
        href="/registrer"
        class="inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Opprett konto
      </a>
    </div>
  </div>
</div>
