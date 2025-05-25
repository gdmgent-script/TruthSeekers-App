/* Truth Seekers Game - Script.js */

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
  gameStarted: false,  // Initialize gameStarted to false explicitly
  currentQuestionVisible: false  // Track if question is visible to all players
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

// Shuffle questions
function shuffleQuestions() {
  // Simple Fisher-Yates shuffle
  for (let i = gameState.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.questions[i], gameState.questions[j]] = [gameState.questions[j], gameState.questions[i]];
  }
  console.log('Questions shuffled');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load questions
  try {
    const response = await fetch('./questions.json');
    if (!response.ok) {
      console.error('Questions file not found, creating default questions');
      gameState.questions = [];
    } else {
      gameState.questions = await response.json();
      console.log('Questions loaded successfully:', gameState.questions.length);
      shuffleQuestions();
    }
  } catch (error) {
    console.error('Error loading questions:', error);
    gameState.questions = [];
  }

  // Set up event listeners
  document.getElementById('hostGameBtn').addEventListener('click', () => showScreen('hostSetupScreen'));
  document.getElementById('goToJoinBtn').addEventListener('click', () => showScreen('joinGameScreen'));
  document.getElementById('createGameBtn').addEventListener('click', createGame);
  document.getElementById('submitJoinBtn').addEventListener('click', joinGame);
  document.getElementById('submitRoleBtn').addEventListener('click', submitRoleCode);
  document.getElementById('continueAfterRoleBtn').addEventListener('click', continueAfterRole);
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('showQuestionBtn').addEventListener('click', showQuestion);
  document.getElementById('trueBtn').addEventListener('click', () => submitAnswer(true));
  document.getElementById('falseBtn').addEventListener('click', () => submitAnswer(false));
  document.getElementById('nextTurnBtn').addEventListener('click', nextTurn);
  
  // Remove the New Game button event listener as it's being hidden
  // document.getElementById('newGameBtn').addEventListener('click', resetGame);
  
  document.getElementById('shareGameBtn').addEventListener('click', shareGame);
  
  // Add event listeners for multiple choice options
  document.getElementById('option0').addEventListener('click', () => submitMultipleChoiceAnswer(0));
  document.getElementById('option1').addEventListener('click', () => submitMultipleChoiceAnswer(1));
  document.getElementById('option2').addEventListener('click', () => submitMultipleChoiceAnswer(2));
  document.getElementById('option3').addEventListener('click', () => submitMultipleChoiceAnswer(3));

  // Check for game code in URL
  checkForGameCodeInURL();
  
  // Fix for mobile input fields
  const inputFields = document.querySelectorAll('input[type="text"]');
  inputFields.forEach(input => {
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('autocomplete', 'off');
  });
  
  // Hide step count displays
  hideStepCountDisplays();
  
  // Setup PDF display for image questions
  setupPdfDisplay();
});

// Setup PDF display for image questions
function setupPdfDisplay() {
  // Add PDF.js library if not already included
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js';
    document.head.appendChild(script);
  }
}

// Display PDF in image container
function displayPdf(url, container) {
  // If it's a PDF, use an iframe instead of img
  if (url.toLowerCase().endsWith('.pdf')) {
    // Clear container
    container.innerHTML = '';
    
    // Create iframe for PDF
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    
    container.appendChild(iframe);
    return true;
  }
  return false;
}

// Hide step count displays
function hideStepCountDisplays() {
  // Hide step count in game header
  const stepsDisplayContainer = document.querySelector('.player-info p:nth-child(3)');
  if (stepsDisplayContainer) {
    stepsDisplayContainer.style.display = 'none';
  }
  
  // Hide step count in result screen
  const stepsDisplayResultContainer = document.querySelector('#resultScreen p:nth-child(3)');
  if (stepsDisplayResultContainer) {
    stepsDisplayResultContainer.style.display = 'none';
  }
}

