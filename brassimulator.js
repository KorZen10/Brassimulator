import * as Tone from "https://cdn.skypack.dev/tone";
let osc;
let oscRoot = 86;
let mouseX;
let mouseY;
let keys = ['j', 'k', 'l'];
let keysPressed = [false, false, false];
let valvePitchDown = [1.12246, 1.05946, 1.18921]; // major second, minor second, minor third
let numPartials = 8;
let notes = ['Gb1', 'G2', 'Ab2', 'A2', 'Bb2', 'B2', 'C2', 'Gb2', 'G3', 'Ab3', 'A3', 'Bb3', 'B3', 'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G4', 'Ab4', 'A4', 'Bb4', 'B4', 'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C5'];
let heightPartials = [];
let basePartials = [];
let heightPartialNoteIdxs = [6, 13, 20, 25, 29, 32, 35, 37];
let currPartial = 0;

window.addEventListener('keydown', keydown);
window.addEventListener('keyup', keyup);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mouseup', mouseup);

document.addEventListener('mousemove', function(event) {
    mouseX = event.clientX; // X-coordinate relative to the viewport
    mouseY = event.clientY; // Y-coordinate relative to the viewport

    // console.log(`Mouse position: X = ${mouseX}, Y = ${mouseY}`);
});


window.onload = function() {
    for (let key of keys) {
        let div = document.createElement('div');
        div.className = 'valve';
        div.id = 'valve-' + key;
        div.textContent = key;
        div.setAttribute("onfocus", "this.blur()");
        div.setAttribute("tabindex", "-1");
        document.getElementById('valves').appendChild(div);
    }

    osc = new Tone.Oscillator().toDestination();
    osc.frequency.value = oscRoot;

    // partialInterval = window.innerHeight / numPartials;
    // for (let i = numPartials; i > 0; i--) {
    //     heightPartials.push(i * partialInterval);
    // }

    let ratio = 1.3;

    const firstInterval = window.innerHeight * (1 - ratio) / (1 - Math.pow(ratio, numPartials));

    for (let i = 0; i < numPartials; i++) {
        heightPartials.push(firstInterval * Math.pow(ratio, i) + (heightPartials[i - 1] || 0));
    }
    heightPartials.reverse();

    heightPartials.push(0);
    heightPartials.push(-100);

    basePartials = [...heightPartials];

    console.log('heightPartials:', heightPartials);
    console.log('heightPartials[currPartial]:', heightPartials[currPartial]);
    console.log('heightPartials[currPartial + 1]:', heightPartials[currPartial + 1]);

    createIntervalDivs();
    
    rAF60fps();
}

function createIntervalDivs() {
    const container = document.body;

    // Clear old intervals if window resizes or reloads
    document.querySelectorAll('.interval').forEach(x => x.remove());

    // Rainbow colors from bottom to top
    const rainbowColors = [
        "rgba(148, 0, 211, 0.3)",   // Violet (top)
        "rgba(75, 0, 130, 0.3)",    // Indigo
        "rgba(0, 0, 255, 0.3)",     // Blue
        "rgba(0, 255, 0, 0.3)",     // Green
        "rgba(255, 255, 0, 0.3)",   // Yellow
        "rgba(255, 127, 0, 0.3)",   // Orange
        "rgba(255, 0, 0, 0.3)",     // Red (bottom)
        "rgba(139, 0, 0, 0.3)"      // Dark Red (if more partials)
    ];

    for (let i = 0; i < numPartials; i++) {
        const div = document.createElement('div');
        div.className = 'interval';
        div.style.position = "fixed";
        div.style.left = "0px";
        div.style.width = "100%";
        div.style.zIndex = "-1";
        div.style.pointerEvents = "none";

        let top = heightPartials[i + 1];  // Swap since array is reversed
        let bottom = heightPartials[i];
        let height = bottom - top;

        div.style.top = top + "px";
        div.style.height = height + "px";

        // Rainbow color based on partial index
        div.style.backgroundColor = rainbowColors[i] || "rgba(200,200,200,0.3)";

        container.appendChild(div);
    }
}

let fps = 60;
let now;
let then = window.performance.now();
let lastFrameReq = then;
let interval = 1000 / fps;

function rAF60fps() {
	requestAnimationFrame(rAF60fps);
    now = window.performance.now();
    let delta = now - then;
    if (delta > interval) {
        then = now - (delta % interval);
        for (let i = 0; i < fps/60; i++) draw();
    }

    if (lastFrameReq - then > interval) then = now;
    lastFrameReq = now;
}

function draw() {
    document.getElementById('pitch-line').style.setProperty('top', mouseY + 'px');
    
    // Find which partial the mouse is in by checking heightPartials boundaries
    // console.log('heightPartials[currPartial]', heightPartials[currPartial]);
    // console.log('heightPartials[currPartial + 1]', heightPartials[currPartial + 1]);
    // console.log('mouseY', mouseY);
    
    if (mouseY > heightPartials[currPartial] || mouseY < heightPartials[currPartial + 1]) {
        let newPartial = -1;
        for (let i = 0; i < numPartials; i++) {
            if (mouseY <= heightPartials[i] && mouseY >= heightPartials[i + 1]) {
                newPartial = i;
                break;
            }
        }
        currPartial = newPartial;
        if (mouseHeld == true)
        console.log('currPartial:', currPartial);
        console.log('mouseY:', mouseY);
    }
    if (mouseHeld == true) loadNoteImg();
    osc.frequency.value = getPitch();
}

