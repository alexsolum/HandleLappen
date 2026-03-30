import { get, set } from 'idb-keyval'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueuedBasePayload = {
	itemId: string
	listId: string
	itemName: string
	userId: string
	timestamp: string
}

export type QueuedMutation =
	| {
			id: string
			type: 'toggle'
			payload: QueuedBasePayload & {
				isChecked: boolean
				mode: 'history-toggle'
				historyContext?: {
					listName?: string | null
					storeId?: string | null
					storeName?: string | null
				}
			}
			enqueuedAt: string
	  }
	| {
			id: string
			type: 'home-delete'
			payload: QueuedBasePayload & {
				mode: 'home-delete'
			}
			enqueuedAt: string
	  }

export type ReplayBatchResult = {
	succeeded: number
	failed: number
	survivors: QueuedMutation[]
}

const QUEUE_KEY = 'offline-mutation-queue'
const FALLBACK_QUEUE_KEY = 'handleappen-offline-mutation-queue'
let inMemoryQueue: QueuedMutation[] | null = null

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
	if (inMemoryQueue && inMemoryQueue.length > 0) return inMemoryQueue

	const fallback = readFallbackQueue()
	if (fallback.length > 0) {
		inMemoryQueue = fallback
		return fallback
	}

	try {
		const stored = (await get(QUEUE_KEY)) as QueuedMutation[] | undefined
		if (stored) {
			inMemoryQueue = stored
			return stored
		}
		return fallback
	} catch {
		return fallback
	}
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
	inMemoryQueue = queue
	writeFallbackQueue(queue)

	try {
		await set(QUEUE_KEY, queue)
	} catch {
		return
	}
}

export async function enqueue(mutation: QueuedMutation): Promise<number> {
	const existing = await readQueue()
	const filtered = existing.filter((entry) => entry.id !== mutation.id)
	const next = [...filtered, mutation]
	await writeQueue(next)
	return next.length
}

export async function getAll(): Promise<QueuedMutation[]> {
	return readQueue()
}

export async function clear(): Promise<void> {
	await writeQueue([])
}

export async function replaceQueue(entries: QueuedMutation[]): Promise<void> {
	await writeQueue(entries)
	if (typeof window !== 'undefined') {
		;(window as Window & { __pendingQueueCount?: number }).__pendingQueueCount = entries.length
	}
}

export async function replayMutation(
	supabase: SupabaseClient,
	entry: QueuedMutation
): Promise<void> {
	const { itemId, listId, itemName, userId, timestamp } = entry.payload

	if (entry.type === 'home-delete') {
		const { error, status } = await supabase.from('list_items').delete().eq('id', itemId)
		if (error || (status && status >= 400)) {
			throw error ?? new Error('offline replay delete failed')
		}
		return
	}

	const { isChecked, historyContext } = entry.payload

	const { error: itemError, status: itemStatus } = await supabase
		.from('list_items')
		.update({
			is_checked: isChecked,
			checked_at: isChecked ? timestamp : null
		})
		.eq('id', itemId)

	if (itemError || (itemStatus && itemStatus >= 400)) {
		throw itemError ?? new Error('offline replay toggle failed')
	}

	if (isChecked) {
		const { error: historyError, status: historyStatus } = await supabase
			.from('item_history')
			.insert({
				list_id: listId,
				item_id: itemId,
				item_name: itemName,
				checked_by: userId,
				checked_at: timestamp,
				list_name: historyContext?.listName ?? null,
				store_id: historyContext?.storeId ?? null,
				store_name: historyContext?.storeName ?? null
			})
		if (historyError || (historyStatus && historyStatus >= 400)) {
			throw historyError ?? new Error('offline replay history failed')
		}

	}
}

export async function replayBatch(
	supabase: SupabaseClient,
	queued: QueuedMutation[]
): Promise<ReplayBatchResult> {
	let succeeded = 0
	const survivors: QueuedMutation[] = []

	for (const entry of queued) {
		try {
			await replayMutation(supabase, entry)
			succeeded += 1
		} catch {
			survivors.push(entry)
		}
	}

	return {
		succeeded,
		failed: survivors.length,
		survivors
	}
}