// Show a specific screen
function showScreen(screenId) {
  screens.forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
  
  // Hide New Game button on result screen
  if (screenId === 'resultScreen') {
    document.getElementById('newGameBtn').style.display = 'none';
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
async function createGame() {
  const hostName = document.getElementById('hostNameInput').value.trim();
  if (!hostName) {
    alert('Voer je naam in');
    return;
  }

  // Show loading indicator
  document.getElementById('createGameBtn').disabled = true;
  document.getElementById('createGameBtn').textContent = 'Spel aanmaken...';

  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  gameState.players = [{
    name: hostName,
    role: '',
    isHost: true,
    steps: 0
  }];
  
  // Initialize player steps
  gameState.playerSteps[hostName] = 0;
  
  // Ensure gameStarted is explicitly set to false
  gameState.gameStarted = false;
  gameState.currentQuestionVisible = false;

  try {
    // Save game to Firebase
    await saveGameToFirebase();
    console.log('Game created successfully with code:', gameState.gameCode);
    
    // Start listening for updates
    startListeningForUpdates();
    
    // Display game code
    document.getElementById('gameCodeDisplay').textContent = gameState.gameCode;
    
    // Modified: Direct host to role code screen instead of host game screen
    showScreen('roleCodeScreen');
  } catch (error) {
    console.error('Error creating game:', error);
    alert('Kon geen spel aanmaken. Probeer het opnieuw.');
  } finally {
    // Reset button
    document.getElementById('createGameBtn').disabled = false;
    document.getElementById('createGameBtn').textContent = 'Maak Spel';
  }
}

// Join an existing game
async function joinGame() {
  const playerName = document.getElementById('playerNameInput').value.trim();
  const gameCode = document.getElementById('gameCodeInput').value.trim().toUpperCase();
  
  if (!playerName || !gameCode) {
    showError('joinErrorMessage', 'Voer je naam en spelcode in');
    return;
  }
  
  // Show loading indicator
  document.getElementById('submitJoinBtn').disabled = true;
  document.getElementById('submitJoinBtn').textContent = 'Deelnemen...';
  
  try {
    console.log('Attempting to join game with code:', gameCode);
    
    // Try to load game from Firebase
    const gameData = await loadGameFromFirebase(gameCode);
    
    if (!gameData) {
      console.error('Game not found with code:', gameCode);
      showError('joinErrorMessage', 'Spel niet gevonden. Controleer de code en probeer opnieuw.');
      document.getElementById('submitJoinBtn').disabled = false;
      document.getElementById('submitJoinBtn').textContent = 'Deelnemen';
      return;
    }
    
    console.log('Game data loaded:', gameData);
    
    // Check if name is already taken
    if (gameData.players && gameData.players.some(p => p.name === playerName)) {
      showError('joinErrorMessage', 'Naam is al in gebruik. Kies een andere naam.');
      document.getElementById('submitJoinBtn').disabled = false;
      document.getElementById('submitJoinBtn').textContent = 'Deelnemen';
      return;
    }
    
    // Load game state
    gameState.gameCode = gameCode;
    gameState.playerName = playerName;
    gameState.players = gameData.players || [];
    gameState.currentPlayerIndex = typeof gameData.currentPlayerIndex === 'number' ? gameData.currentPlayerIndex : 0;
    gameState.currentQuestionIndex = typeof gameData.currentQuestionIndex === 'number' ? gameData.currentQuestionIndex : 0;
    gameState.fakemakerName = gameData.fakemakerName || '';
    gameState.fakemakerUnmasked = gameData.fakemakerUnmasked === true;
    gameState.playerSteps = gameData.playerSteps || {};
    gameState.questions = gameData.questions || [];
    gameState.gameStarted = gameData.gameStarted === true; // Ensure boolean value
    gameState.currentQuestionVisible = gameData.currentQuestionVisible === true;
    
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
    
    console.log('Saving updated game state after joining');
    
    // Save updated game state
    await saveGameToFirebase();
    
    // Start listening for updates
    startListeningForUpdates();
    
    // Show role code screen
    showScreen('roleCodeScreen');
  } catch (error) {
    console.error("Error joining game:", error);
    showError('joinErrorMessage', 'Fout bij deelnemen aan spel. Probeer het opnieuw.');
  } finally {
    // Reset button
    document.getElementById('submitJoinBtn').disabled = false;
    document.getElementById('submitJoinBtn').textContent = 'Deelnemen';
  }
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
  
  // Enable start button if there are at least 2 players and at least one has a role
  document.getElementById('startGameBtn').disabled = gameState.players.length < 2 || !gameState.players.some(p => p.role);
}

// Start game (host only)
async function startGame() {
  // No longer require a Fakemaker to be in the game
  // Just check that players have roles assigned
  if (!gameState.players.some(player => player.role)) {
    alert('Spelers moeten eerst rollen toegewezen krijgen.');
    showScreen('roleCodeScreen');
    return;
  }
  
  // Show loading indicator
  document.getElementById('startGameBtn').disabled = true;
  document.getElementById('startGameBtn').textContent = 'Starting...';
  
  try {
    // Update game state
    gameState.gameStarted = true;
    
    // Save to Firebase
    await saveGameToFirebase();
    
    // Update display
    updateGameDisplay();
    
    // Show game screen
    showScreen('gameScreen');
  } catch (error) {
    console.error('Error starting game:', error);
    alert('Failed to start game. Please try again.');
  } finally {
    // Reset button
    document.getElementById('startGameBtn').disabled = false;
    document.getElementById('startGameBtn').textContent = 'Start Game';
  }
}

// Submit role code
async function submitRoleCode() {
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
  
  try {
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
    await saveGameToFirebase();
    
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
  } catch (error) {
    console.error('Error submitting role:', error);
    showError('roleErrorMessage', 'Fout bij bevestigen rol. Probeer het opnieuw.');
  } finally {
    // Reset button
    document.getElementById('submitRoleBtn').disabled = false;
    document.getElementById('submitRoleBtn').textContent = 'Bevestigen';
  }
}

// Continue after role assignment
function continueAfterRole() {
  // If player is host, go to host screen
  const isHost = gameState.players.find(p => p.name === gameState.playerName)?.isHost;
  
  if (isHost) {
    updatePlayerList();
    showScreen('hostGameScreen');
  } else {
    // Check if game has already started
    if (gameState.gameStarted) {
      // Game already started, join immediately
      updateGameDisplay();
      showScreen('gameScreen');
    } else {
      // Show waiting screen with clear message
      document.getElementById('roleInstructions').textContent = 
        'Waiting for the host to start the game. You will automatically join when the game begins.';
      // Keep on role confirmation screen but update the UI to show waiting status
      document.getElementById('continueAfterRoleBtn').style.display = 'none';
    }
  }
}

// Update game display
function updateGameDisplay() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Update current player display
  document.getElementById('currentPlayerDisplay').textContent = currentPlayer.name;
  
  // Show role name
  document.getElementById('roleName').textContent = gameState.playerRole;
  
  // Show answer if player is Fakemaker and not unmasked
  if (gameState.playerRole === 'Fakemaker' && !gameState.fakemakerUnmasked) {
    document.getElementById('answerInfo').classList.remove('hidden');
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    
    if (currentQuestion.type === 'multiple_choice') {
      const correctOptionIndex = currentQuestion.correctOption;
      document.getElementById('correctAnswer').textContent = `Optie ${correctOptionIndex + 1}`;
    } else {
      document.getElementById('correctAnswer').textContent = currentQuestion.answer ? 'Echt' : 'Fake';
    }
  } else {
    document.getElementById('answerInfo').classList.add('hidden');
  }
  
  // If question is visible to all players, show it
  if (gameState.currentQuestionVisible) {
    displayCurrentQuestion();
  }
  
  // Show/hide turn info based on whether it's the player's turn
  const yourTurnInfo = document.getElementById('yourTurnInfo');
  if (currentPlayer.name === gameState.playerName) {
    yourTurnInfo.style.display = 'block';
  } else {
    yourTurnInfo.style.display = 'none';
  }
}

// Display current question to all players
function displayCurrentQuestion() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  
  document.getElementById('questionNumber').textContent = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById('questionContent').textContent = currentQuestion.content;
  
  // Hide all media containers first
  document.getElementById('imageContainer').classList.add('hidden');
  document.getElementById('videoContainer').classList.add('hidden');
  document.getElementById('externalActionContainer').classList.add('hidden');
  
  // Hide all answer button containers
  document.getElementById('trueFalseButtons').classList.add('hidden');
  document.getElementById('multipleChoiceButtons').classList.add('hidden');
  
  // Show appropriate media based on question type
  if (currentQuestion.type === 'image' && currentQuestion.imagePath) {
    const imageContainer = document.getElementById('imageContainer');
    
    // Check if it's a PDF and display accordingly
    if (currentQuestion.imagePath.toLowerCase().endsWith('.pdf')) {
      displayPdf(currentQuestion.imagePath, imageContainer);
    } else {
      // Regular image
      document.getElementById('questionImage').src = currentQuestion.imagePath;
    }
    
    imageContainer.classList.remove('hidden');
  } else if (currentQuestion.type === 'video' && currentQuestion.videoUrl) {
    const videoContainer = document.getElementById('videoContainer');
    
    if (currentQuestion.videoUrl.includes('youtube.com') || currentQuestion.videoUrl.includes('youtu.be')) {
      // YouTube video - create iframe
      videoContainer.innerHTML = '';
      const videoId = extractYouTubeId(currentQuestion.videoUrl);
      
      if (videoId) {
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '315';
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        
        videoContainer.appendChild(iframe);
      } else {
        // Fallback to regular video player if YouTube ID extraction fails
        const videoSource = document.getElementById('videoSource');
        videoSource.src = currentQuestion.videoUrl;
        document.getElementById('questionVideo').load();
      }
    } else {
      // Regular video
      const videoSource = document.getElementById('videoSource');
      videoSource.src = currentQuestion.videoUrl;
      document.getElementById('questionVideo').load();
    }
    
    videoContainer.classList.remove('hidden');
  } else if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
    // Set up multiple choice options
    for (let i = 0; i < currentQuestion.options.length; i++) {
      document.getElementById(`option${i}`).textContent = `${i + 1}. ${currentQuestion.options[i]}`;
    }
  } else if (currentQuestion.type === 'external_action' && currentQuestion.externalActionPrompt) {
    document.getElementById('externalActionPrompt').textContent = currentQuestion.externalActionPrompt;
    document.getElementById('externalActionContainer').classList.remove('hidden');
  }
  
  // Only show answer buttons if it's the current player's turn
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer.name === gameState.playerName) {
    if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      document.getElementById('multipleChoiceButtons').classList.remove('hidden');
    } else {
      document.getElementById('trueFalseButtons').classList.remove('hidden');
    }
  }
  
  showScreen('questionScreen');
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Show question
async function showQuestion() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  
  // Set question as visible to all players
  gameState.currentQuestionVisible = true;
  
  // Save to Firebase so all players can see the question
  await saveGameToFirebase();
  
  // Display the question
  displayCurrentQuestion();
}

