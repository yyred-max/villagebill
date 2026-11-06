The data is successfully saved in the blockchain (verified via `near view`), but it disappears from the UI when I refresh the page. This means there is a bug in the React frontend's data fetching logic.

Please fix `frontend/src/App.tsx` and `frontend/src/lib/contract.ts`:

1. **Ensure Data Fetching on Load**: The `useEffect` that calls `getGroups` must run as soon as the component mounts, AND again whenever the `selector` state or `accountId` changes (e.g., after wallet connection). Add `selector` and `accountId` to the `useEffect` dependency array if they are used inside.
2. **Error Handling**: Add a `console.error` inside the `catch` block of `getGroups` so we can see why it fails in the browser console.
3. **Polling/Refresh**: The ActivityFeed already polls every 10s, but ensure the main `groups` state in `App.tsx` is also updated when new data arrives.

Fix the state management in `App.tsx` so that refreshing the page immediately loads the groups from the blockchain.