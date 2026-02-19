<script lang="ts">
  import { createGamePost } from '../lib/api'

  type Props = {
    onposted: () => void
  }

  const { onposted }: Props = $props()

  const STATEMENT_MIN = 10
  const STATEMENT_MAX = 200

  let statement1 = $state('')
  let statement2 = $state('')
  let statement3 = $state('')
  let lieIndex = $state(1)
  let submitting = $state(false)
  let error = $state<string | null>(null)

  const isValid = $derived(
    statement1.trim().length >= STATEMENT_MIN &&
    statement1.trim().length <= STATEMENT_MAX &&
    statement2.trim().length >= STATEMENT_MIN &&
    statement2.trim().length <= STATEMENT_MAX &&
    statement3.trim().length >= STATEMENT_MIN &&
    statement3.trim().length <= STATEMENT_MAX
  )

  const charCount = (text: string): string => {
    const len = text.trim().length
    if (len < STATEMENT_MIN) return `${len}/${STATEMENT_MIN} min`
    return `${len}/${STATEMENT_MAX}`
  }

  const charColor = (text: string): string => {
    const len = text.trim().length
    if (len === 0) return 'text-neutral-500'
    if (len < STATEMENT_MIN) return 'text-amber-400'
    if (len > STATEMENT_MAX) return 'text-red-400'
    return 'text-emerald-400'
  }

  const handleSubmit = async (): Promise<void> => {
    if (!isValid || submitting) return
    submitting = true
    error = null

    try {
      const result = await createGamePost({
        statement1: statement1.trim(),
        statement2: statement2.trim(),
        statement3: statement3.trim(),
        lieIndex,
      })

      if (result.status === 'success') {
        onposted()
      } else {
        error = result.message
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong'
    } finally {
      submitting = false
    }
  }
</script>

<div class="flex h-full w-full flex-col gap-3 p-3">
  <h2 class="flex-none text-center text-lg font-bold text-neutral-100">
    2 Truths & 1 Lie
  </h2>
  <p class="flex-none text-center text-xs text-neutral-400">
    Write 3 statements. Mark which one is the lie.
  </p>

  <div class="flex flex-1 min-h-0 flex-col gap-2.5 overflow-hidden">
    {#each [
      { value: statement1, idx: 1, placeholder: 'First statement...' },
      { value: statement2, idx: 2, placeholder: 'Second statement...' },
      { value: statement3, idx: 3, placeholder: 'Third statement...' },
    ] as field (field.idx)}
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="lie"
              value={field.idx}
              checked={lieIndex === field.idx}
              onchange={() => { lieIndex = field.idx }}
              class="accent-red-500"
            />
            <span class="text-xs text-red-400 font-medium">Lie</span>
          </label>
          <span class={`ml-auto text-xs ${charColor(field.value)}`}>
            {charCount(field.value)}
          </span>
        </div>
        <textarea
          class="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          rows={2}
          maxlength={STATEMENT_MAX}
          placeholder={field.placeholder}
          value={field.value}
          oninput={(e) => {
            const val = (e.target as HTMLTextAreaElement).value
            if (field.idx === 1) statement1 = val
            else if (field.idx === 2) statement2 = val
            else statement3 = val
          }}
        ></textarea>
      </div>
    {/each}
  </div>

  {#if error}
    <p class="flex-none text-center text-xs text-red-400">{error}</p>
  {/if}

  <button
    type="button"
    class="flex-none w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
    disabled={!isValid || submitting}
    onclick={handleSubmit}
  >
    {submitting ? 'Posting...' : 'Post'}
  </button>
</div>
