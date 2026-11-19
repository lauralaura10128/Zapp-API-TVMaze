import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "zapp.html");
const html = fs.readFileSync(FILE, "utf8");

/* --- fixtures shaped exactly like the live API --- */
const show = (id, name, extra = {}) => ({
  id, name, url: `https://www.tvmaze.com/shows/${id}/x`,
  language: "German", genres: ["Drama", "Thriller"], status: "Running",
  runtime: 50, averageRuntime: 50, premiered: "2022-02-18", ended: null,
  officialSite: "https://example.com", network: { name: "ARD" }, webChannel: null,
  image: { medium: "https://static.tvmaze.com/m.jpg", original: "https://static.tvmaze.com/o.jpg" },
  rating: { average: 8.7 }, externals: { imdb: "tt11280740" },
  summary: "<p>A <b>mysterious</b> office.</p>", ...extra
});
const ep = (id, season, number, name, extra = {}) => ({
  id, name, season, number, type: "regular", airdate: "2026-01-0" + number,
  airtime: "21:00", runtime: 50, rating: { average: 8.1 },
  summary: "<p>Episode body.</p>", ...extra
});
const listing = (epId, airtime, s) => ({ ...ep(epId, 1, 1, "Folge " + epId), airtime, show: s });

/* Germany: one morning entry with the highest rating (must NOT reach the
   evening picks), plus five evening entries across four channels. */
const deSchedule = [
  listing(901, "09:00", show(10, "Morgenmagazin", { rating: { average: 9.5 }, network: { name: "ARD" } })),
  listing(902, "19:00", show(11, "Heute", { rating: { average: 7.0 }, network: { name: "ZDF" } })),
  listing(903, "20:15", show(12, "Tatort", { rating: { average: 7.8 }, network: { name: "ARD" } })),
  listing(904, "20:15", show(13, "Der Alte", { rating: { average: 6.5 }, network: { name: "ZDF" } })),
  listing(905, "21:00", show(1, "Severance", { rating: { average: 8.7 }, network: { name: "Sky" } })),
  listing(906, "21:45", show(14, "Show C", { rating: { average: 8.9 }, network: { name: "RTL" } }))
];

