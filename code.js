console.log("Figma plugin has started.");

let accessToken;  // Store the access token globally

// Display the UI
figma.showUI(__html__, { width: 400, height: 300 });

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  console.log("Message received from UI:", msg);

  if (msg.type === 'access-token') {
    console.log("Access token received from UI:", msg.token);
    accessToken = msg.token;  // Store the access token for Spotify API requests
    displayPlaylists();  // Fetch and display Spotify playlists
  } else if (msg.type === 'start-timer') {
    startPomodoro(msg.workDuration, msg.breakDuration, msg.playlist);
  }
};

// Fetch and display Spotify playlists
async function displayPlaylists() {
  console.log("Fetching playlists using the access token...");

  if (!accessToken) {
    console.error("Access token is not available. Cannot fetch playlists.");
    figma.notify("Please authenticate with Spotify first.");
    return;
  }

  try {
    const playlists = await fetchUserPlaylists();
    
    if (playlists && playlists.length > 0) {
      console.log("Successfully fetched playlists:", playlists);
      figma.ui.postMessage({ type: 'display-playlists', playlists });
      console.log("Playlists sent to the UI.");
    } else {
      console.log("No playlists found or failed to fetch playlists.");
      figma.notify("No playlists found or failed to fetch playlists.");
    }
  } catch (error) {
    console.error("Error occurred while displaying playlists:", error);
    figma.notify("Error fetching playlists. Check the console for details.");
  }
}

// Fetch the user's playlists from Spotify
async function fetchUserPlaylists() {
  console.log("Making API request to Spotify to fetch user playlists...");

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.items;
    } else {
      const errorData = await response.json();
      console.error('Error response received from Spotify:', errorData);
      figma.notify('Failed to fetch playlists from Spotify.');
      return [];
    }
  } catch (error) {
    console.error('Network or API error while fetching playlists:', error);
    figma.notify('Failed to fetch playlists. Check the console for details.');
    return [];
  }
}

// Function to start the Pomodoro timer
function startPomodoro(workDuration, breakDuration, playlistUri) {
  console.log(`Starting Pomodoro: Work duration: ${workDuration}, Break duration: ${breakDuration}, Playlist: ${playlistUri}`);
  
  const workDurationMs = workDuration * 60 * 1000;
  const breakDurationMs = breakDuration * 60 * 1000;

  figma.notify(`Work session started! Duration: ${workDuration} minutes`);
  
  setTimeout(() => {
    figma.notify('Work session complete! Time for a break.');
    playSpotifyPlaylist(playlistUri);  // Play the Spotify playlist during the break

    setTimeout(() => {
      figma.notify('Break is over! Time to get back to work.');
    }, breakDurationMs);

  }, workDurationMs);

  console.log("Pomodoro timer simulation started.");
}

// Check if there is an active Spotify device
async function checkSpotifyDevice() {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const devices = data.devices;
      if (devices.length > 0) {
        console.log("Active Spotify devices found:", devices);
        return devices[0].id;  // Return the first active device
      } else {
        console.error("No active Spotify devices found.");
        figma.notify("No active Spotify device found. Please open Spotify.");
        return null;
      }
    } else {
      console.error('Failed to retrieve active devices from Spotify.');
      return null;
    }
  } catch (error) {
    console.error('Error occurred while checking for active Spotify devices:', error);
    return null;
  }
}

// Function to play Spotify playlist
async function playSpotifyPlaylist(playlistUri) {
  console.log("Attempting to play playlist:", playlistUri);

  if (!accessToken) {
    console.error("Access token is not available. Cannot play Spotify playlist.");
    figma.notify("Please authenticate with Spotify first.");
    return;
  }

  // Check if there is an active Spotify device
  const deviceId = await checkSpotifyDevice();
  if (!deviceId) {
    console.error("No active Spotify device found. Cannot play playlist.");
    return;
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context_uri: playlistUri,  // Spotify playlist URI
        offset: { position: 0 },   // Start at the first track
        position_ms: 0             // Start from the beginning of the track
      })
    });

    if (response.ok) {
      console.log("Spotify playlist started playing successfully.");
      figma.notify("Playlist started playing on your device.");
    } else {
      const errorData = await response.json();
      console.error('Error playing Spotify playlist:', errorData);
      figma.notify('Failed to play playlist. Ensure Spotify is open and active.');
    }
  } catch (error) {
    console.error('Error occurred while trying to play the playlist:', error);
    figma.notify('Failed to play playlist. Check the console for details.');
  }
}
