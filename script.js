/* Truth Seekers Game - script.js with enhanced Firebase debugging */

// Game state
const gameState = {
  gameCode: "",
  players: [],
  currentPlayerIndex: 0,
  questions: [],
  currentQuestionIndex: 0,
  fakemakerName: "",
  fakemakerUnmasked: false,
  playerName: "",
  playerRole: "",
  playerSteps: {},
  usedQuestions: [], // Track which questions have been used
  playerQuestions: {}, // Track which question each player gets
};

// Role codes
const roleCodes = [
  { code: "1288", role: "Fakemaker" },
  { code: "7523", role: "Factchecker" },
  { code: "7358", role: "Factchecker" },
  { code: "6411", role: "Factchecker" },
  { code: "9876", role: "Factchecker" },
  { code: "5432", role: "Factchecker" },
];

// DOM Elements
const screens = document.querySelectorAll(".screen");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWuEvMYs1bEZs8OV8TRaILoI_HA2Urx4I",
  authDomain: "truth-seekers-lauren.firebaseapp.com",
  databaseURL: "https://truth-seekers-lauren-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "truth-seekers-lauren",
  storageBucket: "truth-seekers-lauren.appspot.com",
  messagingSenderId: "342706717766",
  appId: "1:342706717766:web:83349268a19770cd35f647",
  measurementId: "G-4Q61SPTCF9",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Shuffle questions
function shuffleQuestions() {
  // Simple Fisher-Yates shuffle
  for (let i = gameState.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.questions[i], gameState.questions[j]] = [
      gameState.questions[j],
      gameState.questions[i],
    ];
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load questions
  try {
    const response = await fetch("questions.json");
    if (!response.ok) {
      // Instead of throwing an error, create default questions
      console.log("Questions file not found, creating default questions");
      gameState.questions = [];
    } else {
      gameState.questions = await response.json();
    }

    // Add multiple questions to ensure game continues beyond 2 questions
    gameState.questions = [
      {
        id: 1,
        type: "video",
        content: "Is deze video echt of nep?",
        answer: false, // "fake" is false
        videoUrl: "VIDEO1.mp4",
      },
      {
        id: 2,
        type: "text",
        content: "Vraag 2: Denk je dat deze uitspraak waar is: 'De aarde is plat'?",
        answer: false, // This is fake/false
      },
      {
        id: 3,
        type: "text",
        content: "Vraag 3: Is het waar dat water kookt bij 100 graden Celsius?",
        answer: true, // This is true/real
      },
      {
        id: 4,
        type: "text",
        content: "Vraag 4: Klopt het dat mensen slechts 10% van hun hersenen gebruiken?",
        answer: false, // This is a myth/fake
      },
      {
        id: 5,
        type: "text",
        content: "Vraag 5: Is het waar dat de Chinese Muur vanuit de ruimte zichtbaar is?",
        answer: false, // This is a common myth/fake
      },
      {
        id: 6,
        type: "text",
        content: "Vraag 6: Klopt het dat bliksem nooit twee keer op dezelfde plaats inslaat?",
        answer: false, // This is false/fake
      },
      {
        id: 7,
        type: "text",
        content: "Vraag 7: Is het waar dat goudvissen een geheugen van 3 seconden hebben?",
        answer: false, // This is false/fake
      },
      {
        id: 8,
        type: "text",
        content: "Vraag 8: Klopt het dat de zon een ster is?",
        answer: true, // This is true/real
      },
      {
        id: 9,
        type: "text",
        content: "Vraag 9: Is het waar dat kamelen water opslaan in hun bulten?",
        answer: false, // This is false/fake - they store fat
      },
      {
        id: 10,
        type: "text",
        content: "Vraag 10: Klopt het dat antibiotica werken tegen virussen?",
        answer: false, // This is false/fake - they work against bacteria
      }
    ];

    // Shuffle the questions for variety
    shuffleQuestions();
  } catch (error) {
    console.error("Error loading questions:", error);
    // Create default questions if there's an error
    gameState.questions = [
      {
        id: 1,
        type: "video",
        content: "Is deze video echt of nep?",
        answer: false,
        videoUrl: "VIDEO1.mp4",
      },
      {
        id: 2,
        type: "text",
        content: "Vraag 2: Denk je dat deze uitspraak waar is: 'De aarde is plat'?",
        answer: false,
      },
      {
        id: 3,
        type: "text",
        content: "Vraag 3: Is het waar dat water kookt bij 100 graden Celsius?",
        answer: true,
      },
      {
        id: 4,
        type: "text",
        content: "Vraag 4: Klopt het dat mensen slechts 10% van hun hersenen gebruiken?",
        answer: false,
      },
      {
        id: 5,
        type: "text",
        content: "Vraag 5: Is het waar dat de Chinese Muur vanuit de ruimte zichtbaar is?",
        answer: false,
      }
    ];
  }

  // Set up event listeners
  document
    .getElementById("hostGameBtn")
    .addEventListener("click", () => showScreen("hostSetupScreen"));
  document
    .getElementById("goToJoinBtn")
    .addEventListener("click", () => showScreen("joinGameScreen"));
  document
    .getElementById("createGameBtn")
    .addEventListener("click", createGame);
  document
    .getElementById("submitJoinBtn")
    .addEventListener("click", joinGame);
  document
    .getElementById("submitRoleBtn")
    .addEventListener("click", submitRoleCode);
  document
    .getElementById("continueAfterRoleBtn")
    .addEventListener("click", continueAfterRole);
  document
    .getElementById("startGameBtn")
    .addEventListener("click", startGame);
  document
    .getElementById("showQuestionBtn")
    .addEventListener("click", showQuestion);
  document
    .getElementById("trueBtn")
    .addEventListener("click", () => submitAnswer(true));
  document
    .getElementById("falseBtn")
    .addEventListener("click", () => submitAnswer(false));
  document
    .getElementById("nextTurnBtn")
    .addEventListener("click", nextTurn);
  document
    .getElementById("shareGameBtn")
    .addEventListener("click", shareGame);

  // Check for game code in URL
  checkForGameCodeInURL();

  // Start listening for updates immediately to check connection status
  startListeningForUpdates();
});

