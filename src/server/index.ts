import {
  context,
  createServer,
  getServerPort,
} from '@devvit/web/server'
import type { TaskRequest, TaskResponse } from '@devvit/web/server'
import { serve } from '@hono/node-server'
import type { Context } from 'hono'
import { Hono } from 'hono'

import type {
  ApiError,
  ApiSuccess,
  CreatePostRequest,
  PostView,
  UserStats,
  VoteChoice,
  VoteRequest,
} from '../shared/types'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_INTERNAL_ERROR,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  MAX_POSTS_PER_DAY,
  MAX_VOTES_PER_DAY,
  REVEAL_AFTER_MS,
  STATEMENT_MAX_LEN,
  STATEMENT_MIN_LEN,
  VOTE_THRESHOLD,
} from './lib/constants'
import { containsProfanity } from './lib/profanity'
import {
  addToUnrevealed,
  checkRateLimit,
  getExpiredUnrevealedPosts,
  getPostData,
  getUserStats,
  getUserVote,
  hasVoted,
  incrementRateLimit,
  recordVote,
  savePostData,
} from './lib/redis-helpers'
import { revealPost } from './lib/reveal'
import { createPost } from './post'

const app = new Hono()

const validateStatement = (s: unknown): s is string =>
  typeof s === 'string' &&
  s.trim().length >= STATEMENT_MIN_LEN &&
  s.trim().length <= STATEMENT_MAX_LEN

// ---------- Public API ----------

