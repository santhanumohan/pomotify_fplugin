let workTimer, breakTimer;

// Function to start the Pomodoro cycle
function startPomodoro(workDuration, breakDuration) {
  let workTime = workDuration * 60 * 1000;
  let breakTime = breakDuration * 60 * 1000;

  workTimer = setTimeout(() => {
    // Notify the user the work session is over
    figma.notify("Time for a break!");
    startBreak(breakDuration);
  }, workTime);
}

// Function to start the break cycle
function startBreak(breakDuration) {
  breakTimer = setTimeout(() => {
    figma.notify("Break over, back to work!");
    // Restart the Pomodoro cycle
    startPomodoro(workDuration, breakDuration);
  }, breakDuration * 60 * 1000);
}

// Function to stop the timers
function stopPomodoro() {
  clearTimeout(workTimer);
  clearTimeout(breakTimer);
  figma.notify("Pomodoro stopped.");
}
