export const COMMUNITY_COLORS = [
  '#1d4ed8',
  '#b45309',
  '#0f766e',
  '#9f1239',
  '#6d28d9',
  '#365314',
  '#075985',
  '#9a3412',
  '#334155',
  '#a16207',
] as const

export function communityColor(community: number): string {
  const i = Math.max(0, community - 1)
  return COMMUNITY_COLORS[i % COMMUNITY_COLORS.length]
}
