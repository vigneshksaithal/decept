import {
  DETECTIVE_CORRECT,
  DETECTIVE_PARTICIPATION,
  DETECTIVE_SHARP_EYE,
  DETECTIVE_SHARP_EYE_THRESHOLD,
  FOOLED_BONUS_70,
  FOOLED_BONUS_90,
  VOTE_WEIGHT_CAP,
  VOTE_WEIGHT_DIVISOR,
} from './constants'

export const calculateLiarScore = (
  percentFooled: number,
  totalVotes: number
): number => {
  let base = percentFooled

  if (percentFooled > 90) {
    base += FOOLED_BONUS_90
  } else if (percentFooled > 70) {
    base += FOOLED_BONUS_70
  }

  const voteWeight = Math.min(
    1 + totalVotes / VOTE_WEIGHT_DIVISOR,
    VOTE_WEIGHT_CAP
  )

  return Math.round(base * voteWeight)
}

export const calculateDetectiveScore = (
  correct: boolean,
  percentCorrect: number
): number => {
  if (!correct) return DETECTIVE_PARTICIPATION

  if (percentCorrect < DETECTIVE_SHARP_EYE_THRESHOLD) {
    return DETECTIVE_SHARP_EYE
  }

  return DETECTIVE_CORRECT
}