// Show a specific screen
function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

// Generate a random game code
function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game as host
async function createGame() {
  const hostName = document.getElementById("hostNameInput").value.trim();
  if (!hostName) {
    alert("Voer je naam in");
    return;
  }

  // Show loading indicator
  document.getElementById("createGameBtn").disabled = true;
  document.getElementById("createGameBtn").textContent = "Spel aanmaken...";

  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  gameState.players = [
    {
      name: hostName,
      role: "",
      isHost: true,
      steps: 0,
    },
  ];

  // Initialize player steps
  gameState.playerSteps[hostName] = 0;

  try {
    // Save game to Firebase
    console.log("Attempting to save new game to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates (if not already started)
    startListeningForUpdates();

    // Display game code
    document.getElementById("gameCodeDisplay").textContent = gameState.gameCode;

    // Modified: Direct host to role code screen instead of host game screen
    showScreen("roleCodeScreen");
  } catch (error) {
    console.error("Error creating game:", error);
    alert("Kon geen spel aanmaken. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("createGameBtn").disabled = false;
    document.getElementById("createGameBtn").textContent = "Maak Spel";
  }
}

// Join an existing game
async function joinGame() {
  const playerName = document.getElementById("playerNameInput").value.trim();
  const gameCode = document
    .getElementById("gameCodeInput")
    .value.trim()
    .toUpperCase();

  if (!playerName || !gameCode) {
    showError("joinErrorMessage", "Voer je naam en spelcode in");
    return;
  }

  // Show loading indicator
  document.getElementById("submitJoinBtn").disabled = true;
  document.getElementById("submitJoinBtn").textContent = "Deelnemen...";

  try {
    // Try to load game from Firebase
    console.log("Attempting to load game from Firebase:", gameCode);
    const gameData = await loadGameFromFirebase(gameCode);

    if (!gameData) {
      showError(
        "joinErrorMessage",
        "Spel niet gevonden. Controleer de code en probeer opnieuw."
      );
      return;
    }

    // Check if name is already taken
    if (gameData.players && gameData.players.some((p) => p.name === playerName)) {
      showError(
        "joinErrorMessage",
        "Naam is al in gebruik. Kies een andere naam."
      );
      return;
    }

    // Load game state
    gameState.gameCode = gameCode;
    gameState.playerName = playerName;
    gameState.players = gameData.players || [];
    gameState.currentPlayerIndex = gameData.currentPlayerIndex || 0;
    gameState.currentQuestionIndex = gameData.currentQuestionIndex || 0;
    gameState.fakemakerName = gameData.fakemakerName || "";
    gameState.fakemakerUnmasked = gameData.fakemakerUnmasked || false;
    gameState.playerSteps = gameData.playerSteps || {};
    gameState.questions = gameData.questions || [];
    gameState.gameStarted = gameData.gameStarted || false;

    // Add new player
    const newPlayer = {
      name: playerName,
      role: "",
      isHost: false,
      steps: 0,
    };

    gameState.players.push(newPlayer);

    // Initialize player steps
    gameState.playerSteps[playerName] = 0;

    // Save updated game state
    console.log("Attempting to save updated game state to Firebase after join:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates
    startListeningForUpdates();

    // Show role code screen
    showScreen("roleCodeScreen");
  } catch (error) {
    console.error("Error joining game:", error);
    showError("joinErrorMessage", "Fout bij deelnemen aan spel. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("submitJoinBtn").disabled = false;
    document.getElementById("submitJoinBtn").textContent = "Deelnemen";
  }
}

// Show error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");

  // Hide after 3 seconds
  setTimeout(() => {
    errorElement.classList.add("hidden");
  }, 3000);
}

// Update player list in host screen
function updatePlayerList() {
  const playerListElement = document.getElementById("hostPlayerList");
  playerListElement.innerHTML = "";

  gameState.players.forEach((player) => {
    const playerItem = document.createElement("div");
    playerItem.className = "player-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = player.name;

    // Don't show role information
    const roleSpan = document.createElement("span");
    roleSpan.className = "player-role";
    roleSpan.textContent = player.role ? "Role assigned" : "No role yet";

    playerItem.appendChild(nameSpan);
    playerItem.appendChild(roleSpan);
    playerListElement.appendChild(playerItem);
  });

  // Enable start button if there are at least 2 players and at least one has a role
  document.getElementById("startGameBtn").disabled = gameState.players.length < 2 || !gameState.players.some((p) => p.role);
}

// Start game (host only)
async function startGame() {
  // No longer require a Fakemaker to be in the game
  // Just check that players have roles assigned
  if (!gameState.players.some((player) => player.role)) {
    alert("Spelers moeten eerst rollen toegewezen krijgen.");
    showScreen("roleCodeScreen");
    return;
  }

  // Show loading indicator
  document.getElementById("startGameBtn").disabled = true;
  document.getElementById("startGameBtn").textContent = "Starting...";

  try {
    // Update game state
    gameState.gameStarted = true;

    // Save to Firebase
    console.log("Attempting to save game start to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Update display
    updateGameDisplay();

    // Show game screen
    showScreen("gameScreen");
  } catch (error) {
    console.error("Error starting game:", error);
    alert("Failed to start game. Please try again.");
  } finally {
    // Reset button
    document.getElementById("startGameBtn").disabled = false;
    document.getElementById("startGameBtn").textContent = "Start Game";
  }
}

// Submit role code
async function submitRoleCode() {
  const roleCode = document.getElementById("roleCodeInput").value.trim();

  if (!roleCode) {
    showError("roleErrorMessage", "Voer een rolcode in");
    return;
  }

  // Validate role code
  const roleEntry = roleCodes.find((r) => r.code === roleCode);
  if (!roleEntry) {
    showError("roleErrorMessage", "Ongeldige rolcode");
    return;
  }

  // Show loading indicator
  document.getElementById("submitRoleBtn").disabled = true;
  document.getElementById("submitRoleBtn").textContent = "Bevestigen...";

  try {
    // Update player role
    gameState.playerRole = roleEntry.role;

    // Update player in game state
    const playerIndex = gameState.players.findIndex(
      (p) => p.name === gameState.playerName
    );
    if (playerIndex !== -1) {
      gameState.players[playerIndex].role = roleEntry.role;

      // If this is the Fakemaker, record their name
      if (roleEntry.role === "Fakemaker") {
        gameState.fakemakerName = gameState.playerName;
      }
    }

    // Save to Firebase
    console.log("Attempting to save role update to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Display role
    document.getElementById("playerRoleDisplay").textContent = roleEntry.role;

    // Set role instructions
    if (roleEntry.role === "Fakemaker") {
      document.getElementById("roleInstructions").textContent = 
        "Als Fakemaker zie je de juiste antwoorden. Probeer niet op te vallen tussen de Factcheckers!";
    } else {
      document.getElementById("roleInstructions").textContent = 
        "Als Factchecker probeer je te ontdekken wie de Fakemaker is door hun antwoorden te observeren.";
    }

    // Show role confirmation screen
    showScreen("roleConfirmationScreen");
  } catch (error) {
    console.error("Error submitting role:", error);
    showError("roleErrorMessage", "Fout bij bevestigen rol. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("submitRoleBtn").disabled = false;
    document.getElementById("submitRoleBtn").textContent = "Bevestigen";
  }
}

// Continue after role assignment
function continueAfterRole() {
  // If player is host, go to host screen
  const isHost = gameState.players.find(
    (p) => p.name === gameState.playerName
  )?.isHost;

  if (isHost) {
    updatePlayerList();
    showScreen("hostGameScreen");
  } else {
    // Check if game has already started
    if (gameState.gameStarted) {
      // Game already started, join immediately
      updateGameDisplay();
      showScreen("gameScreen");
    } else {
      // Show waiting screen with clear message
      document.getElementById("roleInstructions").textContent = 
        "Waiting for the host to start the game. You will automatically join when the game begins.";
      // Keep on role confirmation screen but update the UI to show waiting status
      document.getElementById("continueAfterRoleBtn").style.display = "none";
    }
  }
}

// Update game display
function updateGameDisplay() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Update current player display
  document.getElementById("currentPlayerDisplay").textContent = currentPlayer.name;

  // Update steps display
  const steps = gameState.playerSteps[gameState.playerName] || 0;
  document.getElementById("stepsDisplay").textContent = steps;

  // Hide role name for everyone
  document.getElementById("roleName").textContent = "Hidden";

  // Show answer if player is Fakemaker and not unmasked
  if (gameState.playerRole === "Fakemaker" && !gameState.fakemakerUnmasked) {
    document.getElementById("answerInfo").classList.remove("hidden");
    // Get the current player's assigned question for showing the answer
    const currentPlayerQuestion = gameState.playerQuestions[currentPlayer.name];
    if (currentPlayerQuestion) {
      document.getElementById("correctAnswer").textContent = currentPlayerQuestion.answer ? "Echt" : "Fake";
    }
  } else {
    document.getElementById("answerInfo").classList.add("hidden");
  }

  // Show/hide turn info based on whether it's the player's turn
  const yourTurnInfo = document.getElementById("yourTurnInfo");
  if (currentPlayer.name === gameState.playerName) {
    yourTurnInfo.style.display = "block";
  } else {
    yourTurnInfo.style.display = "none";
  }
}

// Show question
function showQuestion() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  let questionToShow;
  
  // Check if this player already has an assigned question
  if (gameState.playerQuestions[currentPlayer.name]) {
    questionToShow = gameState.playerQuestions[currentPlayer.name];
  } else {
    // Find an unused question for this player
    const availableQuestions = gameState.questions.filter(q => !gameState.usedQuestions.includes(q.id));
    
    if (availableQuestions.length === 0) {
      // If all questions are used, reset and start over
      gameState.usedQuestions = [];
      gameState.playerQuestions = {};
      questionToShow = gameState.questions[0];
    } else {
      // Assign a new unique question to this player
      questionToShow = availableQuestions[0];
    }
    
    // Mark this question as used and assign it to the player
    gameState.usedQuestions.push(questionToShow.id);
    gameState.playerQuestions[currentPlayer.name] = questionToShow;
  }

  document.getElementById("questionNumber").textContent = `Vraag voor ${currentPlayer.name}`;
  document.getElementById("questionContent").textContent = questionToShow.content;

  // Hide all media containers first
  document.getElementById("imageContainer").classList.add("hidden");
  document.getElementById("videoContainer").classList.add("hidden");
  document.getElementById("externalActionContainer").classList.add("hidden");

  // Show appropriate media based on question type
  if (questionToShow.type === "image") {
    document.getElementById("questionImage").src = questionToShow.imagePath;
    document.getElementById("imageContainer").classList.remove("hidden");
  } else if (questionToShow.type === "video" && questionToShow.videoUrl) {
    document.getElementById("questionVideo").src = questionToShow.videoUrl;
    document.getElementById("videoContainer").classList.remove("hidden");
  } else if (
    questionToShow.type === "external_action" &&
    questionToShow.externalActionPrompt
  ) {
    document.getElementById("externalActionPrompt").textContent = questionToShow.externalActionPrompt;
    document.getElementById("externalActionContainer").classList.remove("hidden");
  }

  showScreen("questionScreen");
}

// Submit answer
async function submitAnswer(answer) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentQuestion = gameState.playerQuestions[currentPlayer.name];
  const isCorrect = answer === currentQuestion.answer;

  let resultMessage = "";
  let stepChange = 0;

  if (isCorrect) {
    document.getElementById("resultTitle").textContent = "Correct!";
    stepChange = 1;
    resultMessage = `${gameState.playerName} gaat 1 stap vooruit.`;
  } else {
    document.getElementById("resultTitle").textContent = "Wrong!";
    stepChange = -Math.floor(Math.random() * 5) - 1; // -1 to -5 steps
    resultMessage = `${gameState.playerName} gaat ${Math.abs(stepChange)} stap(pen) achteruit.`;
  }

  // Update player steps
  gameState.playerSteps[gameState.playerName] = (
    gameState.playerSteps[gameState.playerName] || 0
  ) + stepChange;
  if (gameState.playerSteps[gameState.playerName] < 0) {
    gameState.playerSteps[gameState.playerName] = 0;
  }

  // Update player in players array
  const playerIndex = gameState.players.findIndex(
    (p) => p.name === gameState.playerName
  );
  if (playerIndex !== -1) {
    gameState.players[playerIndex].steps = gameState.playerSteps[gameState.playerName];
  }

  // Display result
  document.getElementById("resultMessage").textContent = resultMessage;
  document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName];

  // Save to Firebase
  try {
    console.log("Attempting to save answer to Firebase:", gameState.gameCode);
    await saveGameToFirebase();
    showScreen("resultScreen");
  } catch (error) {
    console.error("Error saving answer:", error);
    alert("Error saving your answer. Please try again.");
  }
}

// Next turn
async function nextTurn() {
  // Move to next player
  gameState.currentPlayerIndex = (
    gameState.currentPlayerIndex + 1
  ) % gameState.players.length;

  // Check if all players have answered their questions
  const allPlayersAnswered = gameState.players.every(player => 
    gameState.playerQuestions[player.name] !== undefined
  );

  // If all players have answered and we're back to the first player, check if we should end
  if (gameState.currentPlayerIndex === 0 && allPlayersAnswered) {
    // Check if we have enough questions for another round
    const totalQuestionsNeeded = gameState.players.length;
    const remainingQuestions = gameState.questions.length - gameState.usedQuestions.length;
    
    if (remainingQuestions < totalQuestionsNeeded) {
      // Not enough questions for another full round, end the game
      endGame();
      return;
    }
  }

  // Save to Firebase
  try {
    console.log("Attempting to save next turn to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Update display
    updateGameDisplay();

    // Show game screen
    showScreen("gameScreen");
  } catch (error) {
    console.error("Error updating turn:", error);
    alert("Error updating turn. Please try again.");
  }
}

// End game
function endGame() {
  // Find winner (player with most steps)
  let maxSteps = -1;
  let winners = [];

  Object.entries(gameState.playerSteps).forEach(([name, steps]) => {
    if (steps > maxSteps) {
      maxSteps = steps;
      winners = [name];
    } else if (steps === maxSteps) {
      winners.push(name);
    }
  });

  // Display winner
  document.getElementById("resultTitle").textContent = "Game Over!";

  if (winners.length === 1) {
    document.getElementById("resultMessage").textContent = `${winners[0]} wins with ${maxSteps} steps!`;
  } else {
    document.getElementById("resultMessage").textContent = `It's a tie between ${winners.join(" and ")} with ${maxSteps} steps!`;
  }

  // Hide the next turn button since game is over
  document.getElementById("nextTurnBtn").style.display = "none";

  showScreen("resultScreen");
}

// Reset game
function resetGame() {
  // Clear game state
  gameState.gameCode = "";
  gameState.players = [];
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionIndex = 0;
  gameState.fakemakerName = "";
  gameState.fakemakerUnmasked = false;
  gameState.playerName = "";
  gameState.playerRole = "";
  gameState.playerSteps = {};
  gameState.gameStarted = false;
  gameState.usedQuestions = [];
  gameState.playerQuestions = {};

  // Stop listening for updates
  stopListeningForUpdates();

  // Show start screen
  showScreen("startScreen");
}

// Save game to Firebase
async function saveGameToFirebase() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);

  // Create a sanitized copy of the game state to ensure no undefined values
  const sanitizedGameState = {
    players: gameState.players || [],
    currentPlayerIndex: gameState.currentPlayerIndex || 0,
    currentQuestionIndex: gameState.currentQuestionIndex || 0,
    fakemakerName: gameState.fakemakerName || "",
    fakemakerUnmasked: gameState.fakemakerUnmasked === true,
    playerSteps: gameState.playerSteps || {},
    questions: gameState.questions || [],
    gameStarted: gameState.gameStarted === true,
    usedQuestions: gameState.usedQuestions || [],
    playerQuestions: gameState.playerQuestions || {},
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
  };

  try {
    await gameRef.set(sanitizedGameState);
    console.log("Game state saved to Firebase successfully.", sanitizedGameState);
  } catch (error) {
    console.error("Error saving game state to Firebase:", error);
    throw error; // Re-throw to be caught by calling function
  }
}

// Load game from Firebase
async function loadGameFromFirebase(gameCode) {
  if (!gameCode) return null;

  const gameRef = database.ref(`games/${gameCode}`);

  try {
    const snapshot = await gameRef.once("value");
    const gameData = snapshot.val();
    console.log("Game data loaded from Firebase:", gameData);
    return gameData;
  } catch (error) {
    console.error("Error loading game from Firebase:", error);
    return null;
  }
}

// Start listening for updates
function startListeningForUpdates() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);

  // Listen for game updates
  gameRef.on("value", (snapshot) => {
    const data = snapshot.val();
    console.log("Firebase real-time update received:", data);
    if (!data) {
      console.warn("No data received from Firebase snapshot.");
      return;
    }

    // Update local game state
    gameState.players = data.players || gameState.players;
    gameState.currentPlayerIndex = data.currentPlayerIndex !== undefined ? data.currentPlayerIndex : gameState.currentPlayerIndex;
    gameState.currentQuestionIndex = data.currentQuestionIndex !== undefined ? data.currentQuestionIndex : gameState.currentQuestionIndex;
    gameState.fakemakerName = data.fakemakerName || gameState.fakemakerName;
    gameState.fakemakerUnmasked = data.fakemakerUnmasked !== undefined ? data.fakemakerUnmasked : gameState.fakemakerUnmasked;
    gameState.playerSteps = data.playerSteps || gameState.playerSteps;
    gameState.questions = data.questions || gameState.questions;
    gameState.gameStarted = data.gameStarted !== undefined ? data.gameStarted : gameState.gameStarted;
    gameState.usedQuestions = data.usedQuestions || gameState.usedQuestions;
    gameState.playerQuestions = data.playerQuestions || gameState.playerQuestions;

    // Update UI based on game state
    if (gameState.gameStarted) {
      // If game has started and we're on role confirmation screen, move to game screen
      if (document.getElementById("roleConfirmationScreen").classList.contains("active")) {
        updateGameDisplay();
        showScreen("gameScreen");
      } else if (document.getElementById("gameScreen").classList.contains("active")) {
        // Update game display if we're already on game screen
        updateGameDisplay();
      }
    } else if (document.getElementById("hostGameScreen").classList.contains("active")) {
      // Update player list if we're on host screen
      updatePlayerList();
    }
  }, (error) => {
    console.error("Firebase real-time listener error:", error);
    updateConnectionStatus("offline");
  });

  // Update connection status
  const connectedRef = database.ref(".info/connected");
  connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
      console.log("Firebase connection status: Connected");
      updateConnectionStatus("connected");
    } else {
      console.log("Firebase connection status: Disconnected/Connecting");
      updateConnectionStatus("connecting");
    }
  }, (error) => {
    console.error("Firebase connection listener error:", error);
    updateConnectionStatus("offline");
  });
}