// Submit true/false answer
async function submitAnswer(answer) {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === currentQuestion.answer;
  
  // Calculate steps change based on correctness
  let stepsChange = 0;
  if (isCorrect) {
    // Correct answer: move 1-2 steps forward
    stepsChange = Math.floor(Math.random() * 2) + 1; // Random number between 1 and 2
  } else {
    // Incorrect answer: move 2-3 steps back
    stepsChange = -1 * (Math.floor(Math.random() * 2) + 2); // Random number between -2 and -3
  }
  
  // Update player steps
  gameState.playerSteps[gameState.playerName] = (gameState.playerSteps[gameState.playerName] || 0) + stepsChange;
  if (gameState.playerSteps[gameState.playerName] < 0) {
    gameState.playerSteps[gameState.playerName] = 0; // Ensure steps don't go below 0
  }
  
  // Update player in game state
  const playerIndex = gameState.players.findIndex(p => p.name === gameState.playerName);
  if (playerIndex !== -1) {
    gameState.players[playerIndex].steps = gameState.playerSteps[gameState.playerName];
  }
  
  try {
    // Save to Firebase
    await saveGameToFirebase();
    
    // Show result
    showResult(isCorrect, stepsChange);
  } catch (error) {
    console.error('Error submitting answer:', error);
    alert('Fout bij het indienen van antwoord. Probeer het opnieuw.');
  }
}

