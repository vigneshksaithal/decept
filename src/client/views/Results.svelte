<script lang="ts">
  import type { PostView, VoteChoice } from '../../shared/types'
  import StatementCard from '../components/StatementCard.svelte'
  import VoteBar from '../components/VoteBar.svelte'

  type Props = {
    post: PostView
  }

  const { post }: Props = $props()

  const lieIdx = $derived(post.lieIndex as VoteChoice)
  const total = $derived(post.totalVotes)

  const voteCounts = $derived<[number, number, number]>([
    post.votesFor1 ?? 0,
    post.votesFor2 ?? 0,
    post.votesFor3 ?? 0,
  ])

  const pct = (count: number): number =>
    total > 0 ? Math.round((count / total) * 100) : 0

  const userGotIt = $derived(post.userVote === lieIdx)
  const deceptionPct = $derived(post.deceptionPercent ?? 0)
</script>

<div class="flex h-full w-full flex-col gap-3 p-3">
  <div class="flex-none text-center">
    <h2 class="text-lg font-bold text-neutral-100">Results</h2>
    <p class="text-sm text-amber-300">
      Fooled {deceptionPct}% of voters!
    </p>
  </div>

  <div class="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
    {#each post.statements as statement, i (i)}
      {@const idx = String(i + 1) as VoteChoice}
      {@const isLie = idx === lieIdx}
      <div class="flex flex-col gap-1">
        <StatementCard
          {statement}
          index={i + 1}
          selected={post.userVote === idx}
          revealed={true}
          {isLie}
          disabled={true}
          onclick={() => {}}
        />
        <VoteBar
          label={isLie ? 'LIE' : 'TRUTH'}
          percentage={pct(voteCounts[i] ?? 0)}
          {isLie}
        />
      </div>
    {/each}
  </div>

  <div class="flex-none text-center">
    {#if post.userVote}
      {#if userGotIt}
        <p class="text-sm font-semibold text-emerald-400">
          You got it right!
        </p>
      {:else}
        <p class="text-sm font-semibold text-red-400">
          You got fooled!
        </p>
      {/if}
    {:else if post.isAuthor}
      <p class="text-xs text-neutral-400">
        {total} total {total === 1 ? 'vote' : 'votes'}
      </p>
    {:else}
      <p class="text-xs text-neutral-400">You didn't vote on this one.</p>
    {/if}
  </div>
</div>