const routes = {
  "/shows?page=0": Array.from({ length: 240 }, (_, i) => show(1000 + i, "Index A" + i, { weight: i, language: i % 2 ? "English" : "German", rating: { average: 5 + (i % 5) }, genres: i % 3 ? ["Drama"] : ["Comedy"], image: i % 7 ? { medium: "https://static.tvmaze.com/m.jpg" } : null })),
  "/shows?page=1": Array.from({ length: 240 }, (_, i) => show(2000 + i, "Index B" + i, { weight: 500 + i, premiered: "2001-01-01" })),
  "/shows?page=2": Array.from({ length: 12 }, (_, i) => show(3000 + i, "Zzz Last" + i, { weight: 999 })),
  "/shows?page=3": [],
  "/schedule?country=US&date=TODAY": deSchedule,
  "/schedule?country=FR&date=TODAY": [],
  "/schedule/full": [
    { ...ep(970, 3, 1, "Wolfsland"), airtime: null, airdate: "TODAY",
      _embedded: { show: show(30, "Wolfsland", { network: { name: "Das Erste", country: { code: "DE" } }, rating: { average: 7.2 } }) } },
    { ...ep(971, 1, 2, "MaiThink X"), airtime: "22:15", airdate: "TODAY",
      _embedded: { show: show(31, "MaiThink X", { network: { name: "ZDFneo", country: { code: "DE" } }, rating: { average: 8.4 } }) } },
    { ...ep(980, 1, 1, "Dup of the broadcast feed"), airtime: "19:05", airdate: "TODAY",
      _embedded: { show: show(40, "Alles was zählt", { network: { name: "RTL", country: { code: "DE" } } }) } },
    { ...ep(972, 1, 1, "US only"), airtime: "23:30", airdate: "TODAY",
      _embedded: { show: show(32, "Late US Thing", { network: { name: "NBC", country: { code: "US" } } }) } }
  ],
  "/schedule?country=DE&date=TODAY": [
    { ...listing(980, "19:05", show(40, "Alles was zählt", { network: { name: "RTL", country: { code: "DE" } }, rating: { average: 5.5 } })) }
  ],
  "/schedule/web?country=DE&date=TODAY": [
    { ...ep(981, 1, 1, "Joyn Thing"), airtime: "20:15",
      _embedded: { show: show(41, "Joyn Original", { network: null, webChannel: { name: "Joyn", country: { code: "DE" } }, rating: { average: 6.8 } }) } }
  ],
  "/schedule/web?country=US&date=TODAY": [
    { ...ep(950, 2, 3, "Hulu Night"), airtime: "22:30", _embedded: { show: show(20, "Stream Local", { network: null, webChannel: { name: "Hulu" }, rating: { average: 7.5 } }) } }
  ],
  "/schedule/web?country=&date=TODAY": [
    { ...ep(951, 1, 1, "Global Drop"), airtime: "20:00", _embedded: { show: show(21, "Stream Global", { network: null, webChannel: { name: "Netflix" }, rating: { average: 6.0 } }) } },
    { ...listing(906, "21:45", show(14, "Show C", { rating: { average: 8.9 }, network: { name: "RTL" } })) }
  ],
  "/schedule/web?date=TODAY": [
    { ...ep(201, 3, 2, "Web Only"), airtime: "09:00", _embedded: { show: show(9, "Puppy Dog Pals", { network: null, webChannel: { name: "Disney+" } }) } }
  ],
  "/search/shows?q=many": Array.from({ length: 10 }, (_, i) => ({ score: 1, show: show(500 + i, "Match " + i) })),
  "/search/shows?q=severance": [
    { score: 0.9, show: show(1, "Severance", { network: { name: "Apple TV+" } }) },
    { score: 0.5, show: show(2, "Severance Package", { genres: ["Comedy"], rating: { average: 6.1 }, premiered: "2019-03-01", network: { name: "Apple TV+" } }) }
  ],
  "/shows/1?embed[]=seasons": show(1, "Severance", {
    _embedded: { seasons: [{ id: 1, number: 1, premiereDate: "2022-02-18", endDate: "2022-04-08" }, { id: 2, number: 2, premiereDate: "2026-01-17", endDate: null }] }
  }),
  "/shows/1/episodes": [ep(11, 1, 1, "Good News"), ep(12, 1, 2, "Half Loop"), ep(21, 2, 1, "Hello Ms Cobel"), ep(22, 2, 2, "Goodbye")],
  "/shows/1/cast": [
    { person: { id: 5, name: "Adam Scott" }, character: { id: 6, name: "Mark Scout" }, voice: false },
    { person: { id: 7, name: "Britt Lower" }, character: { id: 8, name: "Helly R." }, voice: false }
  ],
  "/shows/1?embed[]=nextepisode": show(1, "Severance", {
    _embedded: { nextepisode: { id: 99, season: 2, number: 5, name: "Next", airdate: isoIn(3) } }
  })
};
function isoIn(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayIso = isoIn(0);
const calls = [];

function build(seed) {
  return new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true,
    url: "https://local.test/zapp.html",
    beforeParse(win) {
      if (seed) seed(win);
      win.fetch = (url) => {
        const path = String(url).replace("https://api.tvmaze.com", "");
        calls.push(path);
        let body = routes[path.replace(todayIso, "TODAY")];
        if (path === "/schedule/full") body = body.map(e => ({ ...e, airdate: todayIso }));
        if (body === undefined) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
      };
      win.navigator.clipboard = { writeText: () => Promise.resolve() };
    }
  });
}
const dom = build();
const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const clickEl = el => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const setSel = (id, v) => { $(id).value = v; $(id).dispatchEvent(new window.Event("change")); };
async function waitFor(fn, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await tick(100); }
  return false;
}

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail ? "  → " + detail : "")); }
}
const errors = [];
window.addEventListener("error", e => errors.push(e.message));
window.console.error = (...a) => { errors.push(a.join(" ")); };

await tick(150);

console.log("\n[1] identity + Germany default");
check("page title is Zapp", doc.title.startsWith("Zapp"), doc.title);
check("logo wordmark reads Zapp", $(".logo .wordmark").textContent === "Zapp", $(".logo .wordmark")?.textContent);
check("logo mark is an inline SVG", $(".logo svg.mark") !== null);
check("mark has screen, antennae, bolt and gradient", [".logo svg.mark rect", ".logo svg.mark circle", ".logo svg.mark .bolt", ".logo svg.mark linearGradient#zgrad"].every(s => $(s) !== null));
check("mark is labelled for screen readers", $(".logo svg.mark").getAttribute("role") === "img" && $(".logo svg.mark").getAttribute("aria-label") === "Zapp");
check("gradient stops are themed, not hardcoded", $(".logo svg.mark .s1") !== null && $(".logo svg.mark .s2") !== null);
check("favicon is the logo", ($('link[rel="icon"]')?.getAttribute("href") || "").startsWith("data:image/svg+xml,"), ($('link[rel="icon"]')?.getAttribute("href") || "").slice(0, 28));
check("no emoji left in the logo", !/[\u{1F300}-\u{1FAFF}⚡]/u.test($(".logo").innerHTML), $(".logo").textContent.trim());
check("country defaults to the US", $("#country").value === "US", $("#country").value);
check("US is first in the list", $$("#country option")[0].value === "US", $$("#country option")[0].value);
check("first request is the US schedule", calls[0] === `/schedule?country=US&date=${todayIso}`, calls[0]);
check("no uncaught errors on boot", errors.length === 0, errors.join(" | "));
check("greeting instead of a bare date", /Good (morning|afternoon|evening)/.test($("#todayTitle").textContent), $("#todayTitle").textContent);
check("defaults to the evening window", $("#window").value === "evening", $("#window").value);
check("sub line counts the evening and the day", /5 programmes tonight/.test($("#todaySub").textContent) && /6 across the whole day/.test($("#todaySub").textContent), $("#todaySub").textContent);
check("streaming is not folded in by default", !/incl. streaming/.test($("#todaySub").textContent), $("#todaySub").textContent);
check("no streaming endpoints called for tonight", !calls.some(c => c.startsWith("/schedule/web?country=US")), calls.filter(c => c.startsWith("/schedule/web")).join(" "));

