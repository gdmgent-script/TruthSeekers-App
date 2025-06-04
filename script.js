/* Truth Seekers Game - Simplified Script.js */

// Game state
const gameState = {
  gameCode: '',
  players: [],
  currentPlayerIndex: 0,
  questions: [],
  currentQuestionIndex: 0,
  fakemakerName: '',
  fakemakerUnmasked: false,
  playerName: '',
  playerRole: '',
  playerSteps: {},
  gameStarted: false,
  currentQuestionVisible: false,
  playerQuestionSets: {}
};

// Role codes
const roleCodes = [
  { code: "1288", role: "Fakemaker" },
  { code: "7523", role: "Factchecker" },
  { code: "7358", role: "Factchecker" },
  { code: "6411", role: "Factchecker" },
  { code: "9876", role: "Factchecker" },
  { code: "5432", role: "Factchecker" }
];

// DOM Elements
const screens = document.querySelectorAll('.screen');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWuEvMYs1bEZs8OV8TRaILoI_HA2Urx4I",
  authDomain: "truth-seekers-lauren.firebaseapp.com",
  databaseURL: "https://truth-seekers-lauren-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "truth-seekers-lauren",
  storageBucket: "truth-seekers-lauren.appspot.com",
  messagingSenderId: "342706717766",
  appId: "1:342706717766:web:83349268a19770cd35f647",
  measurementId: "G-4Q61SPTCF9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  
  // Load questions (simplified)
  fetch('questions.json')
    .then(response => response.json())
    .then(data => {
      gameState.questions = data;
      console.log('Questions loaded:', gameState.questions.length);
    })
    .catch(error => {
      console.error('Error loading questions:', error);
      gameState.questions = [];
    });

  // Set up event listeners
  document.getElementById('hostGameBtn').addEventListener('click', () => {
    console.log('Host Game button clicked');
    showScreen('hostSetupScreen');
  });
  
  document.getElementById('goToJoinBtn').addEventListener('click', () => {
    console.log('Join Game button clicked');
    showScreen('joinGameScreen');
  });
  
  document.getElementById('createGameBtn').addEventListener('click', createGame);
  document.getElementById('submitJoinBtn').addEventListener('click', joinGame);
  document.getElementById('submitRoleBtn').addEventListener('click', submitRoleCode);
  document.getElementById('continueAfterRoleBtn').addEventListener('click', continueAfterRole);
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  
  // Check for game code in URL
  checkForGameCodeInURL();
});

// Show a specific screen
function showScreen(screenId) {
  console.log('Showing screen:', screenId);
  screens.forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
  
  // Add clear instructions when showing the role code screen
  if (screenId === 'roleCodeScreen') {
    const roleCodeInput = document.getElementById('roleCodeInput');
    if (roleCodeInput) {
      roleCodeInput.style.border = '2px solid #ffcc00';
      roleCodeInput.placeholder = 'Voer rolcode in (bijv. 7523)';
    }
    
    const roleErrorMessage = document.getElementById('roleErrorMessage');
    if (roleErrorMessage) {
      roleErrorMessage.textContent = 'Tip: Gebruik code 7523 voor Factchecker of 1288 voor Fakemaker';
      roleErrorMessage.classList.remove('hidden');
      roleErrorMessage.style.color = '#ffcc00';
    }
  }
}

// Generate a random game code
function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game as host
function createGame() {
  console.log('Create Game function called');
  const hostName = document.getElementById('hostNameInput').value.trim();
  if (!hostName) {
    alert('Voer je naam in');
    return;
  }

  // Show loading indicator
  document.getElementById('createGameBtn').disabled = true;
  document.getElementById('createGameBtn').textContent = 'Spel aanmaken...';
  
  // Update local state
  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  
  // Host needs to enter role code too
  gameState.players = [{
    name: hostName,
    role: '', // Host role is initially empty
    isHost: true,
    steps: 0
  }];
  
  // Initialize player steps
  gameState.playerSteps[hostName] = 0;
  
  // Save game to Firebase
  database.ref(`games/${gameState.gameCode}`).set({
    players: gameState.players,
    currentPlayerIndex: 0,
    currentQuestionIndex: 0,
    fakemakerName: '',
    fakemakerUnmasked: false,
    playerSteps: gameState.playerSteps,
    questions: gameState.questions,
    gameStarted: false,
    currentQuestionVisible: false,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    console.log('Game created successfully with code:', gameState.gameCode);
    
    // Start listening for updates
    startListeningForUpdates();
    
    // Host must now enter role code
    showScreen('roleCodeScreen');
    
  }).catch((error) => {
    console.error('Error creating game:', error);
    alert('Kon geen spel aanmaken. Probeer het opnieuw.');
  }).finally(() => {
    // Reset button
    document.getElementById('createGameBtn').disabled = false;
    document.getElementById('createGameBtn').textContent = 'Maak Spel';
  });
}