// Stop listening for updates
function stopListeningForUpdates() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);
  gameRef.off();
  console.log("Stopped listening for Firebase game updates.");

  const connectedRef = database.ref(".info/connected");
  connectedRef.off();
  console.log("Stopped listening for Firebase connection status.");
}

// Check for game code in URL
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameCode = urlParams.get("game");

  if (gameCode) {
    document.getElementById("gameCodeInput").value = gameCode;
    showScreen("joinGameScreen");
  }
}

// Share game link
function shareGame() {
  if (!gameState.gameCode) return;

  const gameUrl = `${window.location.origin}${window.location.pathname}?game=${gameState.gameCode}`;

  if (navigator.share) {
    navigator.share({
      title: "Join my Truth Seekers game!",
      text: `Join my game with code: ${gameState.gameCode}`,
      url: gameUrl,
    })
    .then(() => {
      document.getElementById("shareSuccessMessage").textContent = "Game link shared successfully!";
      document.getElementById("shareSuccessMessage").classList.remove("hidden");

      setTimeout(() => {
        document.getElementById("shareSuccessMessage").classList.add("hidden");
      }, 3000);
    })
    .catch((error) => {
      console.error("Error sharing:", error);
    });
  } else {
    copyToClipboard(gameUrl);
    document.getElementById("shareSuccessMessage").textContent = "Game link copied to clipboard!";
    document.getElementById("shareSuccessMessage").classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("shareSuccessMessage").classList.add("hidden");
    }, 3000);
  }
}

// Copy to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const indicator = document.getElementById("connectionIndicator");
  const statusText = document.getElementById("connectionStatus");

  if (!indicator || !statusText) return;

  indicator.classList.remove("connected", "connecting", "offline");

  switch (status) {
    case "connected":
      indicator.classList.add("connected");
      statusText.textContent = "Verbonden";
      break;
    case "connecting":
      indicator.classList.add("connecting");
      statusText.textContent = "Verbinden...";
      break;
    case "offline":
      indicator.classList.add("offline");
      statusText.textContent = "Offline";
      break;
    default:
      indicator.classList.add("offline");
      statusText.textContent = "Onbekend";
  }
}

