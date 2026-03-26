# LLM Guide

## What this app does

Real-time video conferencing with AI-powered meeting notes. Users create or join rooms, talk via Daily.co video, chat and get live transcription via ElevenLabs, then on meeting end an AI summary is generated and emailed to authenticated participants.

## Features

- **Video calls**: Daily.co rooms, max 10 participants, adaptive grid layout
- **Real-time chat**: Supabase Realtime broadcast channels (`room:{roomId}`), messages persisted to Postgres
- **Live transcription**: ElevenLabs Scribe STT, partial text broadcast (300ms throttle), committed segments saved as chat messages with type `"transcript"`
- **Meeting summaries**: OpenAI gpt-4o-mini via Vercel AI SDK, generates title + summary + key topics + action items + decisions
- **Email delivery**: Resend sends HTML summary to Clerk-authenticated participants, records stored in Redis
- **Auth**: Clerk (optional — anonymous users can join but don't get emails)
- **Media preview**: Pre-join camera/mic testing with device selection, settings carry into the call
- **Admission control**: Room owner can require approval before joiners enter. Owner identified via `ownerSecret` (SHA-256 hashed in DB) stored in `sessionStorage`, with Clerk userId fallback. Admission grants stored in Redis (60s TTL). Realtime signaling via `admission:{roomId}` channel
- **Ownership transfer**: When an anonymous owner leaves, ownership transfers to the next participant (preferring Clerk-authenticated users). Room only closes when empty. Logged-in owners can leave and re-enter from the preview screen.
- **Owner-only controls**: Only the room owner sees the "End meeting" button. All participants see a "Leave" button.
- **Screen Wake Lock**: Keeps screen active during calls using the Screen Wake Lock API, with re-acquisition on tab visibility change
- **Responsive call controls**: On mobile, owner buttons are grouped into floating menus (leave+end, requests+settings) to save space

## External services

| Service | Purpose |
|---------|---------|
| Daily.co | Video calling, room creation, meeting tokens |
| ElevenLabs | Real-time speech-to-text |
| OpenAI | AI meeting summarization |
| Clerk | Authentication, user email extraction |
| Resend | Transactional email |
| Supabase | Realtime broadcast channels + presence |
| PostgreSQL | Primary database (rooms, participants, messages, summaries) |
| Redis | Email record storage (ioredis) |

## Architecture

- **Server actions** (`actions.ts`): `sendMessage`, `saveTranscript`, `getMessages`, `endMeeting`
- **Repository pattern**: `EmailRepository` interface, `RedisEmailRepository` implementation
- **Service layer**: `EmailService` (Resend), `SummaryService` (OpenAI) — interface-first, swappable
- **Realtime events**: `message:add`, `messages:sync`, `partial:update`, `meeting:ended` on `room:{roomId}` channel; `admission:request`, `admission:accept`, `admission:reject`, `admission:cancel`, `ownership:transferred` on `admission:{roomId}` channel
- **Hooks**: `useRealtimeChat()` (messaging + meeting end), `useTranscription()` (ElevenLabs scribe), `useAdmission()` (join request signaling + ownership transfer)
- **Room page state machine**: `src/app/[id]/context.tsx` manages room state (`preview` → `joining` → `in-call` or `waiting` → `rejected`/`ended`). Views split into `src/app/[id]/views/` (preview, waiting, in-call, rejected, ended)
- **API endpoints**: `POST /api/r` (create room), `POST /api/r/[id]/join` (join), `POST /api/r/[id]/admit` (accept/reject), `PATCH /api/r/[id]/settings` (toggle autoAccept), `POST /api/r/[id]/leave` (leave with ownership transfer)
- **Owner verification**: `X-Owner-Secret` header hashed with SHA-256 and compared to `rooms.ownerSecretHash`, or Clerk userId match against `rooms.ownerClerkUserId`

## Database tables

- **rooms**: id, dailyRoomName (unique), dailyRoomUrl, createdAt, expiresAt, endedAt, autoAccept (bool, default true), ownerSecretHash, ownerClerkUserId
- **participants**: id (`{username}_{roomId}`), roomId, username, clerkUserId, joinedAt, leftAt
- **messages**: id (nanoid), roomId, username, content, type (`"chat"` | `"transcript"`), createdAt
- **meetingSummaries**: id (nanoid), roomId, title, summary, keyTopics (JSON), actionItems (JSON), decisions (JSON), createdAt

## Gotchas

### Supabase Realtime

- **Broadcast doesn't echo to sender**: When you `channel.send()` a broadcast event, the sender does NOT receive it back. If the sender also needs to update local state, do it optimistically before/after sending.
- **Channel subscription is async**: `channelRef.current` is `null` until `.subscribe()` callback fires. If you need to send immediately on mount (e.g., admission request in `useEffect`), queue the payload in a ref and flush it in the subscribe callback.

### Screen Wake Lock API

- Browser releases the wake lock when the tab becomes hidden. Must re-acquire on `visibilitychange` event when `document.visibilityState === "visible"`.

### Portaled Dialogs + Outside-click

- Base UI Dialog content renders in a portal (outside the DOM tree). Outside-click handlers (e.g., for floating menus) must check `target.closest("[role='dialog']")` to avoid closing the menu when interacting with a dialog.

### Next.js 16

- Uses `proxy.ts` instead of `middleware.ts`. Check `node_modules/next/dist/docs/` before assuming conventions.

## Clerk v7

- `SignedIn`, `SignedOut` components do not exist. Use `useUser()` hook with conditional rendering.

## Daily.co

- `createCallObject({ audioSource: false })` permanently disables the track. `setLocalAudio(true)` will fail with "not allowed by Daily due to audioSource set to False".
- Always acquire devices (`audioSource: true` or device ID), then call `setLocalAudio(false)` / `setLocalVideo(false)` after `join()` to apply mute state.
- `useDevices()` from `@daily-co/daily-react` provides `cameras`, `microphones`, `currentCam`, `currentMic`, `setCamera(deviceId)`, `setMicrophone(deviceId)`. Each item is `{ device: MediaDeviceInfo, selected, state }`.
- Device enumeration via `useDevices()` takes a moment after the call connects. This is expected.

## Redis

- `@upstash/redis` uses HTTP REST protocol. It cannot connect to `redis://` URLs. Use `ioredis` for self-hosted Redis.
