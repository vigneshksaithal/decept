import { redis } from '@devvit/web/server'

import type { PostData, UserStats, VoteChoice } from '../../shared/types'
import { RATE_LIMIT_EXPIRE_SECONDS } from './constants'

const PREFIX = 'decept'

export const keys = {
  post: (postId: string): string => `${PREFIX}:post:${postId}`,
  voters: (postId: string): string => `${PREFIX}:post:${postId}:voters`,
  vote: (postId: string, userId: string): string =>
    `${PREFIX}:post:${postId}:vote:${userId}`,
  userStats: (userId: string): string => `${PREFIX}:user:${userId}:stats`,
  rateLimit: (userId: string, type: 'posts' | 'votes', date: string): string =>
    `${PREFIX}:ratelimit:${userId}:${type}:${date}`,
  unrevealed: `${PREFIX}:posts:unrevealed`,
} as const

const getTodayDate = (): string => {
  const d = new Date()
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getPostData = async (postId: string): Promise<PostData | null> => {
  const data = await redis.hGetAll(keys.post(postId))
  if (!data || Object.keys(data).length === 0) return null
  return data as unknown as PostData
}

export const savePostData = async (
  postId: string,
  data: PostData
): Promise<void> => {
  await redis.hSet(keys.post(postId), data as unknown as Record<string, string>)
}

export const getUserVote = async (
  postId: string,
  userId: string
): Promise<VoteChoice | null> => {
  const vote = await redis.get(keys.vote(postId, userId))
  if (!vote) return null
  return vote as VoteChoice
}

export const hasVoted = async (
  postId: string,
  userId: string
): Promise<boolean> => {
  const vote = await redis.get(keys.vote(postId, userId))
  return vote !== null && vote !== undefined
}

export const recordVote = async (
  postId: string,
  userId: string,
  vote: VoteChoice
): Promise<number> => {
  await redis.set(keys.vote(postId, userId), vote)
  await redis.zAdd(keys.voters(postId), {
    member: userId,
    score: Date.now(),
  })

  const voteField = `votesFor${vote}` as const
  await redis.hIncrBy(keys.post(postId), voteField, 1)
  const newTotal = await redis.hIncrBy(keys.post(postId), 'totalVotes', 1)
  return newTotal
}

export const getVoterIds = async (postId: string): Promise<string[]> => {
  const members = await redis.zRange(keys.voters(postId), 0, -1, {
    by: 'rank',
  })
  return members.map((m) => m.member)
}

export const addToUnrevealed = async (
  postId: string,
  createdAt: number
): Promise<void> => {
  await redis.zAdd(keys.unrevealed, {
    member: postId,
    score: createdAt,
  })
}

export const removeFromUnrevealed = async (
  postId: string
): Promise<void> => {
  await redis.zRem(keys.unrevealed, [postId])
}

export const getExpiredUnrevealedPosts = async (
  cutoffTimestamp: number
): Promise<string[]> => {
  const members = await redis.zRange(keys.unrevealed, 0, cutoffTimestamp, {
    by: 'score',
  })
  return members.map((m) => m.member)
}

export const checkRateLimit = async (
  userId: string,
  type: 'posts' | 'votes',
  max: number
): Promise<boolean> => {
  const date = getTodayDate()
  const key = keys.rateLimit(userId, type, date)
  const count = await redis.get(key)
  return count !== null && count !== undefined && parseInt(count, 10) >= max
}

export const incrementRateLimit = async (
  userId: string,
  type: 'posts' | 'votes'
): Promise<void> => {
  const date = getTodayDate()
  const key = keys.rateLimit(userId, type, date)
  const exists = await redis.get(key)
  if (exists === null || exists === undefined) {
    await redis.set(key, '1')
    await redis.expire(key, RATE_LIMIT_EXPIRE_SECONDS)
  } else {
    await redis.incrBy(key, 1)
  }
}

export const getUserStats = async (
  userId: string
): Promise<UserStats> => {
  const data = await redis.hGetAll(keys.userStats(userId))
  return {
    totalLiarScore: data?.totalLiarScore ?? '0',
    totalDetectiveScore: data?.totalDetectiveScore ?? '0',
    totalPosts: data?.totalPosts ?? '0',
    totalVotes: data?.totalVotes ?? '0',
    correctVotes: data?.correctVotes ?? '0',
  }
}

export const incrementUserStat = async (
  userId: string,
  field: keyof UserStats,
  amount: number
): Promise<void> => {
  const statsKey = keys.userStats(userId)
  const exists = await redis.hGetAll(statsKey)
  if (!exists || Object.keys(exists).length === 0) {
    await redis.hSet(statsKey, {
      totalLiarScore: '0',
      totalDetectiveScore: '0',
      totalPosts: '0',
      totalVotes: '0',
      correctVotes: '0',
    })
  }
  await redis.hIncrBy(statsKey, field, amount)
}
