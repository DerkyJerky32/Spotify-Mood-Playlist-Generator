# Moodify Playlist Generator

A mood-based playlist generator that connects to Spotify, finds songs that match a selected mood, previews the results, and saves them as a Spotify playlist.

## What We Are Building

The app will let a user:

1. Connect their Spotify account.
2. Pick a mood, such as happy, chill, focused, or energetic.
3. Generate a list of tracks from Spotify Search.
4. Review the tracks.
5. Save the tracks into a new Spotify playlist.

## Why We Build It This Way

Spotify requires user authorization before an app can create playlists. That means our app needs both a frontend and a small backend:

- The frontend shows buttons, track results, and save controls.
- The backend talks to Spotify securely and keeps API logic in one place.

## File-By-File Build Plan

We will create the app in this order:

1. `README.md`
   - Explains the project and the build path.

2. `package.json`
   - Defines the Node.js project, scripts, and dependencies.

3. `.env.example`
   - Shows which Spotify credentials the app needs.

4. `server.js`
   - Starts the Express server.
   - Handles Spotify login and API routes.

5. `public/index.html`
   - Provides the app's page structure.

6. `public/styles.css`
   - Styles the mood picker, playlist results, and buttons.

7. `public/app.js`
   - Handles browser interactions.
   - Calls our backend routes.

## Spotify Setup

Before the Spotify features work, create an app in the Spotify Developer Dashboard.

You will need:

- Spotify Client ID
- Spotify Client Secret
- Redirect URI

For local development, use this redirect URI:

```text
http://localhost:3000/callback
```

## Core App Flow

```text
User picks mood
        |
        v
App converts mood into Spotify search terms
        |
        v
Backend searches Spotify for tracks
        |
        v
Frontend displays track results
        |
        v
User saves tracks as a playlist
```

## Mood Strategy

Instead of relying on Spotify's deprecated recommendations endpoint, we will map moods to search phrases.

Example:

```js
const moodQueries = {
  happy: ["happy pop", "feel good", "summer hits"],
  chill: ["chill lofi", "acoustic chill", "ambient pop"],
  focused: ["focus instrumental", "deep work", "lofi beats"]
};
```