console.log("\n[2] top picks block");
check("block rendered", $(".tonight") !== null);
check("heading says top picks tonight in the US", /Top picks tonight in United States/.test($(".tonight .secthead").textContent), $(".tonight .secthead")?.textContent.trim());
check("hero is the top-rated evening show", $(".tnhero h3").textContent === "Show C", $(".tnhero h3")?.textContent);
check("hero shows rank badge", $(".tnhero .rank").textContent.includes("#1"), $(".tnhero .rank")?.textContent);
check("hero shows rating, time and channel", /8\.9/.test($(".tnhero").textContent) && /21:45/.test($(".tnhero").textContent) && /RTL/.test($(".tnhero").textContent), $(".tnhero .chips")?.textContent);
check("exactly 4 runners-up", $$(".tncard").length === 4, String($$(".tncard").length));
check("runners-up ranked by rating", $$(".tncard .tt").map(e => e.textContent).join("|") === "Severance|Tatort|Heute|Der Alte", $$(".tncard .tt").map(e => e.textContent).join("|"));
check("runners-up numbered 2..5", $$(".tncard .n").map(e => e.textContent).join("") === "2345", $$(".tncard .n").map(e => e.textContent).join(""));
check("higher-rated MORNING show excluded from picks", !$(".tonight").textContent.includes("Morgenmagazin"));
check("morning show is outside the evening window", !$("#todayBody").textContent.includes("Morgenmagazin"));
check("hero opens the show (hitbox carries the id)", $(".tnhero .hitbox").dataset.showId === "14", $(".tnhero .hitbox")?.dataset.showId);
check("hero has its own follow star", $(".tnhero [data-star]") !== null);

console.log("\n[3] full schedule list (whole day)");
setSel("#window", "all"); await tick();
check("six broadcast rows rendered", $$("#todayBody .row").length === 6, String($$("#todayBody .row").length));
check("no streaming rows present", !/stream/.test($("#todayBody").textContent) && !$("#todayBody").textContent.includes("Stream Local"));
check("24h times, earliest first", $$("#todayBody .slot h3")[0].textContent.trim() === "09:00", $$("#todayBody .slot h3").map(h => h.textContent.trim()).join("/"));
check("two 20:15 listings share one slot", $$("#todayBody .slot")[2].querySelectorAll(".row").length === 2, String($$("#todayBody .slot")[2]?.querySelectorAll(".row").length));
check("schedule section header counts listings", /Full schedule/.test($("#schedHead").textContent), $("#schedHead").textContent.trim());
check("whole day includes the morning show", $("#todayBody").textContent.includes("Morgenmagazin"));
setSel("#window", "evening"); await tick();

console.log("\n[4] channel filter");
const chOpts = $$("#channel option").map(o => o.value);
check("channel list is broadcast only, sorted", chOpts.join(",") === ",ARD,RTL,Sky,ZDF", chOpts.join(","));
setSel("#channel", "RTL"); await tick();
check("RTL narrows to 1 row", $$("#todayBody .row").length === 1, String($$("#todayBody .row").length));
check("picks block follows the filter", $(".tnhero h3").textContent === "Show C" && $$(".tncard").length === 0, `${$(".tnhero h3")?.textContent} +${$$(".tncard").length}`);
check("sub line reports the channel", /on RTL/.test($("#todaySub").textContent), $("#todaySub").textContent);
setSel("#channel", "ARD"); await tick();
check("switching channel re-filters", $$("#todayBody .row").length === 1, String($$("#todayBody .row").length));
check("ARD picks exclude the morning show", $(".tnhero h3").textContent === "Tatort", $(".tnhero h3")?.textContent);
setSel("#channel", ""); await tick();
check("clearing restores the evening rows", $$("#todayBody .row").length === 5, String($$("#todayBody .row").length));

