// PaperTouch Wildmill Widget
//
// A three-zone touch page for PaperTouch paper mechanisms:
//   - Middle zone (60% of width): place a blow-driven paper windmill on the
//     marked circle. While the windmill closes the switch, dandelion seeds
//     are emitted from the top of the circle.
//   - Right zone (20%): a rotary knob paper widget. Rotating one way lands
//     touches on the upper pad (+1 level), the other way on the lower pad
//     (-1 level). The level (0-20) controls how big and dense the dandelion
//     effect is.
//   - Left zone (20%): two paper buttons. Upper circle = RESET (level back to
//     10, color back to the default gray-white). Lower circle = RANDOM (pick
//     a new soft, low-saturation particle color).

// ---------------------------------------------------------------------------
// TUNABLE PLACEMENT CONSTANTS
// All positions are fractions of the canvas size so the layout adapts to any
// screen. Radii are fractions of the smaller canvas dimension.
// ---------------------------------------------------------------------------

// Windmill placement circle (middle zone).
// Move it with the *_FRAC values; e.g. WINDMILL_CY_FRAC = 0.5 centers it
// vertically. Change WINDMILL_RADIUS_FRAC to match your paper windmill size.
const WINDMILL_CX_FRAC = 0.5;      // horizontal center, fraction of canvas width
const WINDMILL_CY_FRAC = 0.65;     // vertical center, fraction of canvas height
const WINDMILL_RADIUS_FRAC = 0.14; // radius, fraction of min(width, height)

// Knob pads (right zone). Upper pad increases the level, lower pad decreases.
const KNOB_CX_FRAC = 0.9;          // horizontal center of both pads
const KNOB_UP_CY_FRAC = 0.35;      // vertical center of the +1 pad
const KNOB_DOWN_CY_FRAC = 0.65;    // vertical center of the -1 pad
const KNOB_RADIUS_FRAC = 0.07;

// Buttons (left zone). Upper = reset, lower = random color.
const BUTTON_CX_FRAC = 0.1;
const RESET_CY_FRAC = 0.25;
const RANDOM_CY_FRAC = 0.75;
const BUTTON_RADIUS_FRAC = 0.07;

// ---------------------------------------------------------------------------
// BEHAVIOR CONSTANTS
// ---------------------------------------------------------------------------

const LEVEL_MIN = 0;      // 10 knob clicks down from default
const LEVEL_MAX = 20;     // 10 knob clicks up from default
const LEVEL_DEFAULT = 10;

const ZONE_LEFT_FRAC = 0.2;   // left zone is x in [0, 20%) of width
const ZONE_RIGHT_FRAC = 0.8;  // right zone is x in (80%, 100%]

const FLASH_DURATION = 250;   // ms of highlight after a pad is triggered
const MAX_PARTICLES = 1000;

// Soft but clearly visible particle colors: pastel hues with enough
// saturation and brightness to read on the near-black background.
// Index 0 is the default gray-white used after reset.
const SEED_COLORS = [
  [245, 243, 235], // warm white (default)
  [228, 158, 192], // rose pink
  [150, 214, 172], // soft mint green
  [148, 186, 235], // powder blue
  [238, 198, 130], // warm apricot
  [235, 152, 128], // muted coral
  [198, 212, 126], // pale chartreuse
  [196, 156, 228], // soft lavender
];

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

let level = LEVEL_DEFAULT;
let colorIndex = 0;
const particles = [];
const blowingTouches = new Set(); // touch ids currently held in the middle zone
// Flash timestamps for pad highlight feedback
const flashes = { knobUp: -1e9, knobDown: -1e9, reset: -1e9, random: -1e9 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());

  const canvasEl = document.querySelector('canvas');
  canvasEl.addEventListener('touchstart', onTouchStart, { passive: false });
  canvasEl.addEventListener('touchend', onTouchEnd, { passive: false });
  canvasEl.addEventListener('touchcancel', onTouchEnd, { passive: false });
  canvasEl.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------------------------------------------------------------------
// GEOMETRY HELPERS
// ---------------------------------------------------------------------------

function minDim() {
  return Math.min(width, height);
}

function windmillCircle() {
  return {
    x: width * WINDMILL_CX_FRAC,
    y: height * WINDMILL_CY_FRAC,
    r: minDim() * WINDMILL_RADIUS_FRAC,
  };
}

function pads() {
  const kr = minDim() * KNOB_RADIUS_FRAC;
  const br = minDim() * BUTTON_RADIUS_FRAC;
  return {
    knobUp:   { x: width * KNOB_CX_FRAC, y: height * KNOB_UP_CY_FRAC, r: kr },
    knobDown: { x: width * KNOB_CX_FRAC, y: height * KNOB_DOWN_CY_FRAC, r: kr },
    reset:    { x: width * BUTTON_CX_FRAC, y: height * RESET_CY_FRAC, r: br },
    random:   { x: width * BUTTON_CX_FRAC, y: height * RANDOM_CY_FRAC, r: br },
  };
}

function inCircle(x, y, c) {
  const dx = x - c.x;
  const dy = y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

// ---------------------------------------------------------------------------
// TOUCH HANDLING
// ---------------------------------------------------------------------------

function onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    handlePress(t.clientX, t.clientY, t.identifier);
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    blowingTouches.delete(t.identifier);
  }
}

