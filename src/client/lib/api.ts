import type {
  ApiResponse,
  CreatePostRequest,
  PostView,
  UserStats,
} from '../../shared/types'

const request = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = (await res.json()) as T
  return json
}

export const createGamePost = async (
  body: CreatePostRequest
): Promise<ApiResponse<{ postId: string }>> => {
  return await request<ApiResponse<{ postId: string }>>('/api/create', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const submitVote = async (
  postId: string,
  vote: number
): Promise<ApiResponse<{ totalVotes: number }>> => {
  return await request<ApiResponse<{ totalVotes: number }>>('/api/vote', {
    method: 'POST',
    body: JSON.stringify({ postId, vote }),
  })
}

export const getPost = async (
  postId: string
): Promise<ApiResponse<PostView>> => {
  return await request<ApiResponse<PostView>>(`/api/post/${postId}`)
}

export const fetchUserStats = async (): Promise<ApiResponse<UserStats>> => {
  return await request<ApiResponse<UserStats>>('/api/user/stats')
}
