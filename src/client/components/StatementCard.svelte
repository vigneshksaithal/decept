<script lang="ts">
  type Props = {
    statement: string
    index: number
    selected: boolean
    revealed: boolean
    isLie: boolean
    disabled: boolean
    onclick: () => void
  }

  const { statement, index, selected, revealed, isLie, disabled, onclick }: Props = $props()

  const label = $derived(`Statement ${index}`)

  const cardClasses = $derived.by(() => {
    const base = 'w-full rounded-xl px-4 py-3 text-left transition-all duration-200 border-2'

    if (revealed && isLie) {
      return `${base} border-red-500 bg-red-500/10 text-red-200`
    }
    if (revealed && !isLie) {
      return `${base} border-emerald-500 bg-emerald-500/10 text-emerald-200`
    }
    if (selected) {
      return `${base} border-amber-400 bg-amber-400/10 text-amber-100 ring-2 ring-amber-400/30`
    }
    if (disabled) {
      return `${base} border-neutral-700 bg-neutral-800/50 text-neutral-400 cursor-default`
    }
    return `${base} border-neutral-600 bg-neutral-800 text-neutral-100 hover:border-neutral-400 cursor-pointer`
  })
</script>

<button
  class={cardClasses}
  {disabled}
  onclick={onclick}
  aria-label={label}
  type="button"
>
  <div class="flex items-start gap-3">
    <span class="flex-none mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-neutral-300">
      {index}
    </span>
    <p class="text-sm leading-relaxed">{statement}</p>
  </div>

  {#if revealed}
    <div class="mt-2 flex items-center gap-1.5 text-xs font-semibold">
      {#if isLie}
        <span>&#10060; LIE</span>
      {:else}
        <span>&#9989; TRUTH</span>
      {/if}
    </div>
  {/if}
</button>