console.log("\n[5] web schedule still uses _embedded.show");
setSel("#country", ""); await tick(90);
check("web endpoint called", calls.some(c => c.startsWith("/schedule/web")), "");
setSel("#window", "all"); await tick();
check("show read from _embedded.show", $("#todayBody").textContent.includes("Puppy Dog Pals"));
setSel("#window", "evening"); await tick();
check("webChannel used when network is null", $$("#channel option").map(o => o.value).includes("Disney+"), $$("#channel option").map(o => o.value).join(","));
check("country is not persisted at all", window.localStorage.getItem("zapp.country") === null, String(window.localStorage.getItem("zapp.country")));
setSel("#country", "US"); await tick(90);

console.log("\n[6] search: twin fields, filters");
check("hero search field present", $("#view-search .hsearch #q2") !== null);
$("#q2").value = "severance"; $("#q2").dispatchEvent(new window.Event("input"));
await tick(460);
check("hero field runs the search", $$("#searchBody .card").length === 2, String($$("#searchBody .card").length));
check("header field mirrors it", $("#q").value === "severance", $("#q").value);
$("#q").value = "sever"; $("#q").dispatchEvent(new window.Event("input"));
await tick(60);
check("hero field mirrors the header", $("#q2").value === "sever", $("#q2").value);
$("#q").value = ""; $("#q").dispatchEvent(new window.Event("input"));
await tick(60);
check("empty query shows suggestion chips", $$("#searchBody [data-suggest]").length > 0);
clickEl($("#searchBody [data-suggest]"));
await tick(120);
check("chip fills both fields", $("#q").value === $("#q2").value && $("#q").value.length > 0, `${$("#q").value}/${$("#q2").value}`);
$("#q2").value = "severance"; $("#q2").dispatchEvent(new window.Event("input"));
await tick(460);
check("search channel list built from results", $$("#network option").map(o => o.value).includes("Apple TV+"), $$("#network option").map(o => o.value).join(","));
setSel("#network", "Apple TV+"); await tick();
check("channel filter applies", $$("#searchBody .card").length === 2, String($$("#searchBody .card").length));
setSel("#genre", "Comedy"); await tick();
check("genre + channel stack", $$("#searchBody .card").length === 1 && /in Comedy on Apple TV\+/.test($("#searchSub").textContent), $("#searchSub").textContent);
setSel("#genre", ""); setSel("#network", ""); await tick();
setSel("#sort", "rating"); await tick();
check("sort by rating", $("#searchBody .cname").textContent === "Severance", $("#searchBody .cname").textContent);
check("summary HTML stripped, not injected", !$("#searchBody").innerHTML.includes("<b>mysterious"));

console.log("\n[7] my shows");
clickEl($("#searchBody [data-star]"));
await tick();
check("star turns on", $("#searchBody [data-star]").classList.contains("on"));
check("badge shows 1", $("#wlCount").textContent === "1" && !$("#wlCount").hidden, $("#wlCount").textContent);
check("persisted under the zapp key", JSON.parse(window.localStorage.getItem("zapp.watchlist"))["1"]?.name === "Severance");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "watchlist"));
await tick(140);
check("row rendered", $$("#wlBody .wrow").length === 1, String($$("#wlBody .wrow").length));
check("nextepisode embed fetched", calls.includes("/shows/1?embed[]=nextepisode"));
check("countdown rendered", /in 3 days/.test($("#wlBody .cd")?.textContent || ""), $("#wlBody .next")?.textContent);
check("next episode code shown", $("#wlBody .next").textContent.includes("S02E05"));

console.log("\n[8] detail sheet");
clickEl($("#wlBody [data-show-id]"));
await tick(150);
check("sheet opened", !$("#scrim").hasAttribute("hidden"));
check("title in hero", $("#sheet h2").textContent === "Severance", $("#sheet h2")?.textContent);
check("rating score", $("#sheet .score b").textContent === "8.7");
check("summary plain-texted", $("#sheet .summary").textContent.includes("A mysterious office."));
check("imdb link from externals", $('#sheet a[href*="imdb.com/title/tt11280740"]') !== null);
check("season defaults to the latest", $("#seasonSel").value === "2", $("#seasonSel")?.value);
check("only that season's episodes", $$("#sheet .ep").length === 2, String($$("#sheet .ep").length));
clickEl($("#sheet [data-seen]")); await tick();
check("marking watched updates progress", $("#sheet .prog .lbl").textContent.startsWith("1 / 2"), $("#sheet .prog .lbl")?.textContent);
check("watched persisted under the zapp key", (JSON.parse(window.localStorage.getItem("zapp.watched"))["1"] || []).length === 1);
clickEl($("#markSeason")); await tick();
check("mark-season fills the bar", $("#sheet .prog .fill").style.width === "100%", $("#sheet .prog .fill")?.style.width);
$("#seasonSel").value = "1"; $("#seasonSel").dispatchEvent(new window.Event("change", { bubbles: true }));
await tick();
check("season switch re-renders", $("#sheet .prog .lbl").textContent.startsWith("0 / 2"), $("#sheet .prog .lbl")?.textContent);
clickEl($("#sheet [data-expand]")); await tick(20);
check("episode expands", $("#sheet .ep").classList.contains("open"));
clickEl($('#sheet [data-tab="cast"]')); await tick();
check("cast tab renders", $$("#sheet .person").length === 2, String($$("#sheet .person").length));
check("initials avatars, no remote headshots", $("#sheet .av").textContent === "AS" && !$("#sheet .cast").innerHTML.includes("<img"));
check("follow button reflects state", $("#followBtn").textContent.includes("In my shows"), $("#followBtn")?.textContent.trim());
clickEl($("#followBtn")); await tick();
check("sheet button unfollows", $("#wlCount").hidden && $("#followBtn").textContent.includes("Add to my shows"));
clickEl($("#followBtn")); await tick();
check("sheet button re-follows", $("#wlCount").textContent === "1");
doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await tick();
check("Escape closes", $("#scrim").hasAttribute("hidden"));

