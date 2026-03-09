<script lang="ts">
  let { data } = $props()
  let copied = $state(false)

  async function copyCode() {
    if (!data.inviteCode) return
    await navigator.clipboard.writeText(data.inviteCode)
    copied = true
    setTimeout(() => {
      copied = false
    }, 2000)
  }
</script>

<div class="px-4 py-6 space-y-6 max-w-lg mx-auto">
  <header>
    <h1 class="text-xl font-semibold text-gray-800">Husstand</h1>
  </header>

  <main class="space-y-6">
    <section>
      <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Medlemmer</h2>
      <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {#each data.members as member}
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
              {member.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800">
                {member.display_name}
                {#if member.id === data.currentUserId}
                  <span class="text-xs text-gray-400 font-normal ml-1">(deg)</span>
                {/if}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    {#if data.inviteCode}
      <section>
        <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Invitasjonskode</h2>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-3">Del denne koden med familiemedlemmer slik at de kan bli med i husstanden</p>
          <div class="flex items-center gap-3">
            <span class="font-mono text-2xl font-bold tracking-widest text-green-700 select-all flex-1">
              {data.inviteCode}
            </span>
            <button
              onclick={copyCode}
              class="shrink-0 text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied ? 'Kopiert!' : 'Kopier'}
            </button>
          </div>
        </div>
      </section>
    {/if}
  </main>
</div>