// Join an existing game
function joinGame() {
  console.log('Join Game function called');
  const playerName = document.getElementById('playerNameInput').value.trim();
  const gameCode = document.getElementById('gameCodeInput').value.trim().toUpperCase();
  
  if (!playerName || !gameCode) {
    showError('joinErrorMessage', 'Voer je naam en spelcode in');
    return;
  }
  
  // Show loading indicator
  document.getElementById('submitJoinBtn').disabled = true;
  document.getElementById('submitJoinBtn').textContent = 'Deelnemen...';
  
  // Try to load game from Firebase
  database.ref(`games/${gameCode}`).once('value').then((snapshot) => {
    const gameData = snapshot.val();
    
    if (!gameData) {
      showError('joinErrorMessage', 'Spel niet gevonden. Controleer de code en probeer opnieuw.');
      return;
    }
    
    // Check if name is already taken
    if (gameData.players && gameData.players.some(p => p.name === playerName)) {
      showError('joinErrorMessage', 'Naam is al in gebruik. Kies een andere naam.');
      return;
    }
    
    // Load game state
    gameState.gameCode = gameCode;
    gameState.playerName = playerName;
    gameState.players = gameData.players || [];
    gameState.questions = gameData.questions || [];
    
    // Add new player
    const newPlayer = {
      name: playerName,
      role: '',
      isHost: false,
      steps: 0
    };
    
    gameState.players.push(newPlayer);
    
    // Initialize player steps
    gameState.playerSteps[playerName] = 0;
    
    // Save updated game state
    return database.ref(`games/${gameCode}`).update({
      players: gameState.players,
      playerSteps: gameState.playerSteps
    });
  }).then(() => {
    // Start listening for updates
    startListeningForUpdates();
    
    // Show role code screen
    showScreen('roleCodeScreen');
  }).catch((error) => {
    console.error("Error joining game:", error);
    showError('joinErrorMessage', 'Fout bij deelnemen aan spel. Probeer het opnieuw.');
  }).finally(() => {
    // Reset button
    document.getElementById('submitJoinBtn').disabled = false;
    document.getElementById('submitJoinBtn').textContent = 'Deelnemen';
  });
}

// Show error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  
  // Hide after 3 seconds
  setTimeout(() => {
    errorElement.classList.add('hidden');
  }, 3000);
}

// Submit role code
function submitRoleCode() {
  console.log('Submit Role Code function called');
  const roleCode = document.getElementById('roleCodeInput').value.trim();
  
  if (!roleCode) {
    showError('roleErrorMessage', 'Voer een rolcode in');
    return;
  }
  
  // Validate role code
  const roleEntry = roleCodes.find(r => r.code === roleCode);
  if (!roleEntry) {
    showError('roleErrorMessage', 'Ongeldige rolcode');
    return;
  }
  
  // Show loading indicator
  document.getElementById('submitRoleBtn').disabled = true;
  document.getElementById('submitRoleBtn').textContent = 'Bevestigen...';
  
  // Update player role
  gameState.playerRole = roleEntry.role;
  
  // Update player in game state
  const playerIndex = gameState.players.findIndex(p => p.name === gameState.playerName);
  if (playerIndex !== -1) {
    gameState.players[playerIndex].role = roleEntry.role;
    
    // If this is the Fakemaker, record their name
    if (roleEntry.role === 'Fakemaker') {
      gameState.fakemakerName = gameState.playerName;
    }
  }
  
  // Save to Firebase
  database.ref(`games/${gameState.gameCode}`).update({
    players: gameState.players,
    fakemakerName: gameState.fakemakerName
  }).then(() => {
    // Display role
    document.getElementById('playerRoleDisplay').textContent = roleEntry.role;
    
    // Set role instructions
    if (roleEntry.role === 'Fakemaker') {
      document.getElementById('roleInstructions').textContent = 
        'Als Fakemaker zie je de juiste antwoorden. Probeer niet op te vallen tussen de Factcheckers!';
    } else {
      document.getElementById('roleInstructions').textContent = 
        'Als Factchecker probeer je te ontdekken wie de Fakemaker is door hun antwoorden te observeren.';
    }
    
    // Show role confirmation screen
    showScreen('roleConfirmationScreen');
  }).catch((error) => {
    console.error('Error submitting role:', error);
    showError('roleErrorMessage', 'Fout bij bevestigen rol. Probeer het opnieuw.');
  }).finally(() => {
    // Reset button
    document.getElementById('submitRoleBtn').disabled = false;
    document.getElementById('submitRoleBtn').textContent = 'Bevestigen';
  });
}

