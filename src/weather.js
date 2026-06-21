// Geolocation + Open-Meteo → scene key.
// No API key required. Graceful fallbacks at every step.

export const SCENES = ['clear-day', 'clear-night', 'clouds', 'rain', 'snow', 'thunderstorm', 'fog'];

export const SCENE_META = {
  'clear-day': { label: 'Clear', icon: '☀️' },
  'clear-night': { label: 'Night', icon: '🌙' },
  clouds: { label: 'Clouds', icon: '☁️' },
  rain: { label: 'Rain', icon: '🌧️' },
  snow: { label: 'Snow', icon: '❄️' },
  thunderstorm: { label: 'Storm', icon: '⛈️' },
  fog: { label: 'Fog', icon: '🌫️' },
};

const DEFAULT_LOCATION = { lat: 32.0853, lon: 34.7818, name: 'Tel Aviv' }; // sensible fallback

// WMO weather code → scene key. is_day decides clear day vs night.
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
function codeToScene(code, isDay) {
  if (code === 0) return isDay ? 'clear-day' : 'clear-night';
  if (code === 1) return isDay ? 'clear-day' : 'clear-night'; // mainly clear
  if (code === 2) return 'clouds'; // partly cloudy
  if (code === 3) return 'clouds'; // overcast
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'rain'; // drizzle
  if (code >= 61 && code <= 67) return 'rain'; // rain
  if (code >= 71 && code <= 77) return 'snow'; // snow fall
  if (code >= 80 && code <= 82) return 'rain'; // rain showers
  if (code === 85 || code === 86) return 'snow'; // snow showers
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return isDay ? 'clear-day' : 'clear-night';
}

// WMO code → emoji for the forecast columns / readout. Day vs night only
// changes the clear-sky glyph.
export function iconForCode(code, isDay = true) {
  if (code === 0 || code === 1) return isDay ? '☀️' : '🌙';
  if (code === 2) return isDay ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code === 85 || code === 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return isDay ? '☀️' : '🌙';
}

export function describeCode(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Violent showers',
    85: 'Snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Storm w/ hail',
    99: 'Severe storm',
  };
  return map[code] ?? 'Unknown';
}

function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: null }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1`;
    // Open-Meteo's reverse endpoint is limited; fall back to a coord label on failure.
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error('geocode');
    const j = await r.json();
    const hit = j?.results?.[0];
    if (hit?.name) return hit.name + (hit.country_code ? `, ${hit.country_code}` : '');
  } catch (_) {
    /* ignore */
  }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

async function fetchForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=7`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('forecast http ' + r.status);
  return r.json();
}

// Build the 7-day column model from the Open-Meteo `daily` block.
function buildDaily(daily) {
  if (!daily?.time) return [];
  return daily.time.map((iso, i) => ({
    date: iso,
    // parse as local Y-M-D so the weekday label isn't shifted by timezone.
    label: new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    code: daily.weather_code?.[i],
    icon: iconForCode(daily.weather_code?.[i], true),
    hi: Math.round(daily.temperature_2m_max?.[i]),
    lo: Math.round(daily.temperature_2m_min?.[i]),
  }));
}

// Resolve current weather → { scene, temp, condition, place, wind, daily, ... }.
export async function resolveWeather() {
  const pos = await getPosition();
  const denied = !pos;
  const loc = pos ?? DEFAULT_LOCATION;

  try {
    const data = await fetchForecast(loc.lat, loc.lon);
    const cur = data.current;
    const isDay = cur.is_day === 1;
    const scene = codeToScene(cur.weather_code, isDay);
    const place = loc.name ?? (await reverseGeocode(loc.lat, loc.lon));
    return {
      scene,
      temp: Math.round(cur.temperature_2m),
      feels: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
      humidity: cur.relative_humidity_2m ?? null,
      wind: cur.wind_speed_10m,
      isDay,
      icon: iconForCode(cur.weather_code, isDay),
      condition: describeCode(cur.weather_code),
      place: denied ? `${place} (default)` : place,
      daily: buildDaily(data.daily),
      denied,
    };
  } catch (err) {
    // Network/forecast failure → never a blank screen.
    return {
      scene: 'clear-day',
      temp: null,
      feels: null,
      humidity: null,
      wind: 0,
      isDay: true,
      icon: '🌡️',
      condition: 'Weather unavailable',
      place: denied ? `${loc.name} (default)` : loc.name ?? 'Unknown',
      daily: [],
      denied,
      error: true,
    };
  }
}