console.log("\n[9] my-shows filter + dates + cache");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "today"));
clickEl($("#dToday"));
await tick(110);
$("#onlyFollowed").checked = true; $("#onlyFollowed").dispatchEvent(new window.Event("change"));
await tick();
check("my-shows filter keeps the followed listing", $$("#todayBody .row").length === 1 && $("#todayBody .rtitle").textContent === "Severance", $("#todayBody .rtitle")?.textContent);
check("sub line mentions my shows", /from my shows/.test($("#todaySub").textContent), $("#todaySub").textContent);
check("picks block falls back to that one show", $(".tnhero h3").textContent === "Severance", $(".tnhero h3")?.textContent);
setSel("#channel", "ARD"); await tick();
check("impossible combo → filter-aware empty state", $("#todayBody").textContent.includes("Nothing matches those filters"), $("#todayBody").textContent.slice(0, 70).trim());
check("picks block hidden when nothing qualifies", $("#tonightBlock").innerHTML === "", $("#tonightBlock").innerHTML.slice(0, 40));
setSel("#channel", ""); $("#onlyFollowed").checked = false; $("#onlyFollowed").dispatchEvent(new window.Event("change"));
await tick();
const before = calls.length;
clickEl($("#dNext")); await tick(80);
check("day stepping refetches", calls.length > before && calls[calls.length - 1].includes("date="), calls[calls.length - 1]);
check("unknown day shows an empty state", $("#todayBody").textContent.includes("No listings"), $("#todayBody").textContent.slice(0, 60).trim());
clickEl($("#dToday")); await tick(80);
check("returning to today is served from cache", $$("#todayBody .row").length === 5 && /cached/.test($("#meter").textContent), $("#meter").textContent);

console.log("\n[10] theme toggle");
check("starts dark", doc.documentElement.dataset.theme === "dark", doc.documentElement.dataset.theme);
clickEl($("#themeBtn")); await tick();
check("switches to light", doc.documentElement.dataset.theme === "light");
check("button shows the moon", $("#themeBtn").textContent === "☾", $("#themeBtn").textContent);
check("choice persisted", JSON.parse(window.localStorage.getItem("zapp.theme")) === "light");
clickEl($("#themeBtn")); await tick();
check("switches back to dark", doc.documentElement.dataset.theme === "dark");

console.log("\n[11] honest notes about API limits");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "today"));
clickEl($("#dToday")); await tick(110);
check("no thin-coverage note for the US", $("#schedHead .note") === null, $("#schedHead .note")?.textContent.trim().slice(0, 50));
setSel("#country", "FR"); await tick(90);
check("thin-coverage note appears for France", $("#schedHead .note") !== null);
check("note judges broadcast coverage, not global streaming", /lists nothing on France channels/.test($("#schedHead .note").textContent.replace(/\s+/g, " ")), $("#schedHead .note")?.textContent.replace(/\s+/g, " ").trim().slice(0, 90));
check("note offers a one-click way out", $('[data-setcountry="US"]') !== null && $('[data-setcountry=""]') !== null);
clickEl($('[data-setcountry="US"]')); await tick(100);
check("clicking it switches back to the US", $("#country").value === "US" && $$("#todayBody .row").length === 5, `${$("#country").value}/${$$("#todayBody .row").length}`);

$("#q2").value = "many";
$("#q2").dispatchEvent(new window.Event("input"));
check("10 results render", await waitFor(() => $$("#searchBody .card").length === 10), String($$("#searchBody .card").length));
check("search-cap note shown when the cap is hit", $("#searchBody .note") !== null);
check("cap note names the limit", /at most 10 matches/.test(($("#searchBody .note")?.textContent || "").replace(/\s+/g, " ")), ($("#searchBody .note")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70));
$("#q2").value = "severance"; $("#q2").dispatchEvent(new window.Event("input"));
check("no cap note when under the cap", await waitFor(() => $("#searchBody .note") === null && $$("#searchBody .card").length === 2), String($$("#searchBody .card").length));