// Continue after role assignment
function continueAfterRole() {
  console.log('Continue After Role function called');
  // If player is host, go to host screen
  const isHost = gameState.players.find(p => p.name === gameState.playerName)?.isHost;
  
  if (isHost) {
    // Display game code for the host
    document.getElementById('gameCodeDisplay').textContent = gameState.gameCode;
    showScreen('hostGameScreen');
  } else {
    // If game has already started, go to game screen
    if (gameState.gameStarted) {
      showScreen('gameScreen');
    } else {
      // Otherwise, wait for host to start game
      showScreen('hostGameScreen');
    }
  }
}

// Start game (host only)
function startGame() {
  console.log('Start Game function called');
  // Check that there are at least 2 players
  if (gameState.players.length < 2) {
    alert('Er moeten minimaal 2 spelers zijn om het spel te starten.');
    return;
  }
  
  // Check that all players have roles assigned
  const playersWithoutRoles = gameState.players.filter(p => !p.role);
  if (playersWithoutRoles.length > 0) {
    alert('Alle spelers moeten een rol hebben voordat het spel kan beginnen.');
    return;
  }
  
  // Show loading indicator
  document.getElementById('startGameBtn').disabled = true;
  document.getElementById('startGameBtn').textContent = 'Starting...';
  
  // Create unique question sets for each player (simplified)
  gameState.playerQuestionSets = {};
  gameState.players.forEach(player => {
    // Just assign the same questions to each player for now
    gameState.playerQuestionSets[player.name] = [...gameState.questions];
  });
  
  // Update game state
  gameState.gameStarted = true;
  
  // Save to Firebase
  database.ref(`games/${gameState.gameCode}`).update({
    gameStarted: true,
    playerQuestionSets: gameState.playerQuestionSets
  }).then(() => {
    // Show game screen
    showScreen('gameScreen');
  }).catch((error) => {
    console.error('Error starting game:', error);
    alert('Failed to start game. Please try again.');
  }).finally(() => {
    // Reset button
    document.getElementById('startGameBtn').disabled = false;
    document.getElementById('startGameBtn').textContent = 'Start Game';
  });
}

// Start listening for updates
function startListeningForUpdates() {
  database.ref(`games/${gameState.gameCode}`).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;
    
    // Update local game state
    gameState.players = data.players || [];
    gameState.currentPlayerIndex = data.currentPlayerIndex !== undefined ? data.currentPlayerIndex : 0;
    gameState.currentQuestionIndex = data.currentQuestionIndex !== undefined ? data.currentQuestionIndex : 0;
    gameState.fakemakerName = data.fakemakerName || '';
    gameState.fakemakerUnmasked = data.fakemakerUnmasked !== undefined ? data.fakemakerUnmasked : false;
    gameState.playerSteps = data.playerSteps || {};
    gameState.questions = data.questions || [];
    gameState.gameStarted = data.gameStarted !== undefined ? data.gameStarted : false;
    gameState.currentQuestionVisible = data.currentQuestionVisible !== undefined ? data.currentQuestionVisible : false;
    gameState.playerQuestionSets = data.playerQuestionSets || {};
    
    // Update UI based on current screen
    const activeScreen = document.querySelector('.screen.active')?.id;
    
    if (activeScreen === 'hostGameScreen') {
      updatePlayerList();
    } else if (activeScreen === 'roleConfirmationScreen' && gameState.gameStarted) {
      // Game started while player was waiting, join immediately
      showScreen('gameScreen');
    }
  });
  
  // Set up connection status indicator
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', snap => {
    const connected = snap.val();
    const indicator = document.getElementById('connectionIndicator');
    const status = document.getElementById('connectionStatus');
    
    if (connected) {
      indicator.classList.remove('offline', 'connecting');
      status.textContent = 'Verbonden';
    } else {
      indicator.classList.add('offline');
      indicator.classList.remove('connecting');
      status.textContent = 'Niet verbonden';
    }
  });
}

// Update player list in host screen
function updatePlayerList() {
  const playerListElement = document.getElementById('hostPlayerList');
  playerListElement.innerHTML = '';
  
  gameState.players.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = player.name;
    
    // Don't show role information
    const roleSpan = document.createElement('span');
    roleSpan.className = 'player-role';
    roleSpan.textContent = player.role ? 'Role assigned' : 'No role yet';
    
    playerItem.appendChild(nameSpan);
    playerItem.appendChild(roleSpan);
    playerListElement.appendChild(playerItem);
  });
  
  // Enable start button if there are at least 2 players
  document.getElementById('startGameBtn').disabled = gameState.players.length < 2;
  
  // Add a clear message if the start button is disabled
  if (gameState.players.length < 2) {
    const messageElement = document.createElement('p');
    messageElement.textContent = 'Wacht tot er minimaal één andere speler deelneemt om het spel te starten.';
    messageElement.style.color = '#ffcc00';
    playerListElement.appendChild(messageElement);
  }
}

// Check for game code in URL
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    document.getElementById('gameCodeInput').value = code;
    showScreen('joinGameScreen');
  }
}
