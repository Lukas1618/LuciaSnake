const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sprite-Größe und Spielfeldbegrenzung exakt auf das Hintergrundsprite angepasst
const gridSize = 128;
const cols = canvas.width / gridSize; // 8
const rows = canvas.height / gridSize; // 12

// Bilder laden
const headImg = new Image(); headImg.src = '../assets/lucia-snake-head-2.png';
const foodImg = new Image(); foodImg.src = '../assets/music-note-food.png';
const finishImg = new Image(); finishImg.src = '../assets/Spielfeld-finish.png';

// Hintergrundbild laden
const boardImg = new Image();
boardImg.src = 'assets/Spielfeld.png';

// Segment-Sprites für verschiedene Gelbstufen vorbereiten
const segmentSpriteSteps = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
const segmentImgs = segmentSpriteSteps.map(step => {
  const img = new Image();
  img.src = `../assets/flower-segment-${step}.png`;
  return img;
});

let snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
var dir = { x: 0, y: 0 };
let food = randomFoodPosition();
let gameFinished = false;

let lastUpdate = 0;
const moveInterval = 440; // ms (vorher 400, jetzt 10% langsamer)
let moveTimer = 0;
let prevSnake = JSON.parse(JSON.stringify(snake));

// Hintergrundmusik einbinden
const bgMusic = new Audio('../assets/bg-music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5; // Lautstärke anpassen

// Musik erst ab User-Interaktion starten (Browser-Policy)
let musicStarted = false;
function startMusicOnce() {
  if (!musicStarted) {
    bgMusic.play().catch(() => {});
    musicStarted = true;
  }
}
document.addEventListener('keydown', startMusicOnce, { once: true });

// Blur-Overlay-Logik
const blurOverlay = document.getElementById('blur-overlay');
if (blurOverlay) {
  blurOverlay.addEventListener('click', () => {
    blurOverlay.classList.add('hidden');
    startMusicOnce();
  });
}

function gameLoopSmooth(timestamp) {
  if (!lastUpdate) lastUpdate = timestamp;
  const delta = timestamp - lastUpdate;
  lastUpdate = timestamp;
  moveTimer += delta;

  if (!gameFinished && moveTimer >= moveInterval) {
    moveTimer = 0;
    prevSnake = JSON.parse(JSON.stringify(snake));
    update();
  }
  drawSmooth(Math.min(moveTimer / moveInterval, 1));
  requestAnimationFrame(gameLoopSmooth);
}

function update() {
  // Win-Condition: Schlange kann maximal so viele Segmente haben wie es Gelb-Sprites gibt + Kopf
  if (snake.length >= segmentImgs.length + 1) {
    gameFinished = true;
    return;
  }
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  // Kollision mit Wänden
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    resetGame();
    return;
  }
  snake.unshift(head);
  // Essen sammeln
  if (head.x === food.x && head.y === food.y) {
    food = randomFoodPosition(food);
  } else {
    snake.pop();
  }
}

function drawSmooth(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Hintergrund zeichnen
  ctx.drawImage(boardImg, 0, 0, canvas.width, canvas.height);
  if (gameFinished) {
    ctx.drawImage(finishImg, 0, 0, canvas.width, canvas.height);
    // Kopf smooth interpoliert zeichnen
    const head = snake[0];
    const prevHead = prevSnake[0] || head;
    const drawSize = gridSize * 1.5;
    const x = lerp(prevHead.x, head.x, t) * gridSize + (gridSize - drawSize) / 2;
    const y = lerp(prevHead.y, head.y, t) * gridSize + (gridSize - drawSize) / 2;
    ctx.drawImage(headImg, x, y, drawSize, drawSize);
    return;
  }
  // Snake smooth zeichnen
  for (let i = 0; i < snake.length; i++) {
    let img;
    if (i === 0) {
      img = headImg;
    } else {
      // Das neueste Segment (direkt hinter dem Kopf) bekommt das intensivste Sprite
      // Das älteste Segment (am Schwanz) bekommt das blasseste Sprite
      // Mapping: [Kopf, segN, segN-1, ..., seg50]
      const segIdx = Math.max(0, segmentImgs.length - (snake.length - i));
      img = segmentImgs[segIdx];
    }
    const drawSize = gridSize * 1.5;
    const cur = snake[i];
    const prev = prevSnake[i] || cur;
    const x = lerp(prev.x, cur.x, t) * gridSize + (gridSize - drawSize) / 2;
    const y = lerp(prev.y, cur.y, t) * gridSize + (gridSize - drawSize) / 2;
    ctx.drawImage(img, x, y, drawSize, drawSize);
  }
  // Animierte Musik-Note (Food): Pulsieren
  const time = performance.now() / 400;
  const scale = 1 + 0.2 * Math.sin(time);
  const foodDrawSize = gridSize * scale;
  ctx.drawImage(
    foodImg,
    food.x * gridSize + (gridSize - foodDrawSize) / 2,
    food.y * gridSize + (gridSize - foodDrawSize) / 2,
    foodDrawSize,
    foodDrawSize
  );
}

// Hilfsfunktion für lineare Interpolation (smooth movement)
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomFoodPosition(currentFood) {
  let pos;
  let tries = 0;
  if (!currentFood) {
    pos = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
    return pos;
  }
  do {
    pos = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
    tries++;
  } while (
    (Math.abs(pos.x - currentFood.x) < 3 && Math.abs(pos.y - currentFood.y) < 3) && tries < 100
  );
  return pos;
}

function resetGame() {
  snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
  dir = { x: 0, y: 0 };
  food = randomFoodPosition();
  gameFinished = false;
}

// WASD-Steuerung
document.addEventListener('keydown', e => {
  switch (e.key.toLowerCase()) {
    case 'w': if (dir.y === 0) dir = { x: 0, y: -1 }; break;
    case 's': if (dir.y === 0) dir = { x: 0, y: 1 }; break;
    case 'a': if (dir.x === 0) dir = { x: -1, y: 0 }; break;
    case 'd': if (dir.x === 0) dir = { x: 1, y: 0 }; break;
  }
});

// Swipe-Steuerung für Touch-Geräte
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', function(e) {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    startMusicOnce();
  }
});

canvas.addEventListener('touchend', function(e) {
  if (e.changedTouches.length === 1) {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    handleSwipe();
  }
}, { passive: true });

function handleSwipe() {
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontaler Swipe
    if (dx > 30 && dir.x === 0) dir = { x: 1, y: 0 }; // Rechts
    else if (dx < -30 && dir.x === 0) dir = { x: -1, y: 0 }; // Links
  } else {
    // Vertikaler Swipe
    if (dy > 30 && dir.y === 0) dir = { x: 0, y: 1 }; // Runter
    else if (dy < -30 && dir.y === 0) dir = { x: 0, y: -1 }; // Hoch
  }
}

requestAnimationFrame(gameLoopSmooth);