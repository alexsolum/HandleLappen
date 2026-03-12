export const activeListStore = $state({
  listId: null as string | null,
  listName: null as string | null,
})

export function setActiveList(input: { id: string; name: string }) {
  activeListStore.listId = input.id
  activeListStore.listName = input.name
}

export function clearActiveList() {
  activeListStore.listId = null
  activeListStore.listName = null
}
