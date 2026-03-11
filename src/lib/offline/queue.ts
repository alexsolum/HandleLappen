import { get, set } from 'idb-keyval'
import type { SupabaseClient } from '@supabase/supabase-js'

export type QueuedMutation = {
	id: string
	type: 'toggle'
	payload: {
		itemId: string
		listId: string
		isChecked: boolean
		itemName: string
		userId: string
		timestamp: string
	}
	enqueuedAt: string
}

const QUEUE_KEY = 'offline-mutation-queue'

export async function enqueue(mutation: QueuedMutation): Promise<void> {
	const existing = ((await get(QUEUE_KEY)) as QueuedMutation[] | undefined) ?? []
	const filtered = existing.filter((entry) => entry.id !== mutation.id)

	await set(QUEUE_KEY, [...filtered, mutation])
}

export async function getAll(): Promise<QueuedMutation[]> {
	return ((await get(QUEUE_KEY)) as QueuedMutation[] | undefined) ?? []
}

export async function clear(): Promise<void> {
	await set(QUEUE_KEY, [])
}

export async function replayMutation(
	supabase: SupabaseClient,
	entry: QueuedMutation
): Promise<void> {
	const { itemId, listId, isChecked, itemName, userId, timestamp } = entry.payload

	const { error: itemError } = await supabase
		.from('list_items')
		.update({
			is_checked: isChecked,
			checked_at: isChecked ? timestamp : null
		})
		.eq('id', itemId)

	if (itemError) throw itemError

	if (isChecked) {
		const { error: historyError } = await supabase.from('item_history').insert({
			list_id: listId,
			item_id: itemId,
			item_name: itemName,
			checked_by: userId,
			checked_at: timestamp
		})

		if (historyError) throw historyError
	}
}
