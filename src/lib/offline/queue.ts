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
const FALLBACK_QUEUE_KEY = 'handleappen-offline-mutation-queue'

function readFallbackQueue(): QueuedMutation[] {
	if (typeof window === 'undefined') return []

	const raw = window.localStorage.getItem(FALLBACK_QUEUE_KEY)
	if (!raw) return []

	try {
		return JSON.parse(raw) as QueuedMutation[]
	} catch {
		return []
	}
}

function writeFallbackQueue(queue: QueuedMutation[]) {
	if (typeof window === 'undefined') return
	window.localStorage.setItem(FALLBACK_QUEUE_KEY, JSON.stringify(queue))
}

async function readQueue(): Promise<QueuedMutation[]> {
	try {
		return ((await get(QUEUE_KEY)) as QueuedMutation[] | undefined) ?? readFallbackQueue()
	} catch {
		return readFallbackQueue()
	}
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
	try {
		await set(QUEUE_KEY, queue)
	} catch {
		writeFallbackQueue(queue)
		return
	}

	writeFallbackQueue(queue)
}

export async function enqueue(mutation: QueuedMutation): Promise<void> {
	const existing = await readQueue()
	const filtered = existing.filter((entry) => entry.id !== mutation.id)

	await writeQueue([...filtered, mutation])
}

export async function getAll(): Promise<QueuedMutation[]> {
	return readQueue()
}

export async function clear(): Promise<void> {
	await writeQueue([])
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