// Submit multiple choice answer
async function submitMultipleChoiceAnswer(optionIndex) {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = optionIndex === currentQuestion.correctOption;
  
  // Calculate steps change based on correctness
  let stepsChange = 0;
  if (isCorrect) {
    // Correct answer: move 1-2 steps forward
    stepsChange = Math.floor(Math.random() * 2) + 1; // Random number between 1 and 2
  } else {
    // Incorrect answer: move 2-3 steps back
    stepsChange = -1 * (Math.floor(Math.random() * 2) + 2); // Random number between -2 and -3
  }
  
  // Update player steps
  gameState.playerSteps[gameState.playerName] = (gameState.playerSteps[gameState.playerName] || 0) + stepsChange;
  if (gameState.playerSteps[gameState.playerName] < 0) {
    gameState.playerSteps[gameState.playerName] = 0; // Ensure steps don't go below 0
  }
  
  // Update player in game state
  const playerIndex = gameState.players.findIndex(p => p.name === gameState.playerName);
  if (playerIndex !== -1) {
    gameState.players[playerIndex].steps = gameState.playerSteps[gameState.playerName];
  }
  
  try {
    // Save to Firebase
    await saveGameToFirebase();
    
    // Show result
    showResult(isCorrect, stepsChange);
  } catch (error) {
    console.error('Error submitting answer:', error);
    alert('Fout bij het indienen van antwoord. Probeer het opnieuw.');
  }
}