console.log("\n[12] browse everything: paging, virtual window, filters, index");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "browse"));
check("browse view shown", !$("#view-browse").hasAttribute("hidden"));
check("first page arrives (behind the rate limiter)", await waitFor(() => $$("#browseGrid .vcard").length > 0), $("#browseBar").textContent.trim().slice(0, 40));
check("first page of 240 loaded", /Loaded 240 of 91,242/.test($("#browseBar").textContent.replace(/\s+/g, " ")), $("#browseBar").textContent.replace(/\s+/g, " ").trim().slice(0, 60));
const domCards = $$("#browseGrid .vcard").length;
check("virtual window renders a fraction of the list", domCards > 0 && domCards < 80, `${domCards} of 240 in the DOM`);
check("spacer reserves the full scroll height", parseInt($("#browseGrid .vspacer").style.height) > 2000, $("#browseGrid .vspacer").style.height);
check("cards are absolutely positioned by transform", /translate\(/.test($("#browseGrid .vcard").style.transform), $("#browseGrid .vcard").style.transform);
check("cards open the show and can be starred", $("#browseGrid .vcard [data-show-id]") !== null && $("#browseGrid .vcard [data-star]") !== null);

clickEl($("[data-loadmore]"));
await waitFor(() => /Loaded 480/.test($("#browseBar").textContent.replace(/\s+/g, " ")));
check("load more appends the next page", /Loaded 480 of/.test($("#browseBar").textContent.replace(/\s+/g, " ")), $("#browseBar").textContent.replace(/\s+/g, " ").trim().slice(0, 40));
check("sub line counts loaded shows", /480 shows loaded so far/.test($("#browseSub").textContent), $("#browseSub").textContent);

$("#bq").value = "Index B7"; $("#bq").dispatchEvent(new window.Event("input"));
await tick(220);
check("title filter narrows the list", /11 matches of 480 loaded/.test($("#browseSub").textContent), $("#browseSub").textContent);
$("#bq").value = ""; $("#bq").dispatchEvent(new window.Event("input"));
await tick(220);
setSel("#blang", "German"); await tick();
check("language filter works", /360 matches of 480 loaded/.test($("#browseSub").textContent), $("#browseSub").textContent);
setSel("#blang", ""); setSel("#bmin", "9"); await tick();
check("min-rating filter works", /48 matches of 480 loaded/.test($("#browseSub").textContent), $("#browseSub").textContent);
setSel("#bmin", "0"); await tick();
$("#bq").value = "nothingmatchesthis"; $("#bq").dispatchEvent(new window.Event("input"));
await tick(220);
check("empty result shows a message, not a blank grid", $("#browseGrid .empty") !== null && /0 matches of 480 loaded/.test($("#browseSub").textContent), $("#browseSub").textContent);
$("#bq").value = ""; $("#bq").dispatchEvent(new window.Event("input"));
await tick(220);
$("#bposter").checked = true; $("#bposter").dispatchEvent(new window.Event("change"));
await tick();
check("with-poster filter drops the imageless ones", /445 matches of 480 loaded/.test($("#browseSub").textContent), $("#browseSub").textContent);
$("#bposter").checked = false; $("#bposter").dispatchEvent(new window.Event("change"));
await tick();
setSel("#bsort", "name"); await tick();
check("A–Z sort puts Index A0 first", $("#browseGrid .cname").textContent === "Index A0", $("#browseGrid .cname")?.textContent);
setSel("#bsort", "popular"); await tick();
check("popularity sort puts the heaviest first", $("#browseGrid .cname").textContent.startsWith("Index B239"), $("#browseGrid .cname")?.textContent);
check("genre list built from loaded shows", $$("#bgenre option").map(o => o.value).includes("Comedy"), $$("#bgenre option").map(o => o.value).join(","));

const callsBefore = calls.filter(c => c.startsWith("/shows?page=")).length;
clickEl($("[data-sync]"));
check("progress bar appears while indexing", await waitFor(() => /Indexing/.test($("#browseBar").textContent)));
check("progress bar can be stopped", $("[data-stopsync]") !== null);
const finished = await waitFor(() => /Full index/.test($("#browseBar").textContent));
check("index finishes (real rate limiter, so this waits)", finished, $("#browseBar").textContent.replace(/\s+/g, " ").trim().slice(0, 60));
check("full index walked every page until empty", calls.filter(c => c === "/shows?page=3").length >= 1, calls.filter(c => c.startsWith("/shows?page=")).join(" "));
check("index holds every show from all pages", /Full index: 492 shows/.test($("#browseBar").textContent.replace(/\s+/g, " ")), $("#browseBar").textContent.replace(/\s+/g, " ").trim().slice(0, 70));
check("indexed sub line says it covers everything", /All 492 shows in TVmaze/.test($("#browseSub").textContent), $("#browseSub").textContent);
check("index sync bypassed the request cache", calls.filter(c => c === "/shows?page=0").length > callsBefore - 1, String(calls.filter(c => c === "/shows?page=0").length));
check("no load-more button once exhausted", $("[data-loadmore]") === null);
check("IndexedDB absence is handled, not fatal", /rebuilding next visit|Full index/.test($("#browseBar").textContent));

console.log("\n[13] tonight window: everything on this evening");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "today"));
clickEl($("#dToday")); await tick(120);
setSel("#window", "evening"); await tick();
check("evening lists every broadcast programme from 18:00", $$("#todayBody .row").length === 5, String($$("#todayBody .row").length));
check("earliest evening slot is 19:00", $$("#todayBody .slot h3")[0].textContent.trim() === "19:00", $$("#todayBody .slot h3").map(h => h.textContent.trim()).join("/"));
check("header names the window and country", /Everything tonight in United States/.test($("#schedHead").textContent), $("#schedHead").textContent.replace(/\s+/g, " ").trim().slice(0, 60));
check("header count matches the rows", /Everything tonight in United States\s*5/.test($("#schedHead").textContent.replace(/\s+/g, " ")), $("#schedHead").textContent.replace(/\s+/g, " ").trim().slice(0, 60));
check("whole-day escape hatch offered with its count", $('[data-setwindow="all"]') !== null && /Whole day \(6\)/.test($("#schedHead").textContent), $("#schedHead").textContent.replace(/\s+/g, " ").trim().slice(-20));
setSel("#window", "prime"); await tick();
check("prime time keeps only 20:00–23:00", $$("#todayBody .row").length === 4, String($$("#todayBody .row").length));
check("prime-time picks label themselves", /Top picks in prime time/.test($(".tonight .secthead").textContent), $(".tonight .secthead")?.textContent.trim().slice(0, 40));
check("picks say how many they ranked", /best \d of \d rated/.test($(".tonight .secthead").textContent), $(".tonight .secthead")?.textContent.trim());
clickEl($('[data-setwindow="all"]')); await tick();
check("whole-day button opens the window", $("#window").value === "all" && $$("#todayBody .row").length === 6, `${$("#window").value}/${$$("#todayBody .row").length}`);
setSel("#window", "evening"); await tick();
$("#incWeb").checked = true; $("#incWeb").dispatchEvent(new window.Event("change"));
await waitFor(() => $$("#todayBody .row").length === 7);
check("opting into streaming merges it in", $$("#todayBody .row").length === 7, String($$("#todayBody .row").length));
check("opted-in rows are tagged as streams", /stream/.test($("#todayBody").textContent));
check("sub line then mentions streaming", /incl. streaming/.test($("#todaySub").textContent), $("#todaySub").textContent);
$("#incWeb").checked = false; $("#incWeb").dispatchEvent(new window.Event("change"));
await waitFor(() => $$("#todayBody .row").length === 5);
check("turning it off again returns to broadcast only", $$("#todayBody .row").length === 5, String($$("#todayBody .row").length));

