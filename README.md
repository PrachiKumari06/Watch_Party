# WatchParty

WatchParty lets people watch videos together in shared rooms. Room members can synchronize playback, chat, and manage a shared playlist in real time.

**Live app:** [https://watch-party-khaki-eight.vercel.app/](https://watch-party-khaki-eight.vercel.app/)

## Setup and run

### Requirements

- Node.js 22.12 or newer
- npm

### Run locally

From the project directory (the folder containing `package.json`):

```bash
npm ci
```

Open two terminals in that directory. Start the API and Socket.IO server in the first:

```bash
npm run dev
```

Start the Vite development server in the second:

```bash
npm run ui
```

Open the local address printed by Vite (usually `http://localhost:5173`). In development, the client connects to the backend on port `8080`.

No environment file is required for the basic local run. The server reads optional settings from `.env`. For example:

```dotenv
PORT=8080
HOST=0.0.0.0
```

PostgreSQL is optional for a basic local session. Set `DATABASE_URL`to enable database-backed room persistence features. Initialize PostgreSQL with `sql/schema.sql` before using it. Other optional integrations include YouTube search (`YOUTUBE_API_KEY`), Firebase authentication (`FIREBASE_ADMIN_SDK_CONFIG`).

### Build and run as a single server

```bash
npm run build
npm start
```

The build creates the frontend in `build/`; the server serves that frontend and its API/socket endpoints. By default, it listens on port `8080`. Configure optional production services and any required environment variables before deploying.

Useful checks:

```bash
npm run typecheck
npm run typecheckServer
```

## Architecture overview

- **React + TypeScript client:** Vite builds the UI. The room screen opens a Socket.IO connection to the server using that room's ID.
- **Express + Socket.IO server:** Express handles HTTP endpoints such as room creation. Socket.IO keeps a persistent connection for each room and stores its active state in a server-side `Room` instance.
- **Real-time room flow:** The client sends actions such as play, pause, seek, chat, and playlist changes as `CMD:*` socket events. The server updates the room state and broadcasts `REC:*` events to the room, so connected clients can update their players and UI together. On joining or reconnecting, clients receive the current room state.
- **Persistence and integrations:** PostgreSQL can store room details and serialized state; Redis supports metrics and short-lived coordination. Video playback is handled by the client; screen/file sharing and virtual-browser features use additional WebRTC or provider services.

## Roles and permissions

Every room has a **host** (the creator), optional **moderators**, and **participants** (default for joiners).

| Action | Host | Moderator | Participant |
| --- | --- | --- | --- |
| Play / pause / seek / speed / loop | yes | yes | no |
| Change video, edit playlist, subtitles | yes | yes | no (can *request*, see below) |
| Approve or reject a participant's video request | yes | yes | no |
| Delete chat messages | yes | yes | no |
| Assign roles, remove participants, transfer host | yes | no | no |

How it works:

- **The server is the authority.** Each `CMD:*` handler in `server/room.ts` checks the sender's role before doing anything and replies with `errorMessage` if it is not allowed. The UI only mirrors this by disabling controls.
- **Roles are bound to secrets, not just IDs.** A `clientId` is visible to everyone in the roster, so it cannot prove who you are. `POST /createRoom` returns a one-time `hostKey` (kept in the creator's `localStorage`); moderators and new hosts receive their key over the socket (`REC:roleKey`). The server stores only SHA-256 hashes and verifies the key during the socket handshake, before any state changes.
- **Approval flow:** a participant sends `CMD:requestChange { video }`; hosts/moderators get `REC:requests` and answer with `CMD:resolveRequest { id, approve }`. Approved requests run through the normal change-video path and are broadcast to everyone.
- **Events:** `CMD:assignRole`, `CMD:transferHost`, `CMD:kickUser`, `CMD:requestChange`, `CMD:resolveRequest` (client to server); `roster` (includes each user's `role`), `REC:roleAssigned`, `REC:participantRemoved`, `REC:requests`, `REC:requestResult` (server to clients).
- **Persistence:** role hashes are saved inside the existing `room.data` JSON column, so no database migration is needed.

## Code walkthrough

- `src/components/App/App.tsx` — joins a room, sends user actions, and reacts to server events.
- `src/components/` — React UI for chat, controls, room creation, and other features.
- `src/utils/` — client helpers, media/player logic, and the server connection address.
- `server/server.ts` — starts Express and Socket.IO, handles HTTP endpoints, and manages room instances.
- `server/room.ts` — room state, socket validation, event handlers, and broadcasts.
- `server/config.ts` — environment variables and their defaults.
- `sql/schema.sql` — PostgreSQL tables used by persistent and account-related features.

**In one sentence:** the browser sends room commands over WebSockets; the server is the shared source of truth and broadcasts the resulting state to everyone in that room.
