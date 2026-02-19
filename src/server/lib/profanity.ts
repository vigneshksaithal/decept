const BANNED_WORDS: readonly string[] = [
  'ass', 'asshole', 'bastard', 'bitch', 'bollocks', 'bullshit',
  'cock', 'crap', 'cunt', 'damn', 'dick', 'dickhead',
  'fag', 'faggot', 'fuck', 'goddamn', 'hell', 'hoe',
  'jerk', 'kike', 'motherfucker', 'negro', 'nigga', 'nigger',
  'piss', 'prick', 'pussy', 'retard', 'shit', 'slut',
  'twat', 'whore', 'wanker',
] as const

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '$': 's',
  '5': 's',
  '7': 't',
  '!': 'i',
  '+': 't',
}

const normalize = (text: string): string => {
  let result = text.toLowerCase()
  for (const [leet, letter] of Object.entries(LEET_MAP)) {
    result = result.split(leet).join(letter)
  }
  return result.replace(/[^a-z]/g, '')
}

export const containsProfanity = (text: string): boolean => {
  const normalized = normalize(text)
  return BANNED_WORDS.some((word) => normalized.includes(word))
}
