# WatchParty

WatchParty lets people watch videos together in shared rooms. Room members can synchronize playback, chat, and manage a shared playlist in real time.

**Live app:** [https://www.watchparty.me](https://www.watchparty.me)

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

PostgreSQL and Redis are optional for a basic local session. Set `DATABASE_URL` and `REDIS_URL` to enable database-backed room persistence and Redis-backed features. Initialize PostgreSQL with `sql/schema.sql` before using it. Other optional integrations include YouTube search (`YOUTUBE_API_KEY`), Firebase authentication (`FIREBASE_ADMIN_SDK_CONFIG`), and Stripe subscriptions (`STRIPE_SECRET_KEY`).

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

## Code walkthrough

- `src/components/App/App.tsx` — joins a room, sends user actions, and reacts to server events.
- `src/components/` — React UI for chat, controls, room creation, and other features.
- `src/utils/` — client helpers, media/player logic, and the server connection address.
- `server/server.ts` — starts Express and Socket.IO, handles HTTP endpoints, and manages room instances.
- `server/room.ts` — room state, socket validation, event handlers, and broadcasts.
- `server/config.ts` — environment variables and their defaults.
- `sql/schema.sql` — PostgreSQL tables used by persistent and account-related features.

**In one sentence:** the browser sends room commands over WebSockets; the server is the shared source of truth and broadcasts the resulting state to everyone in that room.
