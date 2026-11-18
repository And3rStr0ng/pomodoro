// ---- Configuración y estado ----
const Config = {
  minutes: { work: 25, short: 5, long: 15 },
  labels: { work: "Trabajo", short: "Descanso corto", long: "Descanso largo" },
  seconds(mode) { return this.minutes[mode] * 60; }
};
const State = { mode: "work", remaining: 25 * 60, running: false, endAt: 0, completed: 0, interval: null };

// ---- Sonido ----
const Sound = {
  ctx: null,
  beep() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(t => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(this.ctx.destination);
        const s = this.ctx.currentTime + t;
        g.gain.setValueAtTime(0.25, s); g.gain.exponentialRampToValueAtTime(0.001, s + 0.3);
        o.start(s); o.stop(s + 0.3);
      });
    } catch (e) { /* audio no disponible */ }
  }
};

// ---- Interfaz ----
const $ = id => document.getElementById(id);
const UI = {
  render() {
    const m = String(Math.floor(State.remaining / 60)).padStart(2, "0");
    const s = String(State.remaining % 60).padStart(2, "0");
    $("time").textContent = `${m}:${s}`;
    $("modeLabel").textContent = Config.labels[State.mode];
    $("count").textContent = State.completed;
    $("toggle").textContent = State.running ? "Pausar" : (State.remaining < Config.seconds(State.mode) ? "Reanudar" : "Iniciar");
    $("toggle").setAttribute("aria-label", State.running ? "Pausar temporizador" : "Iniciar o reanudar temporizador");
    document.title = `${m}:${s} · ${Config.labels[State.mode]}`;
    document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === State.mode));
  },
  announce(msg) { $("live").textContent = msg; }
};

// ---- Temporizador ----
const Timer = {
  setMode(mode) { this.pause(); State.mode = mode; State.remaining = Config.seconds(mode); UI.render(); },
  start() {
    if (State.running) return;
    State.running = true;
    State.endAt = Date.now() + State.remaining * 1000;
    State.interval = setInterval(() => this.tick(), 250);
    UI.render();
  },
  pause() { State.running = false; clearInterval(State.interval); UI.render(); },
  toggle() { State.running ? this.pause() : this.start(); },
  reset() { this.setMode(State.mode); },
  tick() {
    State.remaining = Math.max(0, Math.round((State.endAt - Date.now()) / 1000));
    UI.render();
    if (State.remaining === 0) this.finish();
  },
  finish() {
    this.pause();
    Sound.beep();
    let next = "work";
    if (State.mode === "work") { State.completed++; next = State.completed % 4 === 0 ? "long" : "short"; }
    UI.announce(`Sesión terminada. Siguiente: ${Config.labels[next]}`);
    this.setMode(next);
  }
};

// ---- Eventos ----
$("toggle").onclick = () => Timer.toggle();
$("reset").onclick = () => Timer.reset();
document.querySelectorAll(".tab").forEach(b => b.onclick = () => Timer.setMode(b.dataset.mode));
["work", "short", "long"].forEach(k => {
  $("cfg-" + k).addEventListener("change", e => {
    const v = Math.min(Math.max(parseInt(e.target.value) || 1, 1), +e.target.max);
    e.target.value = v;
    Config.minutes[k] = v;
    if (State.mode === k && !State.running) Timer.reset();
  });
});
document.addEventListener("keydown", e => {
  if (e.code === "Space" && !["INPUT", "BUTTON"].includes(e.target.tagName)) { e.preventDefault(); Timer.toggle(); }
});
UI.render();