require("dotenv").config();

const express = require("express");
const cookieSession = require("cookie-session");

const app = express();
const PORT = process.env.PORT || 3000;

const spotifyConfig = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
};

const spotifyScopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private"
];

const moodQueries = {
    happy: ["happy pop", "feel good", "summer hits"],
    chill: ["chill lofi", "acoustic chill", "ambient pop"],
    focused: ["focused instrumental", "deep work", "lofi beats"],
    energetic: ["workout pop", "dance hits", "pump up songs"],
    sad: ["sad indie", "heartbreak", "melancholy"],
    romantic: ["romantic r&b", "love songs", "flirtatious pop"],
    angry: ["angry rock", "metal workout", "rage playlist"],
    sleepy: ["sleep music", "ambient calm", "soft piano"]
};

function createRandomString(length) {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let text = "";

    for (let index = 0; index < length; index += 1)
    {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

function getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

app.use(express.json());

app.use(
    cookieSession({
        name: "playlist-generator-session",
        keys: [process.env.SESSION_SECRET],
        maxAge: 24 * 60 * 60 * 1000
    })
);

app.use(express.static("public"));

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Playlist Generator backend is running."
    });
});

app.get("/login", (req, res) => {
    const state = createRandomString(16);

    req.session.spotifyAuthState = state;

    const queryParams = new URLSearchParams({
        response_type: "code",
        client_id: spotifyConfig.clientId,
        scope: spotifyScopes.join(" "),
        redirect_uri: spotifyConfig.redirectUri,
        state,
        show_dialog: "true"
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
});

app.get("/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`Spotify login failed: ${error}`);
    }

    if (!state || state !== req.session.spotifyAuthState) {
        return res.status(400).send("Spotify login failed: invalid state.");
    }

    req.session.spotifyAuthState = null;

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
                "Basic " +
                Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString("base64")
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: spotifyConfig.redirectUri
        })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        return res.status(400).json(tokenData);
    }

    req.session.accessToken = tokenData.access_token;
    req.session.refreshToken = tokenData.refresh_token;
    req.session.expiresAt = Date.now() + tokenData.expires_in * 1000;

    res.redirect("/"); //redirects to the playlist page after successful login
});

app.get("/api/me", async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({
            error: "Not logged in."
        });
    }

    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }
    });
    
    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
        return res.status(profileResponse.status).json(profileData);
    }

    res.json({
        id: profileData.id,
        displayName: profileData.display_name,
        country: profileData.country,
        product: profileData.product
    });
});

app.get("/api/tracks", async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({
            error: "Not logged in"
        });
    }

    const mood = req.query.mood;

    if (!mood || !moodQueries[mood]) {
        return res.status(400).json({
            error: "Please provide a valid mood.",
            validMoods: Object.keys(moodQueries)
        });
    }

    const searchTerm = getRandomItem(moodQueries[mood]);

    const searchParams = new URLSearchParams({
        q: searchTerm,
        type: "track",
        limit: "10"
    });

    const tracksResponse = await fetch(
        `https://api.spotify.com/v1/search?${searchParams.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${req.session.accessToken}`
            }
        }
    );

    const tracksData = await tracksResponse.json();

    if (!tracksResponse.ok) {
        return res.status(tracksResponse.status).json(tracksData);
    }

    const tracks = tracksData.tracks.items.map((track) => {
        return {
            id: track.id,
            uri: track.uri,
            name: track.name,
            artists: track.artists.map((artist) => artist.name).join(", "),
            album: track.album.name,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            image: track.album.images[0]?.url
        };
    });

    res.json({
        mood,
        searchTerm,
        tracks
    });
});

app.post("/api/playlists", async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({
            error: "Not logged in"
        });
    }

    const { name, trackUris } = req.body;

    if (!name || !Array.isArray(trackUris) || trackUris.length === 0) {
        return res.status(400).json({
            error: "Please provide a playlist name and at least one track."
        });
    }

    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}` 
        }
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
        return res.status(profileResponse.status).json(profileData);
    }

    const playlistResponse = await fetch(
        "https://api.spotify.com/v1/me/playlists",
        {
           method: "POST",
           headers: {
            Authorization: `Bearer ${req.session.accessToken}`,
            "Content-Type": "application/json"
           },
           body: JSON.stringify({
            name,
            description: "Generated by Moodify Playlist Generator",
            public: false
           })
        }
    );

    const playlistData = await playlistResponse.json();

    if (!playlistResponse.ok) {
        return res.status(playlistResponse.status).json(playlistData);
    }

    const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/items`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${req.session.accessToken}`,
                "Content-Type": "application.json"
            },
            body: JSON.stringify({
                uris: trackUris
            })
        }
    );

    const addTracksData = await addTracksResponse.json();

    if (!addTracksResponse.ok) {
        return res.status(addTracksResponse.status).json(addTracksData);
    }
    res.json({
        id: playlistData.id,
        name: playlistData.name,
        url: playlistData.external_urls.spotify
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});