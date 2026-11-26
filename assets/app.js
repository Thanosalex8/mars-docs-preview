/* M.A.R.S. Wiki — αναζήτηση, περιεχόμενα σελίδας, cookies/analytics */
(function () {
  var P = (window.MARS && window.MARS.prefix) || "";
  var DATA = window.MARS_SEARCH || [];

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ");
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function mark(text, words) {
    var out = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      var n = norm(text), i = n.indexOf(w);
      if (i >= 0) out = esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + w.length)) + "</mark>" + esc(text.slice(i + w.length));
    });
    return out;
  }

  // ---------- Αναζήτηση ----------
  function search(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return DATA.map(function (d) {
      var t = norm(d.t), score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (d.x.indexOf(w) < 0) return null;
        score += (t.indexOf(w) >= 0 ? 10 : 0) + (norm(d.d).indexOf(w) >= 0 ? 3 : 0) + 1;
      }
      var phrase = words.join(" ");
      if (words.length > 1 && d.x.indexOf(phrase) >= 0) score += 25;  // όλη η φράση μαζί
      return {d: d, score: score, words: words};
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 12);
  }

  var input = document.getElementById("q"), box = document.getElementById("results"), sel = -1;
  function show(q) {
    var res = search(q);
    sel = -1;
    if (!q.trim()) { box.classList.remove("show"); return; }
    box.innerHTML = res.length ? res.map(function (r) {
      return '<a href="' + P + r.d.u + '"><div class="r-sec">' + esc(r.d.s) + '</div><div class="r-title">' +
        mark(r.d.t, r.words) + '</div><div class="r-desc">' + mark(r.d.d, r.words) + "</div></a>";
    }).join("") : '<div class="empty">Δεν βρέθηκε άρθρο για «' + esc(q) + '». Δοκιμάστε άλλη λέξη.</div>';
    box.classList.add("show");
  }
  if (input) {
    input.addEventListener("input", function () { show(input.value); });
    input.addEventListener("keydown", function (e) {
      var items = box.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(items.length, 1);
        items.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      } else if (e.key === "Enter" && items.length) {
        location.href = items[Math.max(sel, 0)].getAttribute("href");
      } else if (e.key === "Escape") { box.classList.remove("show"); input.blur(); }
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".search")) box.classList.remove("show"); });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); input.select(); }
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); input.focus(); }
    });
  }
  var q2 = document.getElementById("q2");
  if (q2 && input) {
    q2.addEventListener("input", function () { input.value = q2.value; show(q2.value); window.scrollTo({top: 0}); });
    q2.addEventListener("focus", function () { input.focus(); input.value = q2.value; });
  }

  // ---------- «Σε αυτή τη σελίδα» ----------
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var heads = tocLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id); });
        }
      });
    }, {rootMargin: "-64px 0px -70% 0px"});
    heads.forEach(function (h) { if (h) io.observe(h); });
  }

  // Κλείσιμο μενού στο κινητό μετά από επιλογή
  document.querySelectorAll(".sidebar a").forEach(function (a) {
    a.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  });

  // ---------- «Σας βοήθησε;» ----------
  document.querySelectorAll(".helpful .btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var wrap = b.parentNode;
      wrap.classList.add("done");
      wrap.textContent = "Ευχαριστούμε για την απάντηση!";
      if (window.gtag) window.gtag("event", "article_feedback", {helpful: b.getAttribute("data-h"), page_path: location.pathname});
    });
  });

  // ---------- Cookies και Google Analytics 4 (φορτώνει μόνο με συγκατάθεση) ----------
  var GA = (window.MARS && window.MARS.ga) || "";
  var KEY = "mars-consent";
  function loadGA() {
    if (!GA || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted"});
    window.gtag("js", new Date());
    window.gtag("config", GA, {anonymize_ip: true});
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA);
    document.head.appendChild(s);
  }
  var banner = document.getElementById("consent");
  window.MARSConsent = {
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} if (banner && GA) banner.hidden = false; }
  };
  if (GA && banner) {
    var c = null;
    try { c = localStorage.getItem(KEY); } catch (e) {}
    if (c === "yes") loadGA();
    else if (c !== "no") banner.hidden = false;
    banner.querySelectorAll("[data-c]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-c");
        try { localStorage.setItem(KEY, v); } catch (e) {}
        banner.hidden = true;
        if (v === "yes") loadGA();
      });
    });
  }
})();

/* Μεγέθυνση εικόνων με κλικ */
(function () {
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Μεγέθυνση εικόνας");
  box.innerHTML = '<button class="lb-close" aria-label="Κλείσιμο">✕</button><img alt=""><div class="lb-cap"></div>';
  document.body.appendChild(box);
  function close() { box.classList.remove("open"); document.body.style.overflow = ""; }
  box.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  document.querySelectorAll("figure.shot img").forEach(function (img) {
    img.setAttribute("title", "Πατήστε για μεγέθυνση");
    img.addEventListener("click", function () {
      box.querySelector("img").src = img.src;
      box.querySelector("img").alt = img.alt;
      var cap = img.parentNode.querySelector("figcaption");
      box.querySelector(".lb-cap").textContent = cap ? cap.textContent : "";
      box.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  });
})();
