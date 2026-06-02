/** Explore sub-tab index; survives switching away from Explore. */
let lastExploreTabIndex = 0;

export function getLastExploreTabIndex(): number {
  return lastExploreTabIndex;
}

export function setLastExploreTabIndex(index: number): void {
  lastExploreTabIndex = index;
}