console.log("\n[14] deep check: every source, for another country");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "today"));
clickEl($("#dToday")); await tick(140);
check("deep check is off for the US by default", !$("#deep").checked);
setSel("#country", "DE");
check("picking another country turns the deep check on", $("#deep").checked);
check("schedule settles", await waitFor(() => /All sources checked for Germany/.test($("#schedHead").textContent)), $("#schedHead").textContent.replace(/\s+/g, " ").trim().slice(0, 80));
check("complete schedule was fetched", calls.includes("/schedule/full"));
const srcTxt = $("#schedHead").textContent.replace(/\s+/g, " ");
check("sources note counts the broadcast endpoint", /1 on Germany channels/.test(srcTxt), srcTxt.slice(0, 110));
check("sources note says streaming was excluded", /streaming excluded/.test(srcTxt), srcTxt.slice(0, 200));
check("no streaming endpoint hit for Germany", !calls.some(c => c.startsWith("/schedule/web?country=DE")), calls.filter(c => c.startsWith("/schedule/web")).join(" "));
check("sources note reports what only the full schedule had", /2 found only in the complete schedule/.test(srcTxt), srcTxt.slice(0, 190));
setSel("#window", "all"); await tick(120);
check("TBA-airtime German show is now listed", $("#todayBody").textContent.includes("Wolfsland"));
check("TBA show sits in its own slot", /Time to be announced/.test($("#todayBody").textContent));
check("full-schedule German show with a time is listed", $("#todayBody").textContent.includes("MaiThink X"));
check("a US-only full-schedule entry is NOT pulled into Germany", !$("#todayBody").textContent.includes("Late US Thing"));
check("episode already in the country feed is not duplicated", $$("#todayBody .rtitle").filter(e => e.textContent === "Alles was zählt").length === 1, String($$("#todayBody .rtitle").filter(e => e.textContent === "Alles was zählt").length));
check("German picks now rank the full-schedule find", /MaiThink X/.test($(".tonight").textContent), $(".tnhero h3")?.textContent);
const fullCalls = calls.filter(c => c === "/schedule/full").length;
clickEl($("#dPrev")); await tick(200);
clickEl($("#dToday")); await waitFor(() => /All sources checked/.test($("#schedHead").textContent));
check("the 11 MB fetch is reused, not repeated", calls.filter(c => c === "/schedule/full").length === fullCalls, String(calls.filter(c => c === "/schedule/full").length));
$("#deep").checked = false; $("#deep").dispatchEvent(new window.Event("change"));
await waitFor(() => !/All sources checked/.test($("#schedHead").textContent));
check("turning the deep check off drops those extras", !$("#todayBody").textContent.includes("Wolfsland"));
setSel("#country", "US"); await tick(160);
setSel("#window", "evening"); await tick(120);

