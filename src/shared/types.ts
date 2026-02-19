export type VoteChoice = '1' | '2' | '3'

export type PostData = {
  authorId: string
  statement1: string
  statement2: string
  statement3: string
  lieIndex: VoteChoice
  createdAt: string
  revealed: string
  totalVotes: string
  votesFor1: string
  votesFor2: string
  votesFor3: string
}

export type UserStats = {
  totalLiarScore: string
  totalDetectiveScore: string
  totalPosts: string
  totalVotes: string
  correctVotes: string
}

export type CreatePostRequest = {
  statement1: string
  statement2: string
  statement3: string
  lieIndex: number
}

export type VoteRequest = {
  postId: string
  vote: number
}

export type ApiSuccess<T> = {
  status: 'success'
  data: T
}

export type ApiError = {
  status: 'error'
  message: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PostView = {
  postId: string
  authorId: string
  statements: [string, string, string]
  revealed: boolean
  totalVotes: number
  userVote: VoteChoice | null
  isAuthor: boolean
  lieIndex: VoteChoice | null
  votesFor1: number | null
  votesFor2: number | null
  votesFor3: number | null
  deceptionPercent: number | null
}