// Show result
function showResult(isCorrect, stepsChange) {
  document.getElementById('resultTitle').textContent = isCorrect ? 'Correct!' : 'Incorrect!';
  
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  let correctAnswerText = '';
  
  if (currentQuestion.type === 'multiple_choice') {
    const correctOptionIndex = currentQuestion.correctOption;
    correctAnswerText = `Het juiste antwoord is: ${currentQuestion.options[correctOptionIndex]}`;
  } else {
    correctAnswerText = `Het juiste antwoord is: ${currentQuestion.answer ? 'Echt' : 'Fake'}`;
  }
  
  document.getElementById('resultMessage').textContent = correctAnswerText;
  
  // Show step change
  const stepChangeElement = document.getElementById('stepChange');
  if (stepsChange > 0) {
    stepChangeElement.textContent = `+${stepsChange} stappen vooruit!`;
    stepChangeElement.style.color = '#4CAF50'; // Green
  } else if (stepsChange < 0) {
    stepChangeElement.textContent = `${stepsChange} stappen achteruit!`;
    stepChangeElement.style.color = '#f44336'; // Red
  } else {
    stepChangeElement.textContent = 'Geen verandering in stappen.';
    stepChangeElement.style.color = '#ffcc00'; // Yellow
  }
  
  // Hide the New Game button
  document.getElementById('newGameBtn').style.display = 'none';
  
  showScreen('resultScreen');
}

// Next turn
async function nextTurn() {
  // Reset question visibility for next turn
  gameState.currentQuestionVisible = false;
  
  // Move to next player
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  
  // Move to next question if we've gone through all players
  if (gameState.currentPlayerIndex === 0) {
    gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % gameState.questions.length;
  }
  
  try {
    // Save to Firebase
    await saveGameToFirebase();
    
    // Update display
    updateGameDisplay();
    
    // Show game screen
    showScreen('gameScreen');
  } catch (error) {
    console.error('Error advancing turn:', error);
    alert('Fout bij het doorgaan naar de volgende beurt. Probeer het opnieuw.');
  }
}

// Reset game
function resetGame() {
  // Reload the page to start fresh
  window.location.reload();
}

