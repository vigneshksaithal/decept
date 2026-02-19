import { context, reddit } from '@devvit/web/server'

export const createPost = async (title: string): Promise<{ id: string }> => {
  const { subredditName } = context
  if (!subredditName) {
    throw new Error('subredditName is required')
  }

  return await reddit.submitCustomPost({
    subredditName,
    title,
    entry: 'default',
  })
}
