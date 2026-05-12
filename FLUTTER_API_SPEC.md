# Inkling — Flutter Mobile App API Specification

This document is the complete technical reference for building the Inkling Flutter mobile app. It covers authentication, every API endpoint, all data models, the full feature set, and implementation notes specific to Flutter.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Authentication](#2-authentication)
3. [Global Conventions](#3-global-conventions)
4. [Data Models](#4-data-models)
5. [Endpoints](#5-endpoints)
   - 5.1 [Auth](#51-auth)
   - 5.2 [Notes](#52-notes)
   - 5.3 [Note Chat (AI)](#53-note-chat-ai)
   - 5.4 [Labels](#54-labels)
   - 5.5 [Images](#55-images)
   - 5.6 [User Settings](#56-user-settings)
   - 5.7 [AI Utilities](#57-ai-utilities)
6. [Feature Inventory](#6-feature-inventory)
7. [Flutter Implementation Notes](#7-flutter-implementation-notes)

---

## 1. Project Overview

Inkling is a note-taking web app. The backend is a Next.js 16 App Router application serving a JSON REST API. The database is MongoDB (Mongoose ODM). Binary assets (images embedded in notes) are stored in GridFS. AI features use Google Gemini via a per-user API key that is stored AES-256-GCM encrypted.

There is no separate backend service — the Next.js app IS the backend. The Flutter app communicates exclusively with the REST API described in this document. There are no WebSockets or real-time subscriptions anywhere.

**Base URL:** `https://<host>` (no `/api` prefix in the base; all API paths start with `/api/...`)

---

## 2. Authentication

### Mechanism

The API uses JWT stored in an `httpOnly` cookie named `token`. The JWT is signed with HS256. On login the server sets the cookie; on logout the server deletes it.

**JWT payload fields (relevant to the mobile client):**
```
{
  "userId": "<MongoDB ObjectId string>",
  "username": "<string>",
  "role": "free" | "premium",
  "iat": <unix timestamp>,
  "exp": <unix timestamp>
}
```

**Cookie attributes set by the server:**
```
Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure (production only)
```

- `Max-Age` = 2 592 000 seconds = 30 days
- `HttpOnly` — the cookie cannot be read by JavaScript; only sent automatically by the browser/HTTP client
- `SameSite=Lax` — cross-site GET requests include the cookie; cross-site non-GET requests do not

### Flutter implications

Because the cookie is `httpOnly` you cannot inspect or set it directly. Use `dio` with `dio_cookie_manager` and `cookie_jar` so the cookie is captured from `Set-Cookie` on login and automatically replayed on every subsequent request.

**Do NOT attempt to read the JWT payload from the client side** — the server does not expose the token value itself. User identity information (username, role) must be stored locally after login from the login response or fetched separately if needed (the login response only returns `{ message }`, not the user object).

### Protected vs public routes

Protected routes return `401 Unauthorized` (plain text) when the cookie is missing or invalid.

| Protected (requires cookie) | Public (no cookie needed) |
|---|---|
| All `/api/notes/*` | `POST /api/auth/login` |
| All `/api/labels/*` | `GET /api/auth/register` |
| `POST /api/images/upload` | `POST /api/auth/register` |
| `GET /api/images/[id]` (unless note is shared) | `POST /api/auth/logout` |
| All `/api/user/*` | `GET /api/images/[id]` (when note.shared = true) |
| `POST /api/convert-to-md` | `POST /api/images/cleanup` |
| `POST /api/user/test-api-key` | |

Note: `POST /api/images/cleanup` has no authentication whatsoever — it is intended to be called by an external cron service.

---

## 3. Global Conventions

### Request headers

All JSON body requests must include:
```
Content-Type: application/json
```

Image upload uses:
```
Content-Type: multipart/form-data
```

The `Cookie` header is managed automatically by the HTTP client (cookie jar). Do not set it manually.

### Response content types

- Success responses with a body: `application/json`
- Error responses: usually `text/plain` (plain text body, e.g. `"Unauthorized"`, `"Note not found"`)
- Some error responses from AI routes are JSON (noted per endpoint)
- `204 No Content` responses have no body

### ID format

All IDs (`_id`, `userId`, `noteId`, etc.) are MongoDB ObjectIds serialized as 24-character lowercase hex strings.

### Timestamps

All timestamp fields (`createdAt`, `lastSeenAt`) are serialized as ISO 8601 strings in UTC, e.g. `"2025-01-15T10:30:00.000Z"`.

### Error response format

Most errors are plain text with an appropriate HTTP status code:
```
HTTP 401
Unauthorized
```

Exceptions where errors are JSON are explicitly noted per endpoint.

---

## 4. Data Models

These are the exact MongoDB document shapes returned by the API. The `__v` field (Mongoose version key) may appear on some responses; ignore it.

### 4.1 User

Never returned directly by any endpoint. Relevant because `userId` appears in JWT and as a reference in other models.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId (string) | yes | Primary key |
| `username` | string | yes | Unique across all users |
| `password` | string | yes | bcrypt hash — NEVER returned by any API response |
| `role` | `"free"` \| `"premium"` | yes | Default: `"free"` |
| `geminiApiKey` | string | no | AES-256-GCM encrypted — NEVER returned raw; `""` when not set |

### 4.2 Note

Returned by all `/api/notes` endpoints.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | string | yes | MongoDB ObjectId |
| `title` | string | no | May be absent or empty string |
| `content` | string | yes | The note body; Markdown when `format = "md"`, plain text when `format = "text"` |
| `format` | `"md"` \| `"text"` | yes | Default: `"md"` |
| `user` | string | yes | ObjectId of the owning User |
| `labels` | array | yes | When returned by list/get endpoints, this is an **array of full Label objects** (populated). When creating/updating, you send an array of Label ObjectId strings. |
| `shared` | boolean | yes | Default: `false`. When `true`, the note is publicly readable (no auth required for images) |
| `createdAt` | string (ISO 8601) | yes | Set at creation, never updated |

**Example Note object:**
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "title": "My Note",
  "content": "# Hello\n\nThis is my note with an image:\n\n![photo](/api/images/64a1b2c3d4e5f6a7b8c9d0e2)",
  "format": "md",
  "user": "64a1b2c3d4e5f6a7b8c9d0e0",
  "labels": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e3",
      "name": "Work",
      "color": "#3b82f6",
      "user": "64a1b2c3d4e5f6a7b8c9d0e0"
    }
  ],
  "shared": false,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### 4.3 Label

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | string | yes | MongoDB ObjectId |
| `name` | string | yes | Display name of the label |
| `color` | string | yes | CSS color string, typically a hex code like `"#3b82f6"` |
| `user` | string | yes | ObjectId of the owning User |

**Example Label object:**
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e3",
  "name": "Work",
  "color": "#3b82f6",
  "user": "64a1b2c3d4e5f6a7b8c9d0e0"
}
```

### 4.4 Image

Not returned directly by endpoints (the upload endpoint returns a subset). Described here for reference.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | string | yes | MongoDB ObjectId — used to construct the image URL |
| `note` | string | yes | ObjectId of the Note this image belongs to |
| `filename` | string | yes | Original filename |
| `contentType` | string | yes | MIME type (e.g. `"image/png"`) |
| `size` | number | yes | File size in bytes |
| `gridFsId` | string | yes | GridFS file ObjectId — internal, do not use |
| `createdAt` | string (ISO 8601) | yes | Upload timestamp |
| `lastSeenAt` | string (ISO 8601) | no | Last time the image was accessed or referenced; used for cleanup |

### 4.5 ChatMessage

Returned by all `/api/notes/[id]/chat` endpoints.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | string | yes | MongoDB ObjectId |
| `user` | string | yes | ObjectId of the owning User |
| `note` | string | yes | ObjectId of the Note this conversation belongs to |
| `role` | `"user"` \| `"assistant"` \| `"system"` | yes | In practice only `"user"` and `"assistant"` are created |
| `content` | string | yes | Message text. Assistant messages are in Markdown format |
| `createdAt` | string (ISO 8601) | yes | Message timestamp |

**Example ChatMessage array (from GET or POST response):**
```json
[
  {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e4",
    "user": "64a1b2c3d4e5f6a7b8c9d0e0",
    "note": "64a1b2c3d4e5f6a7b8c9d0e1",
    "role": "user",
    "content": "Summarize this note for me",
    "createdAt": "2025-01-15T10:35:00.000Z"
  },
  {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e5",
    "user": "64a1b2c3d4e5f6a7b8c9d0e0",
    "note": "64a1b2c3d4e5f6a7b8c9d0e1",
    "role": "assistant",
    "content": "## Summary\n\nThis note covers...",
    "createdAt": "2025-01-15T10:35:01.000Z"
  }
]
```

---

## 5. Endpoints

### 5.1 Auth

#### POST /api/auth/login

Log in a user. Sets the `token` cookie on success.

**Authentication required:** No

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | yes | The user's username |
| `password` | string | yes | The user's plaintext password |

**Success response — 200 OK:**
```json
{
  "message": "Logged in successfully"
}
```
The response also includes a `Set-Cookie` header that sets the `token` cookie. The Flutter HTTP client must persist this cookie.

**Error responses:**
| Status | Body (plain text) | Condition |
|---|---|---|
| 400 | `"Username and password are required"` | Either field is missing |
| 401 | `"Invalid credentials"` | Username not found or password mismatch |
| 500 | `"Internal Server Error"` | Database or server error |

---

#### GET /api/auth/register

Check whether public registration is enabled on this deployment.

**Authentication required:** No

**Request body:** None

**Success response — 200 OK:**
```json
{
  "allowed": true
}
```
or
```json
{
  "allowed": false
}
```

Call this before showing a registration screen. If `allowed` is `false`, do not show registration UI.

**Error responses:** None beyond 500.

---

#### POST /api/auth/register

Register a new user account. Only works when registration is enabled (see GET above).

**Authentication required:** No

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | yes | Desired username; must be unique |
| `password` | string | yes | Plaintext password (hashed server-side with bcrypt, cost 10) |

**Success response — 201 Created:**
```json
{
  "message": "User created successfully",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e0"
}
```

Note: registration does NOT automatically log the user in or set the token cookie. After successful registration, redirect the user to the login flow.

**Error responses:**
| Status | Body (plain text) | Condition |
|---|---|---|
| 400 | `"Username and password are required"` | Either field missing |
| 400 | `"User already exists"` | Username is taken |
| 403 | `"Registration is disabled"` | `ALLOW_REGISTRATION` env var is not `"true"` |
| 500 | `"Internal Server Error"` | Database or server error |

---

#### POST /api/auth/logout

Log out the current user. Deletes the `token` cookie.

**Authentication required:** No (middleware allows all `/api/auth/*`)

**Request body:** None

**Success response — 200 OK:**
```json
{
  "message": "Logged out successfully"
}
```
The response includes a `Set-Cookie` header that removes the `token` cookie. The Flutter HTTP client's cookie jar should automatically handle this.

**Error responses:** None beyond 500.

---

### 5.2 Notes

All note endpoints require the `token` cookie. All note operations are scoped to the authenticated user — a user cannot access or modify another user's notes.

#### GET /api/notes

Fetch all notes belonging to the authenticated user, with labels populated.

**Authentication required:** Yes

**Query parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `labelId` | string | no | If provided, filters notes to only those containing this Label ObjectId in their `labels` array |

**Example:** `GET /api/notes?labelId=64a1b2c3d4e5f6a7b8c9d0e3`

**Success response — 200 OK:**

Array of Note objects (see Data Model 4.2). Labels are fully populated objects, not just IDs.

```json
[
  {
    "_id": "...",
    "title": "Note 1",
    "content": "...",
    "format": "md",
    "user": "...",
    "labels": [ { "_id": "...", "name": "Work", "color": "#3b82f6", "user": "..." } ],
    "shared": false,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

Returns an empty array `[]` if the user has no notes (or no notes match the label filter).

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` (plain text) | Cookie missing or invalid |
| 500 | `"Internal Server Error"` (plain text) | Database error |

---

#### POST /api/notes

Create a new note.

**Authentication required:** Yes

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | Note title |
| `content` | string | yes (enforced by DB schema) | Note body |
| `format` | `"md"` \| `"text"` | no | Defaults to `"md"` |
| `labels` | string[] | no | Array of Label ObjectId strings to attach |

**Success response — 201 Created:**

The created Note object (see Data Model 4.2). Labels are NOT populated in the create response — they are returned as an array of ObjectId strings.

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "title": "New Note",
  "content": "# Hello",
  "format": "md",
  "user": "64a1b2c3d4e5f6a7b8c9d0e0",
  "labels": [],
  "shared": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "__v": 0
}
```

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 500 | `"Internal Server Error"` | Database error |

---

#### GET /api/notes/[id]

Fetch a single note by ID. Only accessible by the note's owner.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Success response — 200 OK:**

Single Note object with labels fully populated (see Data Model 4.2).

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Note not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

#### PUT /api/notes/[id]

Update a note. Only accessible by the note's owner.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | New title. Pass `""` to clear |
| `content` | string | no | New note body |
| `format` | `"md"` \| `"text"` | no | New format |
| `labels` | string[] | no | New array of Label ObjectId strings (replaces existing labels entirely) |
| `shared` | boolean | no | Set sharing state. IMPORTANT: only applied when the field is explicitly a boolean. Omitting it leaves the existing value unchanged. |

**Important behavior notes:**
- `shared` is only updated if `typeof shared === 'boolean'`. To toggle sharing you must explicitly pass `true` or `false`. To update only the content without changing sharing, omit `shared` entirely.
- When `content` contains image references in the format `/api/images/<24hexId>`, the server updates `lastSeenAt` on those Image records to prevent garbage collection.
- Mongoose is called with `{ new: true, runValidators: true }`, so the response is the updated document.

**Success response — 200 OK:**

Updated Note object. Labels are returned as ObjectId strings (not populated).

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Note not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

#### DELETE /api/notes/[id]

Delete a note and all its associated images (both the Image metadata documents and the GridFS binary data).

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Success response — 204 No Content**

No body.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Note not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

### 5.3 Note Chat (AI)

Per-note conversational AI powered by Google Gemini. Each conversation is scoped to a specific note — the note's content is always included as context in the AI prompt. History is persisted in MongoDB.

The AI uses model `gemini-3-flash-preview`. The user must have a Gemini API key configured (see Section 5.6) for AI responses to be generated. If no key is configured, a static help message is returned as the assistant message (still persisted).

#### GET /api/notes/[id]/chat

Fetch the full chat history for a note in chronological order.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Success response — 200 OK:**

Array of ChatMessage objects sorted by `createdAt` ascending (see Data Model 4.5). Returns `[]` if no messages exist.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

#### POST /api/notes/[id]/chat

Send a user message and receive an AI reply. Both messages are persisted to the database.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | The user's message text |

**Success response — 200 OK:**

Array of exactly two ChatMessage objects: `[userMessage, assistantMessage]`.

```json
[
  {
    "_id": "...",
    "user": "...",
    "note": "...",
    "role": "user",
    "content": "Summarize this note",
    "createdAt": "2025-01-15T10:35:00.000Z"
  },
  {
    "_id": "...",
    "user": "...",
    "note": "...",
    "role": "assistant",
    "content": "## Summary\n\nThis note covers...",
    "createdAt": "2025-01-15T10:35:01.000Z"
  }
]
```

**When no Gemini API key is configured:**

The response is still `200 OK` with the same two-item array. The assistant message content will be a static Markdown message instructing the user to configure their API key. The message is still persisted to the database.

**AI context:** The server sends the entire note title and content as a system prompt to Gemini before the conversation history. The full conversation history is included in every request (not just recent messages). Assistant messages are expected to contain Markdown including GFM, KaTeX math, and code blocks.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `"Content required"` (plain text) | `content` field missing or not a string |
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error or Gemini API error |

---

#### DELETE /api/notes/[id]/chat

Delete all chat messages for the authenticated user on a specific note.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Note's `_id` (ObjectId string) |

**Success response — 204 No Content**

No body.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Not found"` | Note does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

### 5.4 Labels

Labels are user-defined tags with a name and a color. They can be attached to notes. All label operations are scoped to the authenticated user.

#### GET /api/labels

Fetch all labels belonging to the authenticated user.

**Authentication required:** Yes

**Success response — 200 OK:**

Array of Label objects (see Data Model 4.3). Returns `[]` if none exist.

```json
[
  { "_id": "...", "name": "Work", "color": "#3b82f6", "user": "..." },
  { "_id": "...", "name": "Personal", "color": "#10b981", "user": "..." }
]
```

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 500 | `"Internal Server Error"` | Database error |

---

#### POST /api/labels

Create a new label.

**Authentication required:** Yes

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Display name of the label |
| `color` | string | yes | Color string (typically hex, e.g. `"#3b82f6"`) |

**Success response — 201 Created:**

The created Label object.

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e3",
  "name": "Work",
  "color": "#3b82f6",
  "user": "64a1b2c3d4e5f6a7b8c9d0e0",
  "__v": 0
}
```

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 500 | `"Internal Server Error"` | Database error |

---

#### PUT /api/labels/[id]

Update a label's name and/or color.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Label's `_id` (ObjectId string) |

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | New label name |
| `color` | string | yes | New label color |

**Success response — 200 OK:**

Updated Label object.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Label not found"` | Label does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

#### DELETE /api/labels/[id]

Delete a label. Does NOT automatically remove the label from notes that reference it — the label ObjectId will remain in those notes' `labels` arrays but the Label document will be gone.

**Authentication required:** Yes

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Label's `_id` (ObjectId string) |

**Success response — 204 No Content**

No body.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Label not found"` | Label does not exist or does not belong to this user |
| 500 | `"Internal Server Error"` | Database error |

---

### 5.5 Images

Images are uploaded by users and embedded in Markdown note content as standard image syntax: `![alt text](/api/images/<imageId>)`. They are stored in MongoDB GridFS.

#### POST /api/images/upload

Upload an image and attach it to a note.

**Authentication required:** Yes

**Request body: `multipart/form-data`**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | yes | The image file to upload |
| `noteId` | string | yes | ObjectId of the Note to attach this image to. The note must belong to the authenticated user. |
| `alt` | string | no | Alt text for the generated Markdown. Defaults to the original filename. |

**Constraints:**
- Maximum file size: **8 MB** (8,388,608 bytes). Larger files return 413.
- Allowed MIME types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/bmp`, `image/tiff`, `image/svg+xml`, `image/x-icon`, `image/heic`, `image/heif`. Other types return 415.

**Success response — 200 OK:**
```json
{
  "url": "/api/images/64a1b2c3d4e5f6a7b8c9d0e2",
  "markdown": "![photo.png](/api/images/64a1b2c3d4e5f6a7b8c9d0e2)",
  "id": "64a1b2c3d4e5f6a7b8c9d0e2"
}
```

- `url`: The relative path to access the image. Prefix with the base URL to get a full URL.
- `markdown`: Ready-to-insert Markdown image syntax.
- `id`: The Image document's `_id`.

After uploading, embed the `markdown` string into the note content and save the note via `PUT /api/notes/[id]`. This triggers the server to update `lastSeenAt` on the image, protecting it from garbage collection.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `"File is required"` | `file` field missing |
| 400 | `"noteId is required"` | `noteId` field missing |
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Note not found"` | Note does not exist or does not belong to this user |
| 413 | `"File too large"` | File exceeds 8 MB |
| 415 | `"Unsupported file type"` | MIME type not in allowed list |
| 500 | `"Internal Server Error"` | Upload or database error |

---

#### GET /api/images/[id]

Retrieve an image binary. This is used directly as an `<img src>` target in rendered Markdown.

**Authentication required:** Conditional
- If the cookie is present and the user owns the note: accessible.
- If the note's `shared` field is `true`: accessible without any cookie.
- Otherwise: `401 Unauthorized`.

**Path parameters:**
| Parameter | Description |
|---|---|
| `id` | The Image document's `_id` (ObjectId string) |

**Success response — 200 OK:**

Raw binary image data with headers:
```
Content-Type: <image MIME type, e.g. image/png>
Cache-Control: public, max-age=31536000, immutable
```

The response body is the image binary stream. This is a long-lived cacheable resource.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | No valid cookie and note is not shared |
| 404 | `"Not Found"` | Invalid ObjectId format, Image document not found, or parent Note not found |
| 500 | `"Internal Server Error"` | GridFS streaming error |

---

#### POST /api/images/cleanup

Trigger garbage collection of orphaned or stale images. This is called by an external cron service (hourly). Mobile clients do not need to call this endpoint.

**Authentication required:** No (completely public)

**Request body:** None

**Success response — 200 OK:**
```json
{
  "deleted": 3
}
```

The `deleted` count is the number of images (and their GridFS blobs) that were removed.

Deletion criteria: images where `lastSeenAt` is null or older than 2 hours AND where the image URL does not appear in the parent note's `content`. Images where the parent note no longer exists are also deleted.

---

### 5.6 User Settings

#### GET /api/user/api-key

Check whether the authenticated user has a Gemini API key configured.

**Authentication required:** Yes

**Success response — 200 OK:**
```json
{
  "hasKey": true,
  "maskedKey": "API Key configured"
}
```
or when no key is set:
```json
{
  "hasKey": false,
  "maskedKey": null
}
```

The raw key is never returned. `maskedKey` is the static string `"API Key configured"` when a key exists, not an actual masked version of the key.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 404 | `"Not found"` | User document not found (should not occur in practice) |
| 500 | `"Internal Server Error"` | Database error |

---

#### POST /api/user/api-key

Save or clear the authenticated user's Gemini API key. The key is encrypted with AES-256-GCM before being stored.

**Authentication required:** Yes

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | yes | The Gemini API key to save. Pass `""` (empty string) to clear the key. |

**Success response — 200 OK:**
```json
{
  "success": true
}
```

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `"Invalid API key"` (plain text) | `apiKey` field is not a string |
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 500 | `"Internal Server Error"` | Database error |

---

#### POST /api/user/test-api-key

Validate a Gemini API key by making a test request to Google's API. The key is sent in the request body — the user's stored key is not involved.

**Authentication required:** Yes (via middleware cookie check; no `verifyToken` call inside the handler)

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string | yes | The Gemini API key to test (plaintext, not yet saved) |

**Success response — 200 OK (JSON):**
```json
{
  "valid": true,
  "message": "API key is valid!"
}
```

**Error responses:**
| Status | Body (JSON) | Condition |
|---|---|---|
| 400 | `{ "valid": false, "message": "API key is invalid or has insufficient permissions", "error": "<error message>" }` | Key rejected by Google |
| 400 | `"API key is required"` (plain text) | `apiKey` field missing or not a string |
| 500 | `"Internal Server Error"` (plain text) | Server error |

Note: this endpoint is the only one where error responses are mixed — a bad key returns JSON 400, but a missing key returns plain text 400.

---

### 5.7 AI Utilities

#### POST /api/convert-to-md

Convert arbitrary plain text to GitHub Flavored Markdown using the user's configured Gemini API key. Handles LaTeX math normalization (converts `\(...\)` to `$...$` etc.). Requires the user to have a Gemini API key saved.

**Authentication required:** Yes

**Request body (JSON):**
| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | yes | The plain text (or poorly formatted text) to convert |

**Success response — 200 OK:**
```json
{
  "markdown": "# Heading\n\nConverted **content** here..."
}
```

The `markdown` field contains pure GFM Markdown with no surrounding code fences. It is ready to be saved directly as note content.

**Error responses:**
| Status | Body | Condition |
|---|---|---|
| 400 | `"Text is required"` (plain text) | `text` field missing |
| 400 | `{ "error": "API Key Not Configured", "message": "Please configure your Gemini API key..." }` (JSON) | User has no Gemini key saved |
| 401 | `"Unauthorized"` | Cookie missing or invalid |
| 500 | `"Internal Server Error"` | Gemini API error or server error |

---

## 6. Feature Inventory

The following features exist in the web app. All of them should be replicated in the Flutter app.

1. **User registration** — Controlled by a server-side environment flag. Check `GET /api/auth/register` before showing registration UI.

2. **User login and logout** — JWT cookie auth. 30-day sessions.

3. **Note CRUD** — Create, read, update, delete notes. Each note has a title (optional), body content, format (`md` or `text`), creation timestamp, labels, and a sharing flag.

4. **Note format modes** — `"md"` notes are rendered as Markdown (GFM with KaTeX math and code highlighting). `"text"` notes are rendered as plain text. The format field dictates how the content should be displayed.

5. **Label CRUD** — Create, rename, recolor, and delete labels. Labels have a name and a hex color.

6. **Label filtering** — Filter the note list to show only notes with a specific label.

7. **Client-side search** — The web app performs full-text search locally across note titles, note content (first portion), and label names. This should be implemented client-side in Flutter as well (search the locally cached note list).

8. **Note sorting** — Notes can be sorted by: newest first (default), oldest first, title A–Z, title Z–A. This is UI-only; the API always returns notes in Mongo default order (insertion order). Sorting is done client-side.

9. **Note sharing** — Any note can be toggled to `shared: true`, which generates a public URL (`/share/<noteId>`) where anyone can read the note without logging in. Images embedded in shared notes are also publicly accessible. The mobile app should support sharing a link and toggling the shared state.

10. **Markdown rendering** — Note content in `"md"` format must be rendered as Markdown supporting GFM (tables, task lists, strikethrough, etc.), KaTeX math (using `$...$` for inline, `$$...$$` for block), and syntax-highlighted code blocks.

11. **Image embedding in notes** — Users can upload images (up to 8 MB) which are embedded in Markdown notes using standard image syntax. The image URL format is `/api/images/<imageId>`. When rendering Markdown, these relative image URLs must be resolved to full URLs with the auth cookie attached.

12. **Per-note AI chat** — Each note has a chat interface where the user can ask questions about the note. The note content is always included as AI context. Chat history is persisted on the server. The AI (Gemini) can use Markdown in its responses.

13. **AI text-to-Markdown conversion** — A utility that takes arbitrary plain text and converts it to clean Markdown using Gemini. Used in the note editor as a one-click "format this" action.

14. **Gemini API key management** — Users supply their own Google AI Studio API key. The key is stored encrypted server-side. The settings screen should allow: checking if a key is configured, entering a new key, testing a key before saving, and clearing the key.

---

## 7. Flutter Implementation Notes

### HTTP Client Setup

Use `dio` as the HTTP client with `dio_cookie_manager` and `cookie_jar` for cookie persistence. This is essential because authentication is entirely cookie-based.

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.x
  dio_cookie_manager: ^3.x
  cookie_jar: ^4.x
  path_provider: ^2.x
```

```dart
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';

Future<Dio> buildDio() async {
  final dir = await getApplicationDocumentsDirectory();
  final cookieJar = PersistCookieJar(storage: FileStorage('${dir.path}/.cookies'));
  final dio = Dio(BaseOptions(baseUrl: 'https://<your-host>'));
  dio.interceptors.add(CookieManager(cookieJar));
  return dio;
}
```

Use a persistent `PersistCookieJar` (backed by the file system) so the session survives app restarts. The cookie jar will automatically capture the `token` cookie from the login response and replay it on all subsequent requests.

### Auth state

Because the JWT payload is in an `httpOnly` cookie, you cannot read it from Dart. After a successful login, you know the user is authenticated but you do not automatically know their username or role.

Options:
- Store the username entered at login in `SharedPreferences`.
- Call `GET /api/auth/register` on startup to probe whether the server is reachable, then rely on the cookie jar for session persistence. If any protected endpoint returns 401, treat the session as expired and redirect to login.

### Checking login state on app start

There is no `/api/auth/me` endpoint. To check if the user is already logged in, make a lightweight authenticated request (e.g. `GET /api/labels`) on app start. If it returns 200, the user is logged in. If it returns 401, redirect to login.

### Markdown rendering

AI chat responses, `"md"` format notes, and the text-to-Markdown feature all produce Markdown content.

Recommended packages:
- `flutter_markdown` — GFM rendering
- `flutter_math_fork` or `katex_flutter` — KaTeX math rendering
- `markdown` — if custom parsing is needed

The Markdown content may include:
- Standard GFM: headings, lists, tables, task lists, strikethrough, links, code blocks
- Inline math: `$expression$`
- Block math: `$$\nexpression\n$$`
- Images: `![alt](/api/images/<id>)` — see below

### Rendering images in Markdown

Note content uses relative image URLs like `/api/images/64a1b2c3d4e5f6a7b8c9d0e2`. When rendering Markdown in the app, you need to:

1. Prepend the base URL to make it absolute: `https://<host>/api/images/<id>`
2. Attach the `token` cookie with the request (the `dio` cookie jar handles this, but `flutter_markdown`'s default image builder uses Flutter's `Image.network` which does not share the cookie jar)

You must provide a custom `imageBuilder` to `flutter_markdown` that uses `dio` (with the cookie jar) to fetch image bytes and display them, rather than using `Image.network` directly.

### Image upload

Use `dio` with `FormData` for image upload:

```dart
final formData = FormData.fromMap({
  'noteId': noteId,
  'file': await MultipartFile.fromFile(filePath, filename: fileName, contentType: DioMediaType.parse(mimeType)),
  'alt': altText, // optional
});
final response = await dio.post('/api/images/upload', data: formData);
// response.data: { 'url': '...', 'markdown': '...', 'id': '...' }
```

After upload, insert the `markdown` string into the note content at the cursor position, then save the note via `PUT /api/notes/[id]` to update `lastSeenAt` on the image.

### Note sharing

To toggle sharing on a note, send only the `shared` field:
```dart
await dio.put('/api/notes/$noteId', data: {'shared': true});
```
Omitting all other fields is safe — Mongoose will leave them unchanged. Do NOT pass `null` for other fields as that may clear them.

The public share URL is: `https://<host>/share/<noteId>` — this is a web page, not an API endpoint. For sharing from the mobile app, copy this URL to the clipboard or use the system share sheet.

### AI chat flow

1. On entering a note's chat screen, call `GET /api/notes/[id]/chat` to load history.
2. To send a message, call `POST /api/notes/[id]/chat` with `{ "content": "<user message>" }`.
3. The response is always an array of two messages: `[userMessage, assistantMessage]`. Append both to the local chat history.
4. Render assistant message `content` as Markdown (it will contain GFM and possibly KaTeX).
5. If the assistant message contains the phrase "API Key Not Configured", show a prompt directing the user to settings.

### Gemini API key settings flow

1. On opening settings, call `GET /api/user/api-key` to check `hasKey`.
2. Show a text field for entering a key.
3. Before saving, optionally call `POST /api/user/test-api-key` with `{ "apiKey": "<key>" }` to validate. Check `response.data['valid']` == `true`.
4. To save, call `POST /api/user/api-key` with `{ "apiKey": "<key>" }`.
5. To clear, call `POST /api/user/api-key` with `{ "apiKey": "" }`.

### Offline / caching strategy

The web app implements an offline-first cache using IndexedDB. For the Flutter app, consider:

- Cache the full note list and label list in a local SQLite database (`sqflite`) or Hive.
- On app foreground/resume, refresh from the API in the background and update the cache.
- Show cached data immediately, then update the UI when fresh data arrives.
- Images fetched via `GET /api/images/[id]` have `Cache-Control: public, max-age=31536000, immutable` — use `cached_network_image` or a custom `dio`-based cache for image caching.

### Error handling

Most error responses are plain text, not JSON. Parse them by checking `response.statusCode` and reading `response.data.toString()` for the error message. Do not attempt `response.data['error']` on error responses unless the endpoint is documented above as returning JSON errors.

Handle 401 globally with a Dio interceptor that clears the cookie jar and redirects to the login screen.

### Registration gating

Always call `GET /api/auth/register` before showing the registration screen. If `{ "allowed": false }`, show a message like "Registration is not available on this server" and do not show the registration form.

### No WebSockets

The app has no real-time features. Chat is polling-based (request/response). There is no need to implement WebSocket connections.

---

*End of specification.*