// Mouse fallback so the page can be tested on a desktop browser.
function mousePressed() {
  handlePress(mouseX, mouseY, 'mouse');
}

function mouseReleased() {
  blowingTouches.delete('mouse');
}

function handlePress(x, y, id) {
  const p = pads();
  if (x >= width * ZONE_RIGHT_FRAC) {
    if (inCircle(x, y, p.knobUp)) {
      level = Math.min(LEVEL_MAX, level + 1);
      flashes.knobUp = millis();
    } else if (inCircle(x, y, p.knobDown)) {
      level = Math.max(LEVEL_MIN, level - 1);
      flashes.knobDown = millis();
    }
  } else if (x < width * ZONE_LEFT_FRAC) {
    if (inCircle(x, y, p.reset)) {
      level = LEVEL_DEFAULT;
      colorIndex = 0;
      flashes.reset = millis();
    } else if (inCircle(x, y, p.random)) {
      let next = colorIndex;
      while (next === colorIndex) {
        next = Math.floor(Math.random() * SEED_COLORS.length);
      }
      colorIndex = next;
      flashes.random = millis();
    }
  } else {
    // Middle zone: any held touch keeps the dandelion emitting.
    blowingTouches.add(id);
  }
}

// ---------------------------------------------------------------------------
// DANDELION PARTICLES
// ---------------------------------------------------------------------------

// Map the current level (0-20) to emission parameters. At LEVEL_MIN the
// seeds barely leave the windmill circle; at LEVEL_MAX they fill the screen.
function intensity() {
  return level / LEVEL_MAX;
}

function emitParticles() {
  const t = intensity();
  const wc = windmillCircle();
  // Emission origin: top point of the windmill circle.
  const ox = wc.x;
  const oy = wc.y - wc.r;

  // Particles per frame: fractional rates emit probabilistically.
  const rate = 0.3 + t * t * 7;
  let count = Math.floor(rate);
  if (Math.random() < rate - count) count++;

  const speedMax = (0.8 + t * 9) * (minDim() / 700);
  const life = 700 + t * 2300;

  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    // Mostly upward with sideways spread that widens with intensity.
    const angle = -HALF_PI + (Math.random() - 0.5) * (0.7 + t * 1.8);
    const speed = speedMax * (0.35 + Math.random() * 0.65);
    particles.push({
      x: ox + (Math.random() - 0.5) * wc.r * 0.6,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + t * 2.5 * Math.random() + 1,
      rot: Math.random() * TWO_PI,
      spin: (Math.random() - 0.5) * 0.06,
      born: millis(),
      life: life * (0.6 + Math.random() * 0.4),
    });
  }
}

function updateAndDrawParticles() {
  const now = millis();
  const [cr, cg, cb] = SEED_COLORS[colorIndex];

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    const age = (now - pt.born) / pt.life;
    if (age >= 1) {
      particles.splice(i, 1);
      continue;
    }

    // Drift like a floating seed: slight horizontal wander, gentle slowdown.
    pt.vx += (Math.random() - 0.5) * 0.06;
    pt.vy += -0.002 + (Math.random() - 0.5) * 0.04;
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.rot += pt.spin;

    const alpha = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
    const grow = 1 + age * 1.6; // seeds grow slightly as they float away

    drawSeed(pt.x, pt.y, pt.size * grow, pt.rot, cr, cg, cb, alpha * 250);
  }
}

// A dandelion seed: a small dot with short filaments fanning out above it.
function drawSeed(x, y, s, rot, r, g, b, alpha) {
  push();
  translate(x, y);
  rotate(rot);

  stroke(r, g, b, alpha * 0.9);
  strokeWeight(1);
  const filaments = 5;
  for (let i = 0; i < filaments; i++) {
    const a = -HALF_PI + ((i - (filaments - 1) / 2) * 0.5);
    line(0, 0, Math.cos(a) * s * 3, Math.sin(a) * s * 3);
  }

  noStroke();
  fill(r, g, b, alpha);
  circle(0, 0, s);
  pop();
}

// ---------------------------------------------------------------------------
// DRAWING
// ---------------------------------------------------------------------------

function draw() {
  background(17);

  if (blowingTouches.size > 0) emitParticles();
  updateAndDrawParticles();

  drawPlacementCircles();
  drawStatusBar();
}

function drawPlacementCircles() {
  const wc = windmillCircle();
  const p = pads();
  const now = millis();

  // Windmill placement circle: brighter while a touch is held in the zone.
  noFill();
  stroke(255, blowingTouches.size > 0 ? 220 : 110);
  strokeWeight(1.2);
  circle(wc.x, wc.y, wc.r * 2);

  for (const [name, pad] of Object.entries(p)) {
    const flash = Math.max(0, 1 - (now - flashes[name]) / FLASH_DURATION);
    if (flash > 0) {
      noStroke();
      fill(255, 70 * flash);
      circle(pad.x, pad.y, pad.r * 2);
    }
    noFill();
    stroke(255, 110 + 145 * flash);
    strokeWeight(1.2);
    circle(pad.x, pad.y, pad.r * 2);
  }
}

function drawStatusBar() {
  noStroke();
  fill(255, 130);
  textSize(13);
  textAlign(LEFT, BOTTOM);
  text(
    `level: ${level} / ${LEVEL_MAX}    color: ${colorIndex}    particles: ${particles.length}`,
    10,
    height - 10
  );
}
