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
- **Realtime events**: `message:add`, `messages:sync`, `partial:update`, `meeting:ended` on `room:{roomId}` channel; `admission:request`, `admission:accept`, `admission:reject`, `admission:cancel` on `admission:{roomId}` channel
- **Hooks**: `useRealtimeChat()` (messaging + meeting end), `useTranscription()` (ElevenLabs scribe), `useAdmission()` (join request signaling)
- **Owner verification**: `X-Owner-Secret` header hashed with SHA-256 and compared to `rooms.ownerSecretHash`, or Clerk userId match against `rooms.ownerClerkUserId`

## Database tables

- **rooms**: id, dailyRoomName (unique), dailyRoomUrl, createdAt, expiresAt, endedAt, autoAccept (bool, default true), ownerSecretHash, ownerClerkUserId
- **participants**: id (`{username}_{roomId}`), roomId, username, clerkUserId, joinedAt, leftAt
- **messages**: id (nanoid), roomId, username, content, type (`"chat"` | `"transcript"`), createdAt
- **meetingSummaries**: id (nanoid), roomId, title, summary, keyTopics (JSON), actionItems (JSON), decisions (JSON), createdAt

## Gotchas

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
