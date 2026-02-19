import { redis } from '@devvit/web/server'

import type { VoteChoice } from '../../shared/types'
import {
  getPostData,
  getUserVote,
  getVoterIds,
  incrementUserStat,
  keys,
  removeFromUnrevealed,
} from './redis-helpers'
import { calculateDetectiveScore, calculateLiarScore } from './scoring'

export const revealPost = async (postId: string): Promise<void> => {
  const post = await getPostData(postId)
  if (!post || post.revealed === 'true') return

  await redis.hSet(keys.post(postId), { revealed: 'true' })

  const totalVotes = parseInt(post.totalVotes, 10)
  if (totalVotes === 0) {
    await removeFromUnrevealed(postId)
    return
  }

  const lieIndex = post.lieIndex as VoteChoice
  const votesForLie = parseInt(
    post[`votesFor${lieIndex}` as keyof typeof post] as string,
    10
  )
  const correctGuesses = votesForLie
  const wrongGuesses = totalVotes - correctGuesses
  const percentFooled =
    totalVotes > 0 ? (wrongGuesses / totalVotes) * 100 : 0
  const percentCorrect =
    totalVotes > 0 ? (correctGuesses / totalVotes) * 100 : 0

  const liarScore = calculateLiarScore(percentFooled, totalVotes)
  await incrementUserStat(post.authorId, 'totalLiarScore', liarScore)
  await incrementUserStat(post.authorId, 'totalPosts', 1)

  const voterIds = await getVoterIds(postId)
  for (const voterId of voterIds) {
    const voterChoice = await getUserVote(postId, voterId)
    if (!voterChoice) continue

    const isCorrect = voterChoice === lieIndex
    const detectiveScore = calculateDetectiveScore(isCorrect, percentCorrect)

    await incrementUserStat(voterId, 'totalDetectiveScore', detectiveScore)
    await incrementUserStat(voterId, 'totalVotes', 1)
    if (isCorrect) {
      await incrementUserStat(voterId, 'correctVotes', 1)
    }
  }

  await removeFromUnrevealed(postId)
}
