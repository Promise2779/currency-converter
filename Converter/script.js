// Bitcoin + fiat converter (BTC, USD, EUR, NGN)
// Uses one CoinGecko call: price of 1 BTC in USD, EUR and NGN.
// Every other pair is derived from those numbers.

const API_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,ngn";
const REFRESH_MS = 60_000;
const CACHE_KEY = "btc-converter-rates";

const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const swapBtn = document.getElementById("swap");
const refreshBtn = document.getElementById("refresh");
const resultEl = document.getElementById("result");
const rateEl = document.getElementById("rate");
const statusEl = document.getElementById("status");

// rates[X] = how many X you get for 1 BTC
let rates = null;
let updatedAt = null;

// ---------- Formatting ----------
function formatMoney(value, currency) {
  if (currency === "BTC") {
    return (
      value.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " BTC"
    );
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

// ---------- Conversion ----------
function convert(amount, from, to) {
  // go through BTC as the common base
  return (amount / rates[from]) * rates[to];
}

function render() {
  if (!rates) return;

  const amount = parseFloat(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;

  if (isNaN(amount) || amount < 0) {
    resultEl.textContent = "—";
    rateEl.textContent = "Enter a valid amount";
    return;
  }

  resultEl.textContent = formatMoney(convert(amount, from, to), to);
  rateEl.textContent = `1 ${from} = ${formatMoney(convert(1, from, to), to)}`;
}

// ---------- Rates ----------
function setRates(data, time) {
  rates = {
    BTC: 1,
    USD: data.bitcoin.usd,
    EUR: data.bitcoin.eur,
    NGN: data.bitcoin.ngn,
  };
  updatedAt = time;
}

function saveCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, time: Date.now() })
    );
  } catch (e) {
    /* storage may be unavailable; ignore */
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function fetchRates() {
  statusEl.className = "";
  statusEl.textContent = "Updating…";
  refreshBtn.disabled = true;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.bitcoin) throw new Error("Unexpected response");

    setRates(data, Date.now());
    saveCache(data);
    statusEl.textContent = `Updated ${new Date(updatedAt).toLocaleTimeString()}`;
  } catch (err) {
    // Fall back to the last saved rates if we have them
    const cached = loadCache();
    if (cached) {
      setRates(cached.data, cached.time);
      statusEl.className = "error";
      statusEl.textContent = `Offline. Showing rates from ${new Date(
        cached.time
      ).toLocaleTimeString()}`;
    } else {
      statusEl.className = "error";
      statusEl.textContent = "Could not load rates. Try Refresh.";
    }
  } finally {
    refreshBtn.disabled = false;
    render();
  }
}

// ---------- Events ----------
amountEl.addEventListener("input", render);
fromEl.addEventListener("change", render);
toEl.addEventListener("change", render);

swapBtn.addEventListener("click", () => {
  [fromEl.value, toEl.value] = [toEl.value, fromEl.value];
  render();
});

refreshBtn.addEventListener("click", fetchRates);

// ---------- Start ----------
fetchRates();
setInterval(fetchRates, REFRESH_MS);