function getPitch() {
    let harmonic = currPartial + 1;
    let valveMult = getValveMultiplier();

    let effectiveHarmonic = harmonic / valveMult;
    return oscRoot * effectiveHarmonic;
}

// used for the fingering images
function getValveId() {
    if (!keysPressed[0] && !keysPressed[1] && !keysPressed[2]) return '000';
    if (keysPressed[0] && !keysPressed[1] && !keysPressed[2]) return '100';
    if (!keysPressed[0] && keysPressed[1] && !keysPressed[2]) return '020';
    if (!keysPressed[0] && !keysPressed[1] && keysPressed[2]) return '003';
    if (keysPressed[0] && keysPressed[1] && !keysPressed[2]) return '120';
    if (keysPressed[0] && !keysPressed[1] && keysPressed[2]) return '103';
    if (!keysPressed[0] && keysPressed[1] && keysPressed[2]) return '023';
    if (keysPressed[0] && keysPressed[1] && keysPressed[2]) return '123';
}

// used for the note images
function getValveSum() {
    let sum = 0;
    sum += keysPressed[0] ? 2 : 0;
    sum += keysPressed[1] ? 1 : 0;
    sum += keysPressed[2] ? 3 : 0;
    return sum;
}

// used for the partials
function getValveMultiplier() {
    let M = 1;
    for (let i = 0; i < keysPressed.length; i++) {
        if (keysPressed[i]) M *= valvePitchDown[i];
    }
    return M;
}

function loadHornImg() {
    let valveId = getValveId();

    let hornContainer = document.getElementById('horn-image-container');
    let img = document.createElement('img');
    img.className = 'horn-image';
    img.src = `./assets/horn_${valveId || '000'}.png`;
    
    // Only clear and add new image after it loads
    img.onload = function() {
        hornContainer.innerHTML = '';
        hornContainer.appendChild(img);
    };
}

function loadNoteImg() {
    let valveSum = getValveSum();

    let noteContainer = document.getElementById('note-image-container');
    let img = document.createElement('img');

    console.log('heightPartialNoteIdxs[currPartial - valveSum]:', heightPartialNoteIdxs[currPartial - valveSum]);

    
    let noteName = notes[heightPartialNoteIdxs[currPartial] - valveSum || 0];

    console.log('noteName:', noteName);
    
    img.className = 'note-image';
    img.src = `./assets/notes/${noteName || 'C4'}.png`;
    
    // Only clear and add new image after it loads
    img.onload = function() {
        noteContainer.innerHTML = '';
        noteContainer.appendChild(img);
    };
}

function changeIntervalFingerings() {
    let M = getValveMultiplier();
    let inv = 1 / M;

    // Recompute heightPartials using interpolation
    heightPartials = basePartials.map((baseY, i) => {
        let shiftedIndex = i * inv;
        return interpolateFromBasePartials(shiftedIndex);
    });

    // redraw interval divs
    createIntervalDivs();
}

function interpolateFromBasePartials(x) {
    // x: fractional partial index (e.g., 2.4 = 40% between partial 2 and 3)

    let i0 = Math.floor(x);
    let i1 = Math.ceil(x);

    if (i0 < 0) return basePartials[0];
    if (i1 >= basePartials.length)
        return basePartials[basePartials.length - 1];

    if (i0 === i1) return basePartials[i0];

    let y0 = basePartials[i0];
    let y1 = basePartials[i1];
    let t = x - i0;

    return y0 + (y1 - y0) * t;
}

function keydown(event) {
    document.getElementById('valve-' + event.key)?.style.setProperty('background-color', 'black');
    if (event.key === keys[0] && !keysPressed[0]) {
        keysPressed[0] = true;
    }
    else if (event.key === keys[1] && !keysPressed[1]) {
        keysPressed[1] = true;
    }
    else if (event.key === keys[2] && !keysPressed[2]) {
        keysPressed[2] = true;
    }

    changeIntervalFingerings();
    loadHornImg();
}

function keyup(event) {
    document.getElementById('valve-' + event.key)?.style.setProperty('background-color', 'white');
    if (event.key === keys[0] && keysPressed[0]) {
        keysPressed[0] = false;
    }
    else if (event.key === keys[1] && keysPressed[1]) {
        keysPressed[1] = false;
    }
    else if (event.key === keys[2] && keysPressed[2]) {
        keysPressed[2] = false;
    }

    changeIntervalFingerings();
    loadHornImg();
}

let mouseHeld = false;
function mousedown(event) {
    mouseHeld = true;
    osc.start();
}

function mouseup(event) {
    mouseHeld = false;
    osc.stop();
}