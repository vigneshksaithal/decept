<script lang="ts">
  import { context } from '@devvit/web/client'
  import { onMount } from 'svelte'
  import type { PostView } from '../shared/types'
  import { getPost } from './lib/api'
  import Create from './views/Create.svelte'
  import Play from './views/Play.svelte'
  import Results from './views/Results.svelte'

  type View = 'loading' | 'create' | 'play' | 'results' | 'error'

  let view = $state<View>('loading')
  let post = $state<PostView | null>(null)
  let errorMsg = $state<string | null>(null)

  const postId = context.postId

  const loadPost = async (): Promise<void> => {
    if (!postId) {
      view = 'create'
      return
    }

    try {
      const result = await getPost(postId)
      if (result.status === 'error') {
        view = 'create'
        return
      }

      post = result.data

      if (!post.statements[0]) {
        view = 'create'
        return
      }

      if (post.revealed) {
        view = 'results'
      } else {
        view = 'play'
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to load post'
      view = 'error'
    }
  }

  const handlePosted = async (): Promise<void> => {
    view = 'loading'
    await loadPost()
  }

  const handleRevealed = (): void => {
    view = 'results'
  }

  onMount(() => {
    loadPost()
  })
</script>

<div class="h-full w-full overflow-hidden flex flex-col bg-neutral-900 text-neutral-100">
  {#if view === 'loading'}
    <div class="flex flex-1 items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-indigo-500"></div>
        <p class="text-sm text-neutral-400">Loading...</p>
      </div>
    </div>
  {:else if view === 'create'}
    <Create onposted={handlePosted} />
  {:else if view === 'play' && post}
    <Play {post} onrevealed={handleRevealed} />
  {:else if view === 'results' && post}
    <Results {post} />
  {:else if view === 'error'}
    <div class="flex flex-1 items-center justify-center">
      <p class="text-sm text-red-400">{errorMsg ?? 'Something went wrong'}</p>
    </div>
  {/if}
</div>
