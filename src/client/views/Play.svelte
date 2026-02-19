<script lang="ts">
  import type { PostView } from '../../shared/types'
  import { submitVote } from '../lib/api'
  import StatementCard from '../components/StatementCard.svelte'

  type Props = {
    post: PostView
    onrevealed: () => void
  }

  const { post, onrevealed }: Props = $props()

  let selectedIndex = $state<number | null>(null)
  let confirming = $state(false)
  let voting = $state(false)
  let localVoted = $state(false)
  let localTotalVotes = $state<number | null>(null)
  let error = $state<string | null>(null)

  const voted = $derived(localVoted || post.userVote !== null)
  const totalVotes = $derived(localTotalVotes ?? post.totalVotes)

  const handleSelect = (idx: number): void => {
    if (voted || voting || post.isAuthor) return
    selectedIndex = idx
    confirming = true
  }

  const handleConfirm = async (): Promise<void> => {
    if (selectedIndex === null || voting) return
    voting = true
    error = null

    try {
      const result = await submitVote(post.postId, selectedIndex)
      if (result.status === 'success') {
        localVoted = true
        localTotalVotes = result.data.totalVotes
        confirming = false
      } else {
        error = result.message
        confirming = false
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to vote'
      confirming = false
    } finally {
      voting = false
    }
  }

  const handleCancel = (): void => {
    confirming = false
    selectedIndex = null
  }

  $effect(() => {
    if (post.revealed) {
      onrevealed()
    }
  })
</script>

<div class="flex h-full w-full flex-col gap-3 p-3">
  <div class="flex-none text-center">
    <h2 class="text-lg font-bold text-neutral-100">Spot the Lie</h2>
    <p class="text-xs text-neutral-400">
      {#if post.isAuthor}
        You created this post. Waiting for votes...
      {:else if voted}
        Your vote is locked!
      {:else}
        Tap the statement you think is the lie.
      {/if}
    </p>
  </div>

  <div class="flex flex-1 min-h-0 flex-col gap-2.5 overflow-hidden">
    {#each post.statements as statement, i (i)}
      <StatementCard
        {statement}
        index={i + 1}
        selected={selectedIndex === i + 1}
        revealed={false}
        isLie={false}
        disabled={voted || post.isAuthor || confirming}
        onclick={() => { handleSelect(i + 1) }}
      />
    {/each}
  </div>

  {#if confirming && selectedIndex !== null}
    <div class="flex-none flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <p class="text-center text-sm text-amber-200">
        Statement {selectedIndex} is the lie?
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg bg-neutral-700 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-600"
          onclick={handleCancel}
          disabled={voting}
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-500"
          onclick={handleConfirm}
          disabled={voting}
        >
          {voting ? 'Voting...' : 'Confirm'}
        </button>
      </div>
    </div>
  {/if}

  {#if error}
    <p class="flex-none text-center text-xs text-red-400">{error}</p>
  {/if}

  {#if voted || post.isAuthor}
    <div class="flex-none text-center">
      <p class="text-sm text-neutral-400">
        {totalVotes} {totalVotes === 1 ? 'person has' : 'people have'} voted so far
      </p>
    </div>
  {/if}
</div>
