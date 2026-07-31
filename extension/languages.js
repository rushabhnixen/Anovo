/* Shared translation catalogue for Anovo extension surfaces. */
globalThis.ANOVO_LANGUAGES = [
  ["af", "Afrikaans"], ["sq", "Albanian"], ["am", "Amharic"],
  ["ar", "Arabic"], ["hy", "Armenian"], ["az", "Azerbaijani"],
  ["eu", "Basque"], ["be", "Belarusian"], ["bn", "Bengali"],
  ["bs", "Bosnian"], ["bg", "Bulgarian"], ["my", "Burmese"],
  ["ca", "Catalan"], ["zh", "Chinese"], ["hr", "Croatian"],
  ["cs", "Czech"], ["da", "Danish"], ["nl", "Dutch"],
  ["en", "English"], ["eo", "Esperanto"], ["et", "Estonian"],
  ["fil", "Filipino"], ["fi", "Finnish"], ["fr", "French"],
  ["gl", "Galician"], ["ka", "Georgian"], ["de", "German"],
  ["el", "Greek"], ["gu", "Gujarati"], ["he", "Hebrew"],
  ["hi", "Hindi"], ["hu", "Hungarian"], ["is", "Icelandic"],
  ["id", "Indonesian"], ["ga", "Irish"], ["it", "Italian"],
  ["ja", "Japanese"], ["kn", "Kannada"], ["kk", "Kazakh"],
  ["km", "Khmer"], ["ko", "Korean"], ["lo", "Lao"],
  ["lv", "Latvian"], ["lt", "Lithuanian"], ["mk", "Macedonian"],
  ["ms", "Malay"], ["ml", "Malayalam"], ["mt", "Maltese"],
  ["mr", "Marathi"], ["mn", "Mongolian"], ["ne", "Nepali"],
  ["nb", "Norwegian"], ["fa", "Persian"], ["pl", "Polish"],
  ["pt", "Portuguese"], ["pa", "Punjabi"], ["ro", "Romanian"],
  ["ru", "Russian"], ["sr", "Serbian"], ["sk", "Slovak"],
  ["sl", "Slovenian"], ["es", "Spanish"], ["sw", "Swahili"],
  ["sv", "Swedish"], ["ta", "Tamil"], ["te", "Telugu"],
  ["th", "Thai"], ["tr", "Turkish"], ["uk", "Ukrainian"],
  ["ur", "Urdu"], ["uz", "Uzbek"], ["vi", "Vietnamese"],
  ["cy", "Welsh"], ["yo", "Yoruba"], ["zu", "Zulu"],
];

globalThis.populateAnovoLanguages = function populateAnovoLanguages(select, selectedCode) {
  select.replaceChildren(...globalThis.ANOVO_LANGUAGES.map(([code, label]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = label;
    option.selected = code === selectedCode;
    return option;
  }));
};

