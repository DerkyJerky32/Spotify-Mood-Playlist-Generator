const profileStatus = document.querySelector("#profileStatus");
const trackStatus = document.querySelector("#trackStatus");
const tracksList = document.querySelector("#tracksList");
const moodButtons = document.querySelectorAll(".mood-button");
const savePlaylistForm = document.querySelector("#savePlaylistForm");
const playlistNameInput = document.querySelector("#playlistName");
const saveStatus = document.querySelector("#saveStatus");
const savePlaylistButton = document.querySelector("#savePlaylistButton");



let selectedMood = null;
let currentTracks = [];

let isSaving = false;

async function loadProfile() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            profileStatus.textContent = "Not connected yet.";
            return;
        }
        const profile = await response.json();

        profileStatus.textContent = `Connected as ${profile.displayName || profile.id}`;
    } catch (error) {
        profileStatus.textContent = "Could not check Spotify connection";
    }
}

function setSelectedMood(mood) {
    selectedMood = mood;
    playlistNameInput.value = `Moodify ${formatMoodName(mood)} Mix`;

    moodButtons.forEach((button) => {
        const isSelected = button.dataset.mood === mood;
        button.classList.toggle("is-selected", isSelected);
    });
}

function renderTracks(tracks) {
    tracksList.innerHTML = "";
    
    if (tracks.length === 0) {
        trackStatus.textContent = "No tracks found for that mood.";
        return;
    }

    tracks.forEach((track) => {
        const trackCard = document.createElement("article");
        trackCard.className = "track-card";

        const albumImage = document.createElement("img");
        albumImage.src = track.image || "";
        albumImage.alt = `${track.album} album cover`;

        const trackInfo = document.createElement("div");
        trackInfo.className = "track-info";

        const trackName = document.createElement("h3");
        trackName.textContent = track.name;

        const trackDetails = document.createElement("p");
        trackDetails.textContent = `${track.artists} • ${track.album}`;

        const trackLink = document.createElement("a");
        trackLink.className = "track-link";
        trackLink.href = track.spotifyUrl;
        trackLink.target = "_blank";
        trackLink.rel = "noopener noreferrer";
        trackLink.textContent = "Open";

        trackInfo.append(trackName, trackDetails);
        trackCard.append(albumImage, trackInfo, trackLink);
        tracksList.append(trackCard);
    });
}

function showPlaylistSavedMessage(playlist) {
    saveStatus.textContent = "";

    const message = document.createElement("span");
    message.textContent = "Playlist Saved: ";

    const playlistLink = document.createElement("a");
    playlistLink.href = playlist.url;
    playlistLink.target = "_blank";
    playlistLink.rel = "noopener noreferrer";
    playlistLink.textContent = playlist.name;

    saveStatus.append(message, playlistLink);
}

function formatMoodName(mood) {
    return mood.charAt(0).toUpperCase() + mood.slice(1);
}

async function generateTracks(mood) {
    setSelectedMood(mood);

    trackStatus.textContent = "Finding tracks...";
    tracksList.innerHTML = "";
    saveStatus.textContent = "";
    savePlaylistButton.disabled = true;

    try {
        const response = await fetch(`/api/tracks?mood=${encodeURIComponent(mood)}`);
        const data = await response.json();

        if (!response.ok) {
            trackStatus.textContent = data.error || "Could not generate tracks.";
            return;
        }

        currentTracks = data.tracks;

        trackStatus.textContent = `Showing tracks for ${data.mood}. Search phrase: ${data.searchTerm}.`;
        renderTracks(currentTracks);
        savePlaylistButton.disabled = currentTracks.length === 0;
    } catch (error) {
        console.error(error);
        trackStatus.textContent = "Could not connect to the server. Check console and terminal.";
    }
}

async function savePlaylist(event) {
    event.preventDefault();

    if (isSaving) {
        return;
    }

    isSaving = true;

    if (currentTracks.length === 0) {
        saveStatus.textContent = "Generate tracks before saving a playlist." ;
    }

    const playlistName = playlistNameInput.value.trim();

    if (!playlistName) {
        saveStatus.textContent = "Enter a playlist name.";
        return;
    }

    saveStatus.textContent = "Saving playlist...";
    savePlaylistButton.disabled = true;

    const trackUris = currentTracks.map((track) => track.uri);

    try {
        const response = await fetch("/api/playlists", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: playlistName,
                trackUris
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = 
                typeof data.error === "string"
                    ? data.error
                    : data.error?.message || "Could not save playlist.";

            saveStatus.textContent = errorMessage;
            savePlaylistButton.disabled = false;
            return;
        }

        saveStatus.innerHTML = `Playlist saved: <a href="${data.url}" target="_blank" rel="noopener noreferrer">${data.name}</a>`;
        isSaving = false;
    } catch (error) {
        console.error(error);
        saveStatus.textContent = "Could not connect to the server.";
        savePlaylistButton.disabled = false;
        isSaving = false;
    }
}

moodButtons.forEach((button) => {
    button.addEventListener("click", () => {
        generateTracks(button.dataset.mood);
    });
});

savePlaylistForm.addEventListener("submit", savePlaylist);

loadProfile();

