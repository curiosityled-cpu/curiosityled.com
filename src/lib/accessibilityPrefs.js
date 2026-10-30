/**
 * Learner accessibility preferences, kept on the device: they describe how this person
 * wants media presented, not who they are, so they never travel to the server.
 */

const KEY = "cl_a11y_prefs";

export const A11Y_DEFAULTS = {
  captionsDefault: false,
  largeCaptions: false,
};

export function getA11yPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...A11Y_DEFAULTS, ...stored };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function setA11yPref(key, value) {
  const next = { ...getA11yPrefs(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A private window can refuse storage — the preference then lasts this session only.
  }
  return next;
}