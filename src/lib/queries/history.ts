import type { SupabaseClient } from '@supabase/supabase-js'

export type HistoryItem = {
  id: string
  itemName: string
  memberName: string
  checkedAt: string
}

export type HistorySession = {
  key: string
  checkedAt: string
  dateLabel: string
  storeName: string | null
  listName: string
  items: HistoryItem[]
}

export type HistoryGroup = {
  dateKey: string
  dateLabel: string
  sessions: HistorySession[]
}

type HistoryRow = {
  id: string
  list_id: string
  item_name: string
  checked_by: string | null
  checked_at: string
  list_name: string | null
  store_name: string | null
}

type ProfileRow = {
  id: string
  display_name: string
}

type ListRow = {
  id: string
  name: string
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateKey(value: string) {
  return value.slice(0, 10)
}

export async function createHistoryQuery(supabase: SupabaseClient): Promise<HistoryGroup[]> {
  const { data, error } = await supabase
    .from('item_history')
    .select('id, list_id, item_name, checked_by, checked_at, list_name, store_name')
    .order('checked_at', { ascending: false })
    .limit(200)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as HistoryRow[]
  if (rows.length === 0) {
    return []
  }

  const memberIds = [...new Set(rows.map((row) => row.checked_by).filter((value): value is string => value != null))]
  const listIds = [...new Set(rows.map((row) => row.list_id))]

  const [profilesResult, listsResult] = await Promise.all([
    memberIds.length === 0
      ? Promise.resolve({ data: [] as ProfileRow[], error: null })
      : supabase.from('profiles').select('id, display_name').in('id', memberIds),
    supabase.from('lists').select('id, name').in('id', listIds),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }

  if (listsResult.error) {
    throw listsResult.error
  }

  const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name]))
  const listById = new Map((listsResult.data ?? []).map((list: ListRow) => [list.id, list.name]))

  const grouped = new Map<string, HistoryGroup>()

  for (const row of rows) {
    const dateKey = formatDateKey(row.checked_at)
    const dateLabel = formatDateLabel(row.checked_at)
    const listName = row.list_name ?? listById.get(row.list_id) ?? 'Uten navn'
    const sessionKey = `${dateKey}:${row.store_name ?? ''}:${row.list_id}`

    let dateGroup = grouped.get(dateKey)
    if (!dateGroup) {
      dateGroup = { dateKey, dateLabel, sessions: [] }
      grouped.set(dateKey, dateGroup)
    }

    let session = dateGroup.sessions.find((entry) => entry.key === sessionKey)
    if (!session) {
      session = {
        key: sessionKey,
        checkedAt: row.checked_at,
        dateLabel,
        storeName: row.store_name,
        listName,
        items: [],
      }
      dateGroup.sessions.push(session)
    }

    session.items.push({
      id: row.id,
      itemName: row.item_name,
      memberName: row.checked_by ? (profileById.get(row.checked_by) ?? 'Ukjent medlem') : 'Ukjent medlem',
      checkedAt: row.checked_at,
    })
  }

  return [...grouped.values()].map((group) => ({
    ...group,
    sessions: group.sessions.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt)),
  }))
}
