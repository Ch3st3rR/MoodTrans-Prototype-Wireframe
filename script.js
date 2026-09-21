const screen = document.getElementById("screen");
const backButton = document.getElementById("backButton");
const soundButton = document.getElementById("soundButton");
const soundLabel = document.getElementById("soundLabel");

const answers = {
  mood: "",
  energy: "",
  event: "",
  comfort: "",
  dysphoria: "",
  activity: "",
  note: ""
};

let current = 0;
let history = [];
let audioContext = null;
let masterGain = null;
let ambientTimer = null;
let soundOn = false;

function progress(percent) {
  return `
    <div class="progress" aria-hidden="true">
      <div class="progress-bar" style="width:${percent}%"></div>
    </div>
  `;
}

const screens = [
  () => `
    <section class="view intro-screen" id="introScreen" tabindex="0" onclick="introAdvance()">
      <div class="intro-logo">HELLO!</div>
      <div class="intro-prompt" id="introPrompt">Press <strong>ENTER</strong> to continue</div>
    </section>
  `,

  () => `
    <section class="view">
      <h2>Welcome to<br>MoodTrans!</h2>
      <p class="description">
        An emotional check-in app that uses interactive questions to help
        transgender people understand and track their emotional well-being.
      </p>
      <div class="options" style="margin-top:22px">
        <button class="option" onclick="next()">Continue</button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      <h2>Do you want to<br>start a quiz?</h2>
      <div class="options" style="margin-top:20px">
        <button class="option" onclick="next()">Yes</button>
        <button class="option" onclick="goTo(1)">No</button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(14)}
      <div class="question">
        <h2>How are you<br>feeling today?</h2>
      </div>
      <div class="mood-grid">
        ${["Happy", "Good", "Angry", "Sad"].map(value => `
          <button
            class="mood ${answers.mood === value ? "selected" : ""}"
            onclick="pick('mood', '${value}'); next()">
            ${value}
          </button>
        `).join("")}
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(28)}
      <div class="question">
        <h2>How was your<br>energy level?</h2>
      </div>
      <div class="options">
        <button class="option" onclick="pick('energy','High'); next()">
          I'm feeling great! I have a nice day today!
        </button>
        <button class="option" onclick="pick('energy','Normal'); next()">
          I'm feeling normal, was just a normal day (like others).
        </button>
        <button class="option" onclick="pick('energy','Low'); next()">
          Today was a day complicated, very stressful!
        </button>
        <button class="option" onclick="pick('energy','Strange'); next()">
          I don't know, I'm feeling something strange.
        </button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(42)}
      <div class="question">
        <h2>Something<br>happened with<br>your mood?</h2>
      </div>
      <div class="options">
        <button class="option" onclick="pick('event','Fun'); next()">
          Yes, I just have a fun
        </button>
        <button class="option" onclick="pick('event','Negative'); next()">
          Yes, I know, maybe something happened
        </button>
        <button class="option" onclick="pick('event','Nothing'); next()">
          I don't want to talk about it.
        </button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(56)}
      <div class="question">
        <h2>Do you feel<br>comfortable<br>with yourself?</h2>
      </div>
      <div class="options">
        <button class="option" onclick="pick('comfort','Yes'); next()">
          Yes, so much! &lt;3
        </button>
        <button class="option" onclick="pick('comfort','Maybe'); next()">Maybe</button>
        <button class="option" onclick="pick('comfort','No'); next()">Not really</button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(70)}
      <div class="question">
        <h2>Have you<br>experienced any<br>moments of<br>dysphoria, euphoria,<br>or discomfort?</h2>
      </div>
      <div class="options">
        <button class="option" onclick="pick('dysphoria','Yes'); next()">Yes</button>
        <button class="option" onclick="pick('dysphoria','No'); next()">No</button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(82)}
      <div class="question">
        <h2>What do you want to<br>do right now?</h2>
      </div>
      <div class="options">
        <button class="option" onclick="pick('activity','Play'); next()">
          I just want to play something
        </button>
        <button class="option" onclick="pick('activity','Learn'); next()">
          I don't know lmao
        </button>
        <button class="option" onclick="pick('activity','Relax'); next()">
          Enjoy my life!
        </button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      ${progress(92)}
      <div class="question">
        <h2>Do you want to write<br>something about<br>your day?</h2>
      </div>
      <textarea id="note" class="note" aria-label="Write about your day"></textarea>
      <div class="options">
        <button class="option" onclick="saveNote()">Send</button>
        <button class="option" onclick="finish()">No, thank you!</button>
      </div>
    </section>
  `,

  () => `
    <section class="view">
      <div class="result-orb">MoodTrans</div>
      <div class="result-text">
        Maybe you are feeling:<br>${getResult()}
      </div>
      <div class="options">
        <button class="option" onclick="saveResult()">Save the result</button>
        <button class="option" onclick="restart()">Redo it</button>
      </div>
    </section>
  `
];