console.log("\n[15] browse search hits the API");
clickEl([...$$("#nav button")].find(b => b.dataset.view === "browse"));
await tick(200);
$("#bq").value = "severance";
$("#bq").dispatchEvent(new window.Event("input"));
await waitFor(() => /straight from the TVmaze search API/.test($("#browseNote").textContent));
check("API search was called from browse", calls.includes("/search/shows?q=severance"));
check("API hits appear even though nothing local matches", $$("#browseGrid .vcard").length === 2, String($$("#browseGrid .vcard").length));
check("results are the API's", $("#browseGrid .cname").textContent.startsWith("Severance"), $("#browseGrid .cname")?.textContent);
check("note says where they came from", /straight from the TVmaze search API/.test($("#browseNote").textContent), $("#browseNote").textContent.replace(/\s+/g, " ").trim().slice(0, 70));
check("note warns about the 10 cap", /at most 10/.test($("#browseNote").textContent));
check("sub line credits the API", /pulled from the API/.test($("#browseSub").textContent), $("#browseSub").textContent);
check("API results open and star like any other card", $("#browseGrid .vcard [data-show-id]") !== null && $("#browseGrid .vcard [data-star]") !== null);
$("#bq").value = "qqqqzzz";
$("#bq").dispatchEvent(new window.Event("input"));
await waitFor(() => /found nothing/.test($("#browseNote").textContent));
check("a miss is reported honestly", /found nothing/.test($("#browseNote").textContent), $("#browseNote").textContent.replace(/\s+/g, " ").trim().slice(0, 60));
$("#bq").value = "Index A1";
$("#bq").dispatchEvent(new window.Event("input"));
await waitFor(() => /11 matches/.test($("#browseSub").textContent));
check("local matches still work without API help", $("#browseSub").textContent.includes("matches") && !/pulled from the API/.test($("#browseSub").textContent), $("#browseSub").textContent);
$("#bq").value = ""; $("#bq").dispatchEvent(new window.Event("input"));
await waitFor(() => $("#browseNote").innerHTML === "");
check("clearing the box clears the note", $("#browseNote").innerHTML === "", $("#browseNote").innerHTML.slice(0, 40));

console.log("\n[16] '/' shortcut + no stray errors");
doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "/", bubbles: true }));
await tick();
check("'/' jumps to search", !$("#view-search").hasAttribute("hidden"));
check("no uncaught errors across the run", errors.length === 0, errors.slice(0, 3).join(" | "));

console.log("\n[17] migration from the old name (fresh page)");
const dom2 = build(win => {
  win.localStorage.setItem("tvmaze.watchlist", JSON.stringify({ "1": { id: 1, name: "Severance" } }));
  win.localStorage.setItem("tvmaze.watched", JSON.stringify({ "1": [11, 12] }));
  win.localStorage.setItem("zapp.country", JSON.stringify("DE"));
});
await tick(150);
const w2 = dom2.window;
check("old watchlist carried over", JSON.parse(w2.localStorage.getItem("zapp.watchlist"))["1"]?.name === "Severance");
check("old watched episodes carried over", JSON.parse(w2.localStorage.getItem("zapp.watched"))["1"].length === 2);
check("migrated count shows in the nav badge", w2.document.getElementById("wlCount").textContent === "1", w2.document.getElementById("wlCount").textContent);
check("old keys left untouched", w2.localStorage.getItem("tvmaze.watchlist") !== null);
check("a stored country never overrides the US default", w2.document.getElementById("country").value === "US", w2.document.getElementById("country").value);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
