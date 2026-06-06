/**
 * @file Environment variables and cloud development initialization guide
 * @description Lists required environment variables (names only, no real values)
 * and cloud development initialization steps
 */

# Environment Variables (Cloud Function)

| Variable Name | Purpose | Example |
|---|---|---|
| AI_BASE_URL | AI model API base URL | https://api.deepseek.com/v1 |
| AI_API_KEY | AI model API key | (keep secret) |
| AI_MODEL | AI model name | deepseek-chat |
| AI_TIMEOUT | AI request timeout (ms) | 30000 |
| AI_DAILY_LIMIT | Daily chat limit per user | 50 |
| AI_QUESTION_LENGTH_LIMIT | Max question length (chars) | 1000 |
| AI_HISTORY_LIMIT | Max history messages per request | 10 |

# Cloud Development Initialization

## Database Collections (6)

1. **user** - User records
   - Fields: openid, nickname, avatar, role, createdAt
   - Index: openid (unique)

2. **book** - Book metadata
   - Fields: bookId, title, author, isbn, cover, summary, status, addedBy, createdAt, updatedAt
   - Index: bookId (unique), status

3. **note** - Reading notes
   - Fields: noteId, openid, bookId, content, createdAt
   - Index: openid, bookId

4. **checkin** - Check-in records
   - Fields: checkinId, openid, bookId, minutes, checkinDate
   - Index: openid, checkinDate

5. **ai_session** - AI chat sessions
   - Fields: sessionId, openid, bookId, title, createdAt
   - Index: openid, bookId

6. **ai_message** - AI chat messages
   - Fields: msgId, sessionId, openid, role, content, createdAt
   - Index: sessionId, createdAt

## Collection Permissions

- user: Creator can read/write own records
- book: All authenticated users can read; only admin can write
- note: Creator can read/write own records
- checkin: Creator can read/write own records
- ai_session: Creator can read/write own records
- ai_message: Creator can read/write own records

## First Admin Setup

1. Deploy cloud functions
2. Login once as the intended admin user
3. In cloud console, find the user record in the `user` collection
4. Change the `role` field from "user" to "admin"