function render(direction = "forward") {
  screen.innerHTML = screens[current]();

  const view = screen.querySelector(".view");
  view.classList.toggle("back", direction === "back");

  backButton.style.display = current >= 3 && current < screens.length - 1
    ? "block"
    : "none";

  if (current === 0) {
    prepareIntro();
    const intro = document.getElementById("introScreen");
    if (intro) intro.focus();
  }
}

function next() {
  if (current < screens.length - 1) {
    history.push(current);
    current++;
    render("forward");
  }
}

function goTo(index) {
  history.push(current);
  current = index;
  render("back");
}

function goBack() {
  if (history.length) {
    current = history.pop();
    render("back");
  }
}

function pick(key, value) {
  answers[key] = value;
}

function saveNote() {
  const note = document.getElementById("note");
  answers.note = note ? note.value : "";
  finish();
}

function finish() {
  history.push(current);
  current = screens.length - 1;
  render("forward");
}

function restart() {
  Object.keys(answers).forEach(key => {
    answers[key] = "";
  });

  history = [];
  current = 3;
  render("back");
}

function getResult() {
  if (answers.dysphoria === "Yes" && answers.comfort === "No") {
    return "Something uncomfortable";
  }

  if (answers.energy === "Low") {
    return "A stressful day";
  }

  if (answers.mood === "Happy" || answers.mood === "Good") {
    return "Something positive";
  }

  if (answers.event === "Fun") {
    return "Something good";
  }

  return "Something";
}

function saveResult() {
  localStorage.setItem("moodTransLastResult", getResult());
  alert("Result saved locally for this prototype.");
}


/* Intro controls: Enter/Space or a click advances the opening screen. */
let introReady = false;
let introTimer = null;

function prepareIntro() {
  if (current !== 0) return;

  introReady = false;
  clearTimeout(introTimer);

  const prompt = document.getElementById("introPrompt");
  if (prompt) prompt.classList.remove("visible");

  introTimer = setTimeout(() => {
    introReady = true;
    const currentPrompt = document.getElementById("introPrompt");
    if (currentPrompt) currentPrompt.classList.add("visible");
  }, 1050);
}

function introAdvance() {
  if (current !== 0) return;

  /* If the user clicks/presses early, finish the small intro animation first. */
  if (!introReady) {
    clearTimeout(introTimer);
    introReady = true;
    const prompt = document.getElementById("introPrompt");
    if (prompt) prompt.classList.add("visible");
    return;
  }

  next();
}

document.addEventListener("keydown", (event) => {
  if (current !== 0) return;

  if (event.key === "Enter" || event.key === " " || event.code === "NumpadEnter") {
    event.preventDefault();
    introAdvance();
  }
});

backButton.addEventListener("click", goBack);

/* Optional ambient sound — starts only after the user presses the button. */
function createAmbient() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.025;
    masterGain.connect(audioContext.destination);
  }

  const notes = [130.81, 164.81, 196.00, 246.94];
  let index = 0;

  function playNote() {
    if (!soundOn) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.value = notes[index % notes.length];

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 2.7);

    index++;
    ambientTimer = setTimeout(playNote, 1600);
  }

  playNote();
}

soundButton.addEventListener("click", async () => {
  if (!audioContext) {
    soundOn = true;
    soundLabel.textContent = "ambient on";
    soundButton.textContent = "♫";
    createAmbient();
    return;
  }

  if (soundOn) {
    soundOn = false;
    clearTimeout(ambientTimer);
    soundLabel.textContent = "ambient off";
    soundButton.textContent = "♪";
  } else {
    soundOn = true;
    soundLabel.textContent = "ambient on";
    soundButton.textContent = "♫";

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    createAmbient();
  }
});

render();
