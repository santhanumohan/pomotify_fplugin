console.log("Figma plugin has started.");

let accessToken; // Store the Spotify access token globally

// Display the UI
figma.showUI(__html__, { width: 400, height: 300 });

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  console.log("Message received from UI:", msg);

  if (msg.type === 'access-token') {
    console.log("Access token received:", msg.token);
    accessToken = msg.token; // Store the access token for Spotify API requests
    displayPlaylists(); // Fetch and display playlists after getting the token
  } else if (msg.type === 'start-timer') {
    startPomodoro(msg.workDuration, msg.breakDuration, msg.playlist);
  } else if (msg.type === 'stop-timer') {
    stopPomodoro();
  }
};

// Fetch user playlists from Spotify API
async function fetchUserPlaylists() {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.items; // Return the array of playlists
    } else {
      const errorData = await response.json();
      console.error('Error fetching playlists:', errorData);
      figma.notify('Failed to fetch playlists.');
      return [];
    }
  } catch (error) {
    console.error('Network or API error:', error);
    figma.notify('Failed to fetch playlists. Check console for details.');
    return [];
  }
}

// Function to display playlists in the UI
async function displayPlaylists() {
  if (!accessToken) {
    console.log('No access token available, cannot fetch playlists.');
    return;
  }
  
  const playlists = await fetchUserPlaylists();
  if (playlists.length > 0) {
    // Send playlists to the UI to display
    figma.ui.postMessage({
      type: 'display-playlists',
      playlists: playlists
    });
  } else {
    figma.notify('No playlists available.');
  }
}

// Timer and countdown logic
let workTimer;
let breakTimer;
let countdownInterval;

// Start the Pomodoro timer
function startPomodoro(workDuration, breakDuration, playlistUri) {
  let workTime = workDuration * 60 * 1000;

  // Start the countdown for the work session
  startCountdown(workDuration * 60, 'Work');

  // Play the selected playlist via Spotify API
  playSpotifyPlaylist(playlistUri);

  // Set a timer for the work session
  workTimer = setTimeout(() => {
    figma.notify("Time for a break!");
    
    // Stop Spotify playback when the work session ends
    stopSpotifyPlayback();
    
    startBreak(breakDuration);
  }, workTime);
}

// Start the break session
function startBreak(breakDuration) {
  let breakTime = breakDuration * 60 * 1000;

  // Start the countdown for the break session
  startCountdown(breakDuration * 60, 'Break');

  breakTimer = setTimeout(() => {
    figma.notify("Break over, back to work!");
    startPomodoro(workDuration, breakDuration);  // Restart the Pomodoro cycle
  }, breakTime);
}

// Stop the Pomodoro timer
function stopPomodoro() {
  clearTimeout(workTimer); // Stop the work timer
  clearTimeout(breakTimer); // Stop the break timer
  clearInterval(countdownInterval); // Stop the countdown interval
  stopSpotifyPlayback(); // Stop Spotify playback
  figma.notify("Pomodoro stopped.");
}

// Function to play a Spotify playlist
async function playSpotifyPlaylist(playlistUri) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "context_uri": playlistUri,
        "offset": { "position": 0 },
        "position_ms": 0
      })
    });

    if (response.ok) {
      console.log('Spotify playlist started!');
    } else {
      console.error('Error starting Spotify playlist:', response);
    }
  } catch (error) {
    console.error('Error playing Spotify playlist:', error);
  }
}

// Function to stop Spotify playback
async function stopSpotifyPlayback() {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/pause`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('Spotify playback stopped!');
    } else {
      console.error('Error stopping Spotify playback:', response);
    }
  } catch (error) {
    console.error('Error stopping Spotify playback:', error);
  }
}

// Countdown logic for the timer
function startCountdown(durationInSeconds, sessionType) {
  let timeRemaining = durationInSeconds;

  // Clear any existing countdown
  clearInterval(countdownInterval);

  // Start a new countdown
  countdownInterval = setInterval(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    // Send the updated time to the UI
    figma.ui.postMessage({
      type: 'update-counter',
      minutes: minutes,
      seconds: seconds,
      sessionType: sessionType
    });

    // Decrease the time remaining
    timeRemaining--;

    // Clear the countdown when the timer reaches zero
    if (timeRemaining < 0) {
      clearInterval(countdownInterval);
    }
  }, 1000); // Update every second
}
