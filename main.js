(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Footer year ----
  document.querySelectorAll("#year").forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---- Email (assembled at runtime so scrapers can't read it from the HTML) ----
  const emailParts = ["evan.mikayla", "gmail.com"];
  const email = emailParts.join("@");
  const emailBtn = $("#email-btn");
  if (emailBtn) emailBtn.href = "mailto:" + email;

  // ---- Show resume download only if resume.pdf exists ----
  const resumeBtn = $("#resume-btn");
  if (resumeBtn && location.protocol.startsWith("http")) {
    fetch("resume.pdf", { method: "HEAD" })
      .then((r) => { if (r.ok) resumeBtn.hidden = false; })
      .catch(() => {});
  }

  // ---- Typed tagline ----
  const typed = $("#typed");
  if (typed && !reduceMotion) {
    const phrases = ["Aspiring SOC Analyst", "Anomaly & Pattern Detection", "Data-Driven Defender", "B.S. Statistics, Univ. of Iowa"];
    let p = 0, i = 0, deleting = false;
    const tick = () => {
      const word = phrases[p];
      typed.textContent = word.slice(0, i);
      if (!deleting && i < word.length) i++;
      else if (deleting && i > 0) i--;
      else if (!deleting) { deleting = true; return setTimeout(tick, 1600); }
      else { deleting = false; p = (p + 1) % phrases.length; }
      setTimeout(tick, deleting ? 35 : 70);
    };
    tick();
  }

  // ---- Project filters (projects page) ----
  const filters = document.querySelectorAll(".filter");
  if (filters.length) {
    const cards = document.querySelectorAll(".project");
    const empty = $("#empty");
    filters.forEach((btn) =>
      btn.addEventListener("click", () => {
        filters.forEach((b) => b.classList.toggle("active", b === btn));
        const f = btn.dataset.filter;
        let shown = 0;
        cards.forEach((c) => {
          const show = f === "all" || c.dataset.cat === f;
          c.hidden = !show;
          if (show) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      })
    );
  }

  // ---- Interactive terminal ----
  const out = $("#term-output");
  const form = $("#term-form");
  const input = $("#term-cmd");
  if (!out || !form || !input) return;

  // Each output line is [cssClass, text]. Text is inserted with textContent (never innerHTML).
  const commands = {
    help: () => [
      ["out", "Available commands:"],
      ["hl", "  whoami      "], ["out", "    short bio"],
      ["hl", "  skills      "], ["out", "    technical skills"],
      ["hl", "  experience  "], ["out", "    work history"],
      ["hl", "  education   "], ["out", "    degree & coursework"],
      ["hl", "  certs       "], ["out", "    certification roadmap"],
      ["hl", "  projects    "], ["out", "    security labs & write-ups"],
      ["hl", "  contact     "], ["out", "    how to reach me"],
      ["hl", "  ls / clear  "], ["out", "    list files / clear screen"],
    ],
    whoami: () => [
      ["ok", "Evan Pearlman"],
      ["out", "B.S. Statistics, University of Iowa ('26). Underwriting Operations Associate."],
      ["out", "I find patterns, anomalies and discrepancies in high-volume data,"],
      ["out", "and I'm turning that into a career in cybersecurity."],
    ],
    skills: () => [
      ["hl", "[security & analysis]"],
      ["out", "  anomaly/pattern detection · risk scoring · data integrity · documentation"],
      ["hl", "[tools]"],
      ["out", "  python · sql · excel · power bi · github · cloudflare"],
      ["hl", "[it & communication]"],
      ["out", "  user support · access/login troubleshooting · escalation"],
      ["warn", "[learning]"],
      ["out", "  wireshark · phishing analysis · linux · siem · mitre att&ck"],
    ],
    experience: () => [
      ["hl", "2026-now   Underwriting Operations Associate @ Old Republic BITCO"],
      ["hl", "2026       Data Management Intern @ Farmers Insurance – Ruhlow Agency"],
      ["hl", "2025       Underwriting & Enterprise Ops Intern @ State Farm"],
      ["hl", "2023-2024  Customer Service Rep @ University of Iowa Billing Office"],
      ["out", "Scroll to the Experience section for details →"],
    ],
    education: () => [
      ["ok", "University of Iowa: B.S. Statistics (May 2026)"],
      ["out", "Coursework: Statistical Learning, Predictive Modeling, Data Visualization, SQL"],
      ["out", "Ina Loewenberg Scholarship"],
    ],
    certs: () => [
      ["warn", "[planned] CompTIA Security+"],
      ["warn", "[planned] Google Cybersecurity Certificate"],
      ["out", "Roadmap in progress. Check back soon."],
    ],
    projects: () => [
      ["warn", "[soon] Phishing Email Analysis"],
      ["warn", "[soon] Wireshark Traffic Analysis"],
      ["warn", "[soon] Home SOC Lab with SIEM"],
      ["out", "Type 'open projects' or visit /projects.html"],
    ],
    contact: () => [
      ["out", "email     " + email],
      ["out", "linkedin  linkedin.com/in/evan-pearlman"],
      ["out", "github    github.com/evanmikayla"],
    ],
    ls: () => [["hl", "about.txt  skills/  experience/  certs/  projects/  contact.txt"]],
    sudo: () => [["err", "evan is not in the sudoers file. This incident will be reported. 🚨"]],
    "rm -rf /": () => [["err", "Nice try. 🙂 Permission denied."]],
    date: () => [["out", new Date().toString()]],
    "open projects": () => { location.href = "projects.html"; return [["ok", "Opening projects..."]]; },
  };
  commands["cat about.txt"] = commands.whoami;
  commands["cat contact.txt"] = commands.contact;

  const history = [];
  let hIdx = 0;

  const print = (cls, text) => {
    const p = document.createElement("p");
    p.className = "line " + cls;
    p.textContent = text;
    out.appendChild(p);
  };

  // Combine label + description pairs from help into single lines.
  const render = (lines) => {
    for (let i = 0; i < lines.length; i++) {
      const [cls, text] = lines[i];
      if (cls === "hl" && /\s{2,}$/.test(text) && lines[i + 1]) {
        const p = document.createElement("p");
        p.className = "line";
        const a = document.createElement("span"); a.className = "hl"; a.textContent = text;
        const b = document.createElement("span"); b.className = "out"; b.textContent = lines[i + 1][1].trimStart();
        p.append(a, b);
        out.appendChild(p);
        i++;
      } else print(cls, text);
    }
  };

  const run = (raw) => {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    const echo = document.createElement("p");
    echo.className = "line";
    const ps = document.createElement("span"); ps.className = "ps1"; ps.textContent = "evan@portfolio:~$ ";
    const c = document.createElement("span"); c.className = "cmd"; c.textContent = raw;
    echo.append(ps, c);
    out.appendChild(echo);

    if (!cmd) { out.scrollTop = out.scrollHeight; return; }
    history.push(raw); hIdx = history.length;

    if (cmd === "clear") { out.textContent = ""; return; }
    const key = cmd.startsWith("sudo") ? "sudo" : cmd;
    const fn = commands[key];
    if (fn) render(fn());
    else print("err", `command not found: ${cmd.slice(0, 40)}. Type 'help' for options.`);
    out.scrollTop = out.scrollHeight;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run(input.value);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx];
    } else if (e.key === "ArrowDown" && history.length) {
      e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || "";
    } else if (e.key === "Tab") {
      const match = Object.keys(commands).concat("clear").find((k) => input.value && k.startsWith(input.value.toLowerCase()));
      if (match) { e.preventDefault(); input.value = match; }
    }
  });

  document.querySelectorAll(".chips button").forEach((b) =>
    b.addEventListener("click", () => { run(b.dataset.cmd); })
  );

  out.addEventListener("click", () => input.focus({ preventScroll: true }));

  // Boot sequence
  const boot = [
    ["out", "Booting portfolio v1.0 ..."],
    ["ok", "[  OK  ] Loaded resume modules"],
    ["ok", "[  OK  ] Security posture: hardened"],
    ["out", "Welcome! Type 'help' or click a command below."],
  ];
  if (reduceMotion) render(boot);
  else boot.forEach((l, i) => setTimeout(() => render([l]), 250 * i));
})();
