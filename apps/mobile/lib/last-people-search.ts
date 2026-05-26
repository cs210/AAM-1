/** Last People-tab query; survives Explore unmount when switching to Profile. */
let lastPeopleSearch = '';

export function getLastPeopleSearch(): string {
  return lastPeopleSearch;
}

export function setLastPeopleSearch(query: string): void {
  lastPeopleSearch = query;
}
