# Stanford Software Fair 2026 Developer Notes

The removable Software Fair experiment is keyed by `software_fair_2026`.

Feature flag and announcement config live in Convex table
`softwareFairFeatureConfigs`. Public reads and admin writes are isolated in
`packages/backend/convex/softwareFair.ts`.

Booth assignments live in Convex table `softwareFairBooths`. Active booths link
to hidden `museums` rows marked `isSoftwareFairOnly` so existing check-ins,
reviews, bookmarks, follows, and ratings stay museum-based.

To remove the feature after the fair, delete the mobile Software Fair provider
and UI overrides, the web admin Experimental Features section,
`packages/backend/convex/softwareFair.ts`, and the two Software Fair schema
tables. After exporting anything worth keeping, remove `museums` rows where
`isSoftwareFairOnly` is true.
