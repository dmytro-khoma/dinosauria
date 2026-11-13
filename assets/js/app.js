/**
 * Dinosauria — catalogue logic.
 *
 * Plain script (no modules), so index.html also works when opened
 * straight from the disk. Data comes from data.js (window.DINOSAURS).
 *
 * Flow: read filters from the URL → filter + sort → render cards,
 * timeline and counters → write filters back to the URL. Every control
 * change runs the same `update()`.
 */
(function () {
  "use strict";

  const DINOS = window.DINOSAURS || [];
  const HUMAN_HEIGHT = 1.8; // metres

  const PERIODS = [
    { id: "triassic", label: "Triassic", from: 252, to: 201 },
    { id: "jurassic", label: "Jurassic", from: 201, to: 145 },
    { id: "cretaceous", label: "Cretaceous", from: 145, to: 66 },
  ];
  const DIETS = ["herbivore", "carnivore", "omnivore"];
  const GROUPS = {
    theropod: "Theropods",
    sauropod: "Sauropods",
    ceratopsian: "Horned dinosaurs",
    ornithopod: "Ornithopods",
    armoured: "Armoured dinosaurs",
    "dome-headed": "Dome-headed",
  };
  const REGIONS = [...new Set(DINOS.flatMap((d) => d.region.split(", ")))].sort();
  const MAX_LENGTH = Math.ceil(Math.max(...DINOS.map((d) => d.length)));

  /* ---- Elements ---------------------------------------------------------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const form = $("[data-filters]");
  const grid = $("[data-grid]");
  const empty = $("[data-empty]");
  const count = $("[data-count]");
  const active = $("[data-active]");
  const bands = $("[data-timeline-bands]");
  const dots = $("[data-timeline-dots]");
  const dialog = $("[data-detail]");
  const cardTemplate = $("#card-template");

  /* ---- State <-> URL ----------------------------------------------------- */

  const state = {
    q: "",
    periods: new Set(),
    diets: new Set(),
    group: "",
    region: "",
    max: MAX_LENGTH,
    sort: "name",
  };

  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.periods = new Set((p.get("period") || "").split(",").filter((v) => PERIODS.some((x) => x.id === v)));
    state.diets = new Set((p.get("diet") || "").split(",").filter((v) => DIETS.includes(v)));
    state.group = GROUPS[p.get("group")] ? p.get("group") : "";
    state.region = REGIONS.includes(p.get("region")) ? p.get("region") : "";
    const max = Number(p.get("max"));
    state.max = max >= 1 && max <= MAX_LENGTH ? max : MAX_LENGTH;
    state.sort = ["name", "oldest", "newest", "longest", "heaviest"].includes(p.get("sort")) ? p.get("sort") : "name";
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.periods.size) p.set("period", [...state.periods].join(","));
    if (state.diets.size) p.set("diet", [...state.diets].join(","));
    if (state.group) p.set("group", state.group);
    if (state.region) p.set("region", state.region);
    if (state.max < MAX_LENGTH) p.set("max", state.max);
    if (state.sort !== "name") p.set("sort", state.sort);
    const query = p.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
  }

  /* ---- Filtering --------------------------------------------------------- */

  const normalise = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function matches(d) {
    if (state.q) {
      const haystack = normalise(`${d.name} ${d.meaning} ${d.region} ${GROUPS[d.group]} ${d.diet}`);
      if (!normalise(state.q).split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    if (state.periods.size && !state.periods.has(d.period)) return false;
    if (state.diets.size && !state.diets.has(d.diet)) return false;
    if (state.group && d.group !== state.group) return false;
    if (state.region && !d.region.split(", ").includes(state.region)) return false;
    return d.length <= state.max;
  }

  const SORTS = {
    name: (a, b) => a.name.localeCompare(b.name),
    oldest: (a, b) => b.from - a.from,
    newest: (a, b) => a.to - b.to,
    longest: (a, b) => b.length - a.length,
    heaviest: (a, b) => b.weight - a.weight,
  };

  /* ---- Formatting -------------------------------------------------------- */

  function formatWeight(tonnes) {
    if (tonnes < 1) {
      const kg = Math.round(tonnes * 1000);
      return `${kg.toLocaleString("en")} kg`;
    }
    return `${tonnes.toLocaleString("en", { maximumFractionDigits: 1 })} t`;
  }

  const formatAge = (d) => (d.from === d.to ? `${d.from}` : `${d.from}–${d.to}`);
  const periodOf = (id) => PERIODS.find((p) => p.id === id);

  /** Put <mark> around the search words inside an element, as text nodes. */
  function highlight(el, text) {
    el.textContent = "";
    const words = normalise(state.q).split(/\s+/).filter(Boolean);
    if (!words.length) {
      el.textContent = text;
      return;
    }
    const plain = normalise(text);
    const marks = new Array(text.length).fill(false);
    for (const word of words) {
      let i = plain.indexOf(word);
      while (i !== -1) {
        marks.fill(true, i, i + word.length);
        i = plain.indexOf(word, i + 1);
      }
    }
    let i = 0;
    while (i < text.length) {
      let j = i;
      while (j < text.length && marks[j] === marks[i]) j++;
      const chunk = text.slice(i, j);
      if (marks[i]) {
        const m = document.createElement("mark");
        m.textContent = chunk;
        el.append(m);
      } else {
        el.append(chunk);
      }
      i = j;
    }
  }

  /* ---- Building controls ------------------------------------------------- */

  function buildControls() {
    // Diet chips
    const chips = $('[data-chips="diet"]');
    for (const diet of DIETS) {
      const label = document.createElement("label");
      label.className = `chip chip--${diet}`;
      label.innerHTML = `<input type="checkbox" name="diet" value="${diet}"><span>${diet[0].toUpperCase() + diet.slice(1)}s</span>`;
      chips.append(label);
    }

    // Selects
    for (const [id, label] of Object.entries(GROUPS)) form.group.add(new Option(label, id));
    for (const region of REGIONS) form.region.add(new Option(region, region));

    form.max.max = MAX_LENGTH;

    // Timeline period bands
    for (const p of PERIODS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `band band--${p.id}`;
      button.dataset.period = p.id;
      button.innerHTML = `<span>${p.label}</span><small>${p.from}–${p.to} Ma</small>`;
      bands.append(button);
    }

    // Timeline dots: x by start of range, small row offset to avoid overlap.
    const start = 252;
    const span = 252 - 66;
    const used = [];
    for (const d of DINOS) {
      const x = ((start - d.from) / span) * 100;
      let row = 0;
      while (used.some((u) => u.row === row && Math.abs(u.x - x) < 1.2)) row++;
      used.push({ x, row });
      const dot = document.createElement("span");
      dot.className = `timeline__dot is-${d.period}`;
      dot.dataset.slug = d.slug;
      dot.style.setProperty("--x", `${x}%`);
      dot.style.setProperty("--row", Math.min(row, 2));
      dot.style.setProperty("--c", `var(--${d.period})`);
      dots.append(dot);
    }

    // Image credits in the footer
    const credits = $("[data-credits]");
    for (const d of [...DINOS].sort(SORTS.name)) {
      const li = document.createElement("li");
      const b = document.createElement("b");
      b.textContent = d.name;
      const link = document.createElement("a");
      link.href = d.image.source;
      link.textContent = d.image.license;
      link.rel = "noopener";
      li.append(b, `: ${d.image.author}, `, link);
      credits.append(li);
    }

    // Hero numbers
    $('[data-stat="count"]').textContent = DINOS.length;
    $('[data-stat="span"]').textContent = Math.max(...DINOS.map((d) => d.from)) - Math.min(...DINOS.map((d) => d.to));
    $('[data-stat="longest"]').textContent = MAX_LENGTH;
  }

  function syncControls() {
    form.q.value = state.q;
    form.group.value = state.group;
    form.region.value = state.region;
    form.sort.value = state.sort;
    form.max.value = state.max;
    for (const box of form.querySelectorAll('input[name="diet"]')) box.checked = state.diets.has(box.value);
    for (const band of bands.children) band.setAttribute("aria-pressed", String(state.periods.has(band.dataset.period)));
    form.maxOut.value = state.max >= MAX_LENGTH ? "any" : `${state.max} m`;
    form.max.style.setProperty("--fill", `${((state.max - 1) / (MAX_LENGTH - 1)) * 100}%`);
  }

  /* ---- Rendering --------------------------------------------------------- */

  let current = []; // the visible list, used by the dialog's prev/next

  function renderCards(list) {
    const items = list.map((d, i) => {
      const li = cardTemplate.content.firstElementChild.cloneNode(true);
      const period = periodOf(d.period);
      li.style.setProperty("--i", Math.min(i, 12));
      li.style.viewTransitionName = `dino-${d.slug}`;
      li.dataset.slug = d.slug;
      li.classList.add(`is-${d.period}`);

      const img = $("img", li);
      img.src = d.image.src;
      img.width = d.image.width;
      img.height = d.image.height;
      if (i < 4) img.loading = "eager"; // first row is above the fold

      $(".card__period", li).textContent = period.label;
      highlight($(".card__name", li), d.name);
      $(".card__meaning", li).textContent = `“${d.meaning}”`;

      const diet = $(".diet", li);
      diet.classList.add(`is-${d.diet}`);
      diet.textContent = d.diet;

      $('[data-f="length"]', li).textContent = d.length;
      $('[data-f="weight"]', li).textContent = formatWeight(d.weight);
      $('[data-f="age"]', li).textContent = formatAge(d);

      const button = $(".card__button", li);
      button.setAttribute("aria-label", `${d.name}, ${period.label}, ${d.diet}, ${d.length} metres. Open details`);
      button.addEventListener("click", () => openDetail(d.slug));
      return li;
    });
    grid.replaceChildren(...items);
  }

  function renderActive() {
    const pills = [];
    const add = (label, clear) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill";
      b.textContent = label;
      b.setAttribute("aria-label", `Remove filter: ${label}`);
      b.addEventListener("click", () => { clear(); update(); });
      pills.push(b);
    };
    if (state.q) add(`“${state.q}”`, () => (state.q = ""));
    for (const p of state.periods) add(periodOf(p).label, () => state.periods.delete(p));
    for (const d of state.diets) add(d, () => state.diets.delete(d));
    if (state.group) add(GROUPS[state.group], () => (state.group = ""));
    if (state.region) add(state.region, () => (state.region = ""));
    if (state.max < MAX_LENGTH) add(`≤ ${state.max} m`, () => (state.max = MAX_LENGTH));
    active.replaceChildren(...pills);
    for (const b of document.querySelectorAll("[data-reset]")) b.hidden = pills.length === 0 && b.type === "reset";
  }

  function render() {
    current = DINOS.filter(matches).sort(SORTS[state.sort]);
    const visible = new Set(current.map((d) => d.slug));

    renderCards(current);
    renderActive();
    syncControls();

    for (const dot of dots.children) dot.classList.toggle("is-out", !visible.has(dot.dataset.slug));
    empty.hidden = current.length > 0;
    count.textContent = current.length === DINOS.length
      ? `All ${DINOS.length} dinosaurs`
      : `${current.length} of ${DINOS.length} dinosaur${current.length === 1 ? "" : "s"}`;
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  /** Re-render; animate the reorder with View Transitions where supported. */
  function update() {
    writeUrl();
    if (document.startViewTransition && !reduceMotion.matches) {
      grid.classList.add("is-transitioning");
      document.startViewTransition(render).finished.finally(() => grid.classList.remove("is-transitioning"));
    } else {
      render();
    }
  }

  /* ---- Detail dialog ----------------------------------------------------- */

  let openSlug = null;

  function openDetail(slug) {
    const d = DINOS.find((x) => x.slug === slug);
    if (!d) return;
    openSlug = slug;
    const period = periodOf(d.period);
    const q = (name) => dialog.querySelector(`[data-d="${name}"]`);

    const img = q("img");
    img.src = d.image.src;
    img.width = d.image.width;
    img.height = d.image.height;
    img.alt = `${d.name}`;

    const credit = q("credit");
    const link = document.createElement("a");
    link.href = d.image.source;
    link.rel = "noopener";
    link.textContent = d.image.license;
    credit.replaceChildren(`Photo: ${d.image.author} · `, link);

    const tag = q("period");
    tag.className = `tag is-${d.period}`;
    tag.textContent = `${period.label} · ${formatAge(d)} million years ago`;

    q("name").textContent = d.name;
    q("meaning").textContent = `“${d.meaning}”`;
    q("text").textContent = d.text;

    const facts = [
      ["Length", `${d.length} m`],
      ["Weight", formatWeight(d.weight)],
      ["Diet", d.diet[0].toUpperCase() + d.diet.slice(1)],
      ["Group", GROUPS[d.group]],
      ["Found in", d.region],
      ["Named", d.named],
    ];
    q("facts").replaceChildren(...facts.map(([k, v]) => {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      div.append(dt, dd);
      return div;
    }));

    // Size bars on one shared scale.
    const scale = Math.max(d.length, HUMAN_HEIGHT);
    const bar = (label, metres, colour) => {
      const row = document.createElement("div");
      row.className = "bar";
      row.innerHTML = '<span></span><span class="bar__track"><span class="bar__fill"></span></span>';
      row.firstChild.textContent = `${label} · ${metres} m`;
      const fill = row.querySelector(".bar__fill");
      fill.style.setProperty("--w", `${(metres / scale) * 100}%`);
      if (colour) fill.style.setProperty("--c", colour);
      return row;
    };
    const ratio = d.length / HUMAN_HEIGHT;
    const note = document.createElement("p");
    note.className = "kicker";
    note.style.marginTop = "0.3rem";
    note.textContent = ratio >= 1
      ? `About ${ratio.toFixed(ratio < 10 ? 1 : 0)}× the height of a person, nose to tail`
      : `About ${Math.round(ratio * 100)}% of a person's height, nose to tail`;
    q("compare").replaceChildren(bar(d.name, d.length, `var(--${d.period})`), bar("Human", HUMAN_HEIGHT), note);

    if (!dialog.open) dialog.showModal();
  }

  function step(delta) {
    const list = current.length ? current : DINOS;
    const i = list.findIndex((d) => d.slug === openSlug);
    const next = list[(i + delta + list.length) % list.length];
    openDetail(next.slug);
  }

  dialog.addEventListener("click", (e) => {
    const stepper = e.target.closest("[data-step]");
    if (stepper) step(Number(stepper.dataset.step));
    else if (e.target === dialog) dialog.close(); // click on the backdrop
  });

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  dialog.addEventListener("close", () => {
    // Return focus to the card that opened the dialog.
    const card = grid.querySelector(`[data-slug="${openSlug}"] .card__button`);
    card?.focus({ preventScroll: true });
  });

  /* ---- Events ------------------------------------------------------------ */

  let typingTimer = 0;
  form.q.addEventListener("input", () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { state.q = form.q.value.trim(); update(); }, 160);
  });

  form.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "diet") t.checked ? state.diets.add(t.value) : state.diets.delete(t.value);
    if (t.name === "group") state.group = t.value;
    if (t.name === "region") state.region = t.value;
    if (t.name === "sort") state.sort = t.value;
    if (t.name !== "q" && t.name !== "max") update();
  });

  // The range updates live while dragging.
  form.max.addEventListener("input", () => { state.max = Number(form.max.value); update(); });

  form.addEventListener("submit", (e) => e.preventDefault());

  for (const b of document.querySelectorAll("[data-reset]")) {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      Object.assign(state, { q: "", group: "", region: "", max: MAX_LENGTH, sort: state.sort });
      state.periods.clear();
      state.diets.clear();
      update();
    });
  }

  bands.addEventListener("click", (e) => {
    const band = e.target.closest("[data-period]");
    if (!band) return;
    const id = band.dataset.period;
    state.periods.has(id) ? state.periods.delete(id) : state.periods.add(id);
    update();
    $("#catalogue").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  });

  // "/" focuses the search, like on many sites.
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !dialog.open && document.activeElement !== form.q) {
      e.preventDefault();
      form.q.focus();
    }
  });

  /* ---- Start ------------------------------------------------------------- */

  buildControls();
  readUrl();
  render();
})();