app.post('/api/create', async (c: Context) => {
  try {
    const userId = context.userId
    if (!userId) {
      return c.json<ApiError>(
        { status: 'error', message: 'Login required' },
        HTTP_STATUS_FORBIDDEN
      )
    }

    const postId = context.postId
    if (!postId) {
      return c.json<ApiError>(
        { status: 'error', message: 'No post context found' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const existing = await getPostData(postId)
    if (existing?.statement1) {
      return c.json<ApiError>(
        { status: 'error', message: 'This post already has statements' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const body = await c.req.json<CreatePostRequest>()
    const { statement1, statement2, statement3, lieIndex } = body

    if (
      !validateStatement(statement1) ||
      !validateStatement(statement2) ||
      !validateStatement(statement3)
    ) {
      return c.json<ApiError>(
        {
          status: 'error',
          message: `Each statement must be ${STATEMENT_MIN_LEN}–${STATEMENT_MAX_LEN} characters`,
        },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    if (![1, 2, 3].includes(lieIndex)) {
      return c.json<ApiError>(
        { status: 'error', message: 'lieIndex must be 1, 2, or 3' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    if (
      containsProfanity(statement1) ||
      containsProfanity(statement2) ||
      containsProfanity(statement3)
    ) {
      return c.json<ApiError>(
        {
          status: 'error',
          message: 'Statement contains inappropriate language',
        },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const rateLimited = await checkRateLimit(userId, 'posts', MAX_POSTS_PER_DAY)
    if (rateLimited) {
      return c.json<ApiError>(
        {
          status: 'error',
          message: `You can only create ${MAX_POSTS_PER_DAY} posts per day`,
        },
        HTTP_STATUS_TOO_MANY_REQUESTS
      )
    }

    const now = Date.now()

    await savePostData(postId, {
      authorId: userId,
      statement1: statement1.trim(),
      statement2: statement2.trim(),
      statement3: statement3.trim(),
      lieIndex: String(lieIndex) as VoteChoice,
      createdAt: String(now),
      revealed: 'false',
      totalVotes: '0',
      votesFor1: '0',
      votesFor2: '0',
      votesFor3: '0',
    })

    await addToUnrevealed(postId, now)
    await incrementRateLimit(userId, 'posts')

    return c.json<ApiSuccess<{ postId: string }>>({
      status: 'success',
      data: { postId },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create post'
    return c.json<ApiError>(
      { status: 'error', message },
      HTTP_STATUS_INTERNAL_ERROR
    )
  }
})

app.post('/api/vote', async (c: Context) => {
  try {
    const userId = context.userId
    if (!userId) {
      return c.json<ApiError>(
        { status: 'error', message: 'Login required' },
        HTTP_STATUS_FORBIDDEN
      )
    }

    const body = await c.req.json<VoteRequest>()
    const { postId, vote } = body

    if (!postId || ![1, 2, 3].includes(vote)) {
      return c.json<ApiError>(
        { status: 'error', message: 'Invalid postId or vote (must be 1, 2, or 3)' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const postData = await getPostData(postId)
    if (!postData) {
      return c.json<ApiError>(
        { status: 'error', message: 'Post not found' },
        HTTP_STATUS_NOT_FOUND
      )
    }

    if (postData.authorId === userId) {
      return c.json<ApiError>(
        { status: 'error', message: 'Cannot vote on your own post' },
        HTTP_STATUS_FORBIDDEN
      )
    }

    if (postData.revealed === 'true') {
      return c.json<ApiError>(
        { status: 'error', message: 'This post has already been revealed' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const alreadyVoted = await hasVoted(postId, userId)
    if (alreadyVoted) {
      return c.json<ApiError>(
        { status: 'error', message: 'You already voted on this post' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const rateLimited = await checkRateLimit(userId, 'votes', MAX_VOTES_PER_DAY)
    if (rateLimited) {
      return c.json<ApiError>(
        {
          status: 'error',
          message: `You can only cast ${MAX_VOTES_PER_DAY} votes per day`,
        },
        HTTP_STATUS_TOO_MANY_REQUESTS
      )
    }

    const voteChoice = String(vote) as VoteChoice
    const newTotal = await recordVote(postId, userId, voteChoice)
    await incrementRateLimit(userId, 'votes')

    if (newTotal >= VOTE_THRESHOLD) {
      await revealPost(postId)
    }

    return c.json<ApiSuccess<{ totalVotes: number }>>({
      status: 'success',
      data: { totalVotes: newTotal },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record vote'
    return c.json<ApiError>(
      { status: 'error', message },
      HTTP_STATUS_INTERNAL_ERROR
    )
  }
})

app.get('/api/post/:postId', async (c: Context) => {
  try {
    const postId = c.req.param('postId') ?? context.postId
    if (!postId) {
      return c.json<ApiError>(
        { status: 'error', message: 'postId is required' },
        HTTP_STATUS_BAD_REQUEST
      )
    }

    const postData = await getPostData(postId)
    if (!postData) {
      return c.json<ApiError>(
        { status: 'error', message: 'Post not found' },
        HTTP_STATUS_NOT_FOUND
      )
    }

    const userId = context.userId
    const userVote = userId ? await getUserVote(postId, userId) : null
    const revealed = postData.revealed === 'true'
    const isAuthor = userId === postData.authorId
    const totalVotes = parseInt(postData.totalVotes, 10)

    let deceptionPercent: number | null = null
    if (revealed && totalVotes > 0) {
      const lieKey = `votesFor${postData.lieIndex}` as keyof typeof postData
      const correctGuesses = parseInt(postData[lieKey] as string, 10)
      deceptionPercent = Math.round(
        ((totalVotes - correctGuesses) / totalVotes) * 100
      )
    }

    const view: PostView = {
      postId,
      authorId: postData.authorId,
      statements: [postData.statement1, postData.statement2, postData.statement3],
      revealed,
      totalVotes,
      userVote,
      isAuthor,
      lieIndex: revealed ? postData.lieIndex : null,
      votesFor1: revealed ? parseInt(postData.votesFor1, 10) : null,
      votesFor2: revealed ? parseInt(postData.votesFor2, 10) : null,
      votesFor3: revealed ? parseInt(postData.votesFor3, 10) : null,
      deceptionPercent,
    }

    return c.json<ApiSuccess<PostView>>({
      status: 'success',
      data: view,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load post'
    return c.json<ApiError>(
      { status: 'error', message },
      HTTP_STATUS_INTERNAL_ERROR
    )
  }
})

app.get('/api/user/stats', async (c: Context) => {
  try {
    const userId = context.userId
    if (!userId) {
      return c.json<ApiError>(
        { status: 'error', message: 'Login required' },
        HTTP_STATUS_FORBIDDEN
      )
    }

    const stats = await getUserStats(userId)
    return c.json<ApiSuccess<UserStats>>({
      status: 'success',
      data: stats,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load stats'
    return c.json<ApiError>(
      { status: 'error', message },
      HTTP_STATUS_INTERNAL_ERROR
    )
  }
})

// ---------- Internal Endpoints ----------

app.post('/internal/menu/post-create', async (c: Context) => {
  try {
    const post = await createPost('Decept: 2 Truths 1 Lie')
    const { subredditName } = context
    return c.json({
      navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create post'
    return c.json<ApiError>(
      { status: 'error', message },
      HTTP_STATUS_BAD_REQUEST
    )
  }
})

app.post('/internal/on-app-install', async (c: Context) => {
  return c.json<TaskResponse>({ status: 'ok' }, 200)
})

app.post('/internal/jobs/reveal-expired', async (c: Context) => {
  try {
    await c.req.json<TaskRequest>()
    const cutoff = Date.now() - REVEAL_AFTER_MS
    const expiredPostIds = await getExpiredUnrevealedPosts(cutoff)

    for (const postId of expiredPostIds) {
      await revealPost(postId)
    }

    return c.json<TaskResponse>({ status: 'ok' }, 200)
  } catch (error) {
    console.error('reveal-expired job failed:', error)
    return c.json<TaskResponse>({ status: 'ok' }, 200)
  }
})

// ---------- Server Bootstrap ----------

serve({ fetch: app.fetch, port: getServerPort(), createServer })
