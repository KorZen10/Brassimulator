import * as Tone from "https://cdn.skypack.dev/tone";
let osc;
let oscRoot = 87.3;
let mouseX;
let mouseY;
let prevMouseX = 0;
let keysRight = ['j', 'k', 'l'];
let keysLeft = ['f', 'd', 's'];
let keys = {rightHand: true, keys: keysRight};
let keysPressed = [false, false, false];
let valvePitchDown = [1.12246, 1.05946, 1.18921]; // major second, minor second, minor third
let numPartials = 8;
let notesFlats = ['Gb1', 'G2', 'Ab2', 'A2', 'Bb2', 'B2', 'C2', 'Gb2', 'G3', 'Ab3', 'A3', 'Bb3', 'B3', 'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G4', 'Ab4', 'A4', 'Bb4', 'B4', 'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C5'];
let notesSharps = ['F#1', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C2', 'F#2', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G5', 'G#5', 'A5', 'A#5', 'B5', 'C5'];
let notes = notesFlats;
let useSharps = false;
let heightPartials = [];
let basePartials = [];
let heightPartialNoteIdxs = [6, 13, 20, 25, 29, 32, 35, 37];
let currPartial = 0;
let ratio = 1.3;
let noteBoxRatio = 1; // Separate ratio for note box spacing
let currFrequency = 500;
let volumeOn = true;
let accentOn = true;
let hornVisible = true;
let noteVisible = true;
let defaultDynamics = {volume: 0, frequency: 500};

window.addEventListener('keydown', keydown);
window.addEventListener('keyup', keyup);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mouseup', mouseup);
window.addEventListener('blur', function() {
    // Stop sound when window loses focus
    if (mouseHeld || rightMouseHeld) {
        osc.stop();
        mouseHeld = false;
        rightMouseHeld = false;
        cancelFilterDrop();
    }
});

document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

document.addEventListener('mousemove', function(event) {
    mouseX = event.clientX; // X-coordinate relative to the viewport
    mouseY = event.clientY; // Y-coordinate relative to the viewport

    if (mouseX !== prevMouseX) {
        updateVolume();
        prevMouseX = mouseX;
    }

    // console.log(`Mouse position: X = ${mouseX}, Y = ${mouseY}`);
});

function updateVolume() {
    if (!volumeOn) return;
    if (isFilterAttackActive()) return;
    // Map mouseX to volume range
    const normalized = mouseX / window.innerWidth; // 0 at left, 1 at right
    
    // Volume range: -25 dB at left edge, 0 dB at right edge
    const volumeDb = -25 + (25 * normalized);
    window.volume.volume.value = volumeDb;

    currFrequency = 300 + (400 * normalized);
    window.filter.frequency.value = currFrequency;
}


window.onload = function() {
    for (let key of keys.keys) {
        let div = document.createElement('div');
        div.className = 'valve';
        div.id = 'valve-' + key;
        div.textContent = key;
        div.setAttribute("onfocus", "this.blur()");
        div.setAttribute("tabindex", "-1");
        document.getElementById('valves').appendChild(div);
    }

    // Create a brassy sound with sawtooth wave, low-pass filter, and reverb
    const reverb = new Tone.Reverb({
        decay: 0.5,
        wet: 0.6
    }).toDestination();
    window.filter = new Tone.Filter(defaultDynamics.frequency, "lowpass").connect(reverb);
    window.volume = new Tone.Volume(defaultDynamics.volume).connect(window.filter);
    osc = new Tone.Oscillator({
        type: "sawtooth",
        frequency: oscRoot
    }).connect(window.volume);

    // Initialize heightPartials based on ratio
    updateHeightPartials();

    console.log('heightPartials:', heightPartials);
    console.log('heightPartials[currPartial]:', heightPartials[currPartial]);
    console.log('heightPartials[currPartial + 1]:', heightPartials[currPartial + 1]);

    createIntervalDivs();
    // createNoteBoxes();
    
    rAF60fps();
}

function updateHeightPartials() {
    heightPartials = [];
    
    if (ratio === 1) {
        partialInterval = window.innerHeight / numPartials;
        for (let i = numPartials; i > 0; i--) {
            heightPartials.push(i * partialInterval);
        }
    } else {
        const firstInterval = window.innerHeight * (1 - ratio) / (1 - Math.pow(ratio, numPartials));
        
        for (let i = 0; i < numPartials; i++) {
            heightPartials.push(firstInterval * Math.pow(ratio, i) + (heightPartials[i - 1] || 0));
        }
        heightPartials.reverse();
        heightPartials.push(-1000);
    }

    basePartials = [...heightPartials];
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

function createNoteBoxes() {
    const container = document.body;
    
    // Clear old note boxes
    document.querySelectorAll('.note-box').forEach(x => x.remove());
    
    // Piano key colors: white keys are white, black keys are black
    const pianoKeyColors = [
        'rgba(255, 255, 255, 0.8)', // C - white
        'rgba(0, 0, 0, 0.8)',        // C# - black
        'rgba(255, 255, 255, 0.8)', // D - white
        'rgba(0, 0, 0, 0.8)',        // D# - black
        'rgba(255, 255, 255, 0.8)', // E - white
        'rgba(255, 255, 255, 0.8)', // F - white
        'rgba(0, 0, 0, 0.8)',        // F# - black
        'rgba(255, 255, 255, 0.8)', // G - white
        'rgba(0, 0, 0, 0.8)',        // G# - black
        'rgba(255, 255, 255, 0.8)', // A - white
        'rgba(0, 0, 0, 0.8)',        // A# - black
        'rgba(255, 255, 255, 0.8)'  // B - white
    ];
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Define bounds: from bottom of highest partial to bottom of 2nd partial
    // basePartials[0] has LARGEST Y (bottom of 1st partial), basePartials[1] has bottom of 2nd partial
    // basePartials[numPartials-1] has SMALLEST Y (top)
    // basePartials[numPartials] is -1000 (off-screen marker), so use numPartials-1
    const topBound = basePartials[numPartials - 1]; // Top bound (smallest Y value)
    const bottomBound = basePartials[1]; // Bottom of 2nd partial
    const totalHeight = bottomBound - topBound; // Should be positive
    
    // 2.5 octaves = 30 semitones (from F# to B)
    // F# = 6, G = 7, ..., B = 11, C = 0, ..., B = 11 (30 total semitones)
    const numSemitones = 30;
    
    // Calculate note positions using geometric series
    const notePositions = [];
    
    if (noteBoxRatio === 1) {
        // Uniform spacing
        const interval = totalHeight / numSemitones;
        for (let i = 0; i <= numSemitones; i++) {
            notePositions.push(topBound + i * interval);
        }
    } else {
        // Geometric series spacing
        const firstInterval = totalHeight * (1 - noteBoxRatio) / (1 - Math.pow(noteBoxRatio, numSemitones));
        
        notePositions.push(topBound);
        for (let i = 0; i < numSemitones; i++) {
            const size = firstInterval * Math.pow(noteBoxRatio, i);
            notePositions.push(notePositions[notePositions.length - 1] + size);
        }
    }
    
    // Create boxes for each semitone (F# to B spanning 2.5 octaves)
    // Starting from B at the top (highest pitch), descending to F# at bottom (lowest pitch)
    for (let i = 0; i < numSemitones; i++) {
        const topY = notePositions[i];
        const bottomY = notePositions[i + 1];
        const height = bottomY - topY;
        
        // Calculate which note this is - start from B (11) and go down to F# (6)
        // B, A#, A, G#, G, F#, E, D#, D, C#, C, B, A#, ... (30 total)
        const noteIdx = (11 - i + 12 * 3) % 12;
        
        const div = document.createElement('div');
        div.className = 'note-box';
        div.style.position = 'fixed';
        div.style.right = '10px';
        div.style.width = '60px';
        div.style.top = topY + 'px';
        div.style.height = height + 'px';
        div.style.border = '1px solid rgba(100, 100, 100, 0.5)';
        div.style.backgroundColor = pianoKeyColors[noteIdx];
        div.style.zIndex = '10';
        div.style.pointerEvents = 'none';
        div.style.fontSize = '12px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.fontWeight = 'bold';
        
        div.textContent = noteNames[noteIdx];
        div.style.color = (noteIdx === 1 || noteIdx === 3 || noteIdx === 6 || noteIdx === 8 || noteIdx === 10) ? 'white' : 'black';
        
        container.appendChild(div);
    }
}

function interpolateNotePosition(partialIndex) {
    // Similar to interpolateFromBasePartials but for continuous note positions
    const i0 = Math.floor(partialIndex);
    const i1 = Math.ceil(partialIndex);
    
    if (i0 < 0 || i0 >= basePartials.length - 1) return -1000;
    
    if (i0 === i1) return basePartials[i0];
    
    const y0 = basePartials[i0];
    const y1 = basePartials[i0 + 1];
    const t = partialIndex - i0;
    
    return y0 - (y0 - y1) * t; // Subtract because Y increases downward
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
        let newPartial = numPartials - 1;
        for (let i = 0; i < numPartials; i++) {
            if (mouseY <= heightPartials[i] && mouseY >= heightPartials[i + 1]) {
                newPartial = i;
                break;
            }
        }
        currPartial = newPartial;
        console.log('currPartial:', currPartial);
        console.log('mouseY:', mouseY);
    }
    if (mouseHeld == true || rightMouseHeld == true) loadNoteImg();
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
    // Encode # as %23 for URL compatibility
    const encodedNoteName = (noteName || 'C4').replace('#', '%23');
    img.src = `./assets/notes/${encodedNoteName}.png`;
    
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

let mouseHeld = false;
let rightMouseHeld = false;
let filterDropInterval = null;

function isFilterAttackActive() {
    return filterDropInterval !== null;
}

// accent
function attackFilter() {
    if (!accentOn) return;
    // Immediately set filter to high value
    window.filter.frequency.value = 4 * currFrequency;
    
    // Clear any existing drop interval
    if (filterDropInterval) {
        clearInterval(filterDropInterval);
        filterDropInterval = null;
    }
    
    // Gradually drop filter back to currFrequency over 0.5 seconds
    const dropDuration = 250; // milliseconds
    const dropSteps = 60; // frames per second
    const stepTime = dropDuration / dropSteps;
    const startValue = 2000;
    const endValue = currFrequency;
    const dropPerStep = (startValue - endValue) / dropSteps;
    
    let currentStep = 0;
    filterDropInterval = setInterval(() => {
        currentStep++;
        const newValue = startValue - (dropPerStep * currentStep);
        
        if (newValue <= endValue || currentStep >= dropSteps) {
            window.filter.frequency.value = endValue;
            clearInterval(filterDropInterval);
            filterDropInterval = null;
        } else {
            window.filter.frequency.value = newValue;
        }
        console.log('Filter frequency:', window.filter.frequency.value);
    }, stepTime);
}

function cancelFilterDrop() {
    if (filterDropInterval) {
        clearInterval(filterDropInterval);
        filterDropInterval = null;
    }
    window.filter.frequency.value = currFrequency;
}

function mousedown(event) {
    if (mouseHeld || rightMouseHeld) return;
    osc.start();
    if (event.button === 0) { // Left click
        mouseHeld = true;
    } else if (event.button === 2) { // Right click
        rightMouseHeld = true;
        attackFilter();
        
    }
}

function mouseup(event) {
    osc.stop();
    if (event.button === 0) { // Left click
        mouseHeld = false;
    } else if (event.button === 2) { // Right click
        rightMouseHeld = false;
        cancelFilterDrop();
    }
}

function keydown(event) {
    // Prevent default behavior for Space and Alt keys
    if (event.key === ' ' || event.key === 'Alt' || event.altKey) {
        event.preventDefault();
    }
    
    document.getElementById('valve-' + event.key)?.style.setProperty('background-color', 'black');
    if (event.key === keys.keys[0] && !keysPressed[0]) {
        keysPressed[0] = true;
    }
    else if (event.key === keys.keys[1] && !keysPressed[1]) {
        keysPressed[1] = true;
    }
    else if (event.key === keys.keys[2] && !keysPressed[2]) {
        keysPressed[2] = true;
    }
    else if (event.key === ' ') {
        mousedown({button: 0});
    }
    else if (event.key === 'Alt') {
        mousedown({button: 2});
    }

    changeIntervalFingerings();
    loadHornImg();
}

function keyup(event) {
    // Prevent default behavior for Space and Alt keys
    if (event.key === ' ' || event.key === 'Alt' || event.altKey) {
        event.preventDefault();
    }
    
    document.getElementById('valve-' + event.key)?.style.setProperty('background-color', 'white');
    if (event.key === keys.keys[0] && keysPressed[0]) {
        keysPressed[0] = false;
    }
    else if (event.key === keys.keys[1] && keysPressed[1]) {
        keysPressed[1] = false;
    }
    else if (event.key === keys.keys[2] && keysPressed[2]) {
        keysPressed[2] = false;
    }
    else if (event.key === ' ') {
        mouseup({button: 0});
    }
    else if (event.key === 'Alt') {
        mouseup({button: 2});
    }

    changeIntervalFingerings();
    loadHornImg();
}

function switchHands() {
    if (keys.rightHand) {
        keys.rightHand = false;
        keys.keys = keysLeft;
    } else {
        keys.rightHand = true;
        keys.keys = keysRight;
    }

    // Update valve labels and IDs
    let valveDivs = document.querySelectorAll('.valve');
    if (keys.rightHand) {
        for (let i = 0; i < valveDivs.length; i++) {
            valveDivs[i].textContent = keys.keys[i];
            valveDivs[i].id = 'valve-' + keys.keys[i];
        }
    }
    else {
        for (let i = 0; i < valveDivs.length; i++) {
            const keyIndex = valveDivs.length - 1 - i;
            valveDivs[i].textContent = keys.keys[keyIndex];
            valveDivs[i].id = 'valve-' + keys.keys[keyIndex];
        }
    }
    
    // Flip horn image horizontally based on hand
    let hornContainer = document.getElementById('horn-image-container');
    if (keys.rightHand) {
        hornContainer.style.transform = 'scaleX(1)';
    } else {
        hornContainer.style.transform = 'scaleX(-1)';
    }
    
    changeIntervalFingerings();
    loadHornImg();
}

// Make switchHands available globally for the HTML button
window.switchHands = switchHands;


// Instructions popup
document.getElementById('openInstructionsBtn').addEventListener('click', function() {
    document.getElementById('instructionsOverlay').style.display = 'flex';
});

document.getElementById('closeInstructionsBtn').addEventListener('click', function() {
    document.getElementById('instructionsOverlay').style.display = 'none';
});

document.getElementById('instructionsOverlay').addEventListener('click', function(event) {
    if (event.target === this) {
        document.getElementById('instructionsOverlay').style.display = 'none';
    }
});

// Settings popup
document.getElementById('openSettingsBtn').addEventListener('click', function() {
    document.getElementById('settingsOverlay').style.display = 'flex';
});

document.getElementById('closeSettingsBtn').addEventListener('click', function() {
    document.getElementById('settingsOverlay').style.display = 'none';
});

document.getElementById('settingsOverlay').addEventListener('click', function(event) {
    if (event.target === this) {
        document.getElementById('settingsOverlay').style.display = 'none';
    }
});

// Listen for messages from settings iframe
window.addEventListener('message', function(event) {
    if (event.data.type === 'ratioChange') {
        ratio = event.data.value;
        noteBoxRatio = ratio;
        updateHeightPartials();
        createIntervalDivs();
    }
    else if (event.data.type === 'handChange') {
        if (event.data.value !== keys.rightHand) {
            switchHands();
        }
    }
    else if (event.data.type === 'dynamicsChange') {
        volumeOn = event.data.value;
        if (!volumeOn) {
            window.volume.volume.value = defaultDynamics.volume;
            osc.frequency.value = defaultDynamics.frequency;
        }
    }
    else if (event.data.type === 'accentChange') {
        accentOn = event.data.value;
    }
    else if (event.data.type === 'hornVisibleChange') {
        hornVisible = event.data.value;
        const hornContainer = document.getElementById('horn-image-container');
        if (hornContainer) {
            hornContainer.style.display = hornVisible ? 'block' : 'none';
        }
    }
    else if (event.data.type === 'noteVisibleChange') {
        noteVisible = event.data.value;
        const noteContainer = document.getElementById('note-image-container');
        if (noteContainer) {
            noteContainer.style.display = noteVisible ? 'block' : 'none';
        }
    }
    else if (event.data.type === 'useSharpsChange') {
        useSharps = event.data.value;
        notes = useSharps ? notesSharps : notesFlats;
    }
    else if (event.data.type === 'requestSettings') {
        // Send current settings to the iframe
        const iframe = document.querySelector('#settingsOverlay iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'initSettings',
                ratio: ratio,
                rightHand: keys.rightHand,
                hornVisible: hornVisible,
                noteVisible: noteVisible,
                useSharps: useSharps
            }, '*');
        }
    }
});