// Share game
function shareGame() {
  const gameUrl = `${window.location.origin}${window.location.pathname}?code=${gameState.gameCode}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Join my Truth Seekers game!',
      text: `Join my Truth Seekers game with code: ${gameState.gameCode}`,
      url: gameUrl
    })
    .then(() => {
      document.getElementById('shareSuccessMessage').textContent = 'Link gedeeld!';
      document.getElementById('shareSuccessMessage').classList.remove('hidden');
      setTimeout(() => {
        document.getElementById('shareSuccessMessage').classList.add('hidden');
      }, 3000);
    })
    .catch(error => {
      console.error('Error sharing:', error);
      copyToClipboard(gameUrl);
    });
  } else {
    copyToClipboard(gameUrl);
  }
}

// Copy to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  document.getElementById('shareSuccessMessage').textContent = 'Link gekopieerd naar klembord!';
  document.getElementById('shareSuccessMessage').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('shareSuccessMessage').classList.add('hidden');
  }, 3000);
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

// Save game state to Firebase
async function saveGameToFirebase() {
  try {
    // Ensure all properties are defined and not undefined
    const gameData = {
      players: gameState.players || [],
      currentPlayerIndex: typeof gameState.currentPlayerIndex === 'number' ? gameState.currentPlayerIndex : 0,
      currentQuestionIndex: typeof gameState.currentQuestionIndex === 'number' ? gameState.currentQuestionIndex : 0,
      fakemakerName: gameState.fakemakerName || '',
      fakemakerUnmasked: gameState.fakemakerUnmasked === true,
      playerSteps: gameState.playerSteps || {},
      questions: gameState.questions || [],
      gameStarted: gameState.gameStarted === true,
      currentQuestionVisible: gameState.currentQuestionVisible === true,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Log the data being saved for debugging
    console.log('Saving game data to Firebase, code:', gameState.gameCode);
    
    // Use update instead of set to be more robust
    await database.ref(`games/${gameState.gameCode}`).update(gameData);
    console.log('Game data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving game to Firebase:', error);
    throw error;
  }
}

// Load game state from Firebase
async function loadGameFromFirebase(gameCode) {
  try {
    console.log('Loading game data from Firebase, code:', gameCode);
    
    // Add timeout to prevent indefinite waiting
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firebase request timed out')), 10000)
    );
    
    const dataPromise = database.ref(`games/${gameCode}`).once('value');
    
    // Race between timeout and actual data fetch
    const snapshot = await Promise.race([dataPromise, timeoutPromise]);
    
    const data = snapshot.val();
    console.log('Game data loaded:', data ? 'success' : 'not found');
    return data;
  } catch (error) {
    console.error('Error loading game from Firebase:', error);
    throw error;
  }
}

// Start listening for updates
function startListeningForUpdates() {
  console.log('Starting to listen for updates, game code:', gameState.gameCode);
  
  // Remove any existing listeners first to prevent duplicates
  database.ref(`games/${gameState.gameCode}`).off();
  
  database.ref(`games/${gameState.gameCode}`).on('value', snapshot => {
    const data = snapshot.val();
    if (!data) {
      console.log('No data received in update');
      return;
    }
    
    console.log('Received update from Firebase');
    
    // Update local game state
    gameState.players = data.players || [];
    gameState.currentPlayerIndex = typeof data.currentPlayerIndex === 'number' ? data.currentPlayerIndex : 0;
    gameState.currentQuestionIndex = typeof data.currentQuestionIndex === 'number' ? data.currentQuestionIndex : 0;
    gameState.fakemakerName = data.fakemakerName || '';
    gameState.fakemakerUnmasked = data.fakemakerUnmasked === true;
    gameState.playerSteps = data.playerSteps || {};
    gameState.questions = data.questions || [];
    gameState.gameStarted = data.gameStarted === true;
    gameState.currentQuestionVisible = data.currentQuestionVisible === true;
    
    // Update UI based on current screen
    const activeScreen = document.querySelector('.screen.active')?.id;
    console.log('Active screen:', activeScreen);
    
    if (activeScreen === 'hostGameScreen') {
      updatePlayerList();
    } else if (activeScreen === 'roleConfirmationScreen' && gameState.gameStarted) {
      // Game started while player was waiting, join immediately
      console.log('Game started while waiting, joining game');
      updateGameDisplay();
      showScreen('gameScreen');
    } else if (activeScreen === 'gameScreen') {
      updateGameDisplay();
    } else if (activeScreen === 'questionScreen' && gameState.currentQuestionVisible) {
      // If question is visible and we're not already on question screen, show it
      displayCurrentQuestion();
    }
  }, (error) => {
    console.error('Error in Firebase listener:', error);
  });
  
  // Set up connection status indicator
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', snap => {
    const connected = snap.val();
    const indicator = document.getElementById('connectionIndicator');
    const status = document.getElementById('connectionStatus');
    
    console.log('Connection status:', connected ? 'connected' : 'disconnected');
    
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
