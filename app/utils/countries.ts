// Country → timezone data for the "pick a country" location UX.
//
// Most countries observe a single timezone, so picking the country is
// enough to pick the timezone. A handful of countries span multiple
// zones (US, Canada, Russia, Australia, Brazil, Mexico) — those list
// more than one zone, and the admin UI shows a second "Timezone"
// dropdown (labelled by region/city) only when the selected country
// has more than one.
//
// This only feeds the admin form — the underlying BookingLocation
// record still just stores a plain IANA timezone string, exactly as
// before, so nothing downstream (storefront slot computation) needs
// to change.

export type CountryTimezone = {
  tz: string;
  // Region/city label shown in the secondary dropdown for multi-zone
  // countries, e.g. "Eastern (New York)".
  label: string;
};

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  timezones: CountryTimezone[];
};

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", timezones: [
    { tz: "America/New_York", label: "Eastern (New York)" },
    { tz: "America/Chicago", label: "Central (Chicago)" },
    { tz: "America/Denver", label: "Mountain (Denver)" },
    { tz: "America/Phoenix", label: "Mountain, no DST (Phoenix)" },
    { tz: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
    { tz: "America/Anchorage", label: "Alaska (Anchorage)" },
    { tz: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  ] },
  { code: "CA", name: "Canada", timezones: [
    { tz: "America/St_Johns", label: "Newfoundland (St. John's)" },
    { tz: "America/Halifax", label: "Atlantic (Halifax)" },
    { tz: "America/Toronto", label: "Eastern (Toronto)" },
    { tz: "America/Winnipeg", label: "Central (Winnipeg)" },
    { tz: "America/Edmonton", label: "Mountain (Edmonton)" },
    { tz: "America/Vancouver", label: "Pacific (Vancouver)" },
  ] },
  { code: "MX", name: "Mexico", timezones: [
    { tz: "America/Mexico_City", label: "Central (Mexico City)" },
    { tz: "America/Tijuana", label: "Pacific (Tijuana)" },
    { tz: "America/Chihuahua", label: "Mountain (Chihuahua)" },
    { tz: "America/Cancun", label: "Eastern (Cancún)" },
  ] },
  { code: "BR", name: "Brazil", timezones: [
    { tz: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
    { tz: "America/Manaus", label: "Amazon (Manaus)" },
    { tz: "America/Rio_Branco", label: "Acre (Rio Branco)" },
    { tz: "America/Noronha", label: "Fernando de Noronha" },
  ] },
  { code: "RU", name: "Russia", timezones: [
    { tz: "Europe/Kaliningrad", label: "Kaliningrad" },
    { tz: "Europe/Moscow", label: "Moscow" },
    { tz: "Europe/Samara", label: "Samara" },
    { tz: "Asia/Yekaterinburg", label: "Yekaterinburg" },
    { tz: "Asia/Omsk", label: "Omsk" },
    { tz: "Asia/Krasnoyarsk", label: "Krasnoyarsk" },
    { tz: "Asia/Irkutsk", label: "Irkutsk" },
    { tz: "Asia/Yakutsk", label: "Yakutsk" },
    { tz: "Asia/Vladivostok", label: "Vladivostok" },
    { tz: "Asia/Magadan", label: "Magadan" },
    { tz: "Asia/Kamchatka", label: "Kamchatka" },
  ] },
  { code: "AU", name: "Australia", timezones: [
    { tz: "Australia/Perth", label: "Western (Perth)" },
    { tz: "Australia/Adelaide", label: "Central (Adelaide)" },
    { tz: "Australia/Darwin", label: "Central, no DST (Darwin)" },
    { tz: "Australia/Brisbane", label: "Eastern, no DST (Brisbane)" },
    { tz: "Australia/Sydney", label: "Eastern (Sydney)" },
    { tz: "Australia/Lord_Howe", label: "Lord Howe Island" },
  ] },
  { code: "ID", name: "Indonesia", timezones: [
    { tz: "Asia/Jakarta", label: "Western (Jakarta)" },
    { tz: "Asia/Makassar", label: "Central (Makassar)" },
    { tz: "Asia/Jayapura", label: "Eastern (Jayapura)" },
  ] },
  { code: "KZ", name: "Kazakhstan", timezones: [
    { tz: "Asia/Almaty", label: "Almaty" },
    { tz: "Asia/Aqtobe", label: "Aqtobe" },
  ] },
  { code: "CD", name: "DR Congo", timezones: [
    { tz: "Africa/Kinshasa", label: "Kinshasa" },
    { tz: "Africa/Lubumbashi", label: "Lubumbashi" },
  ] },
  { code: "MN", name: "Mongolia", timezones: [
    { tz: "Asia/Ulaanbaatar", label: "Ulaanbaatar" },
    { tz: "Asia/Hovd", label: "Hovd" },
  ] },
  { code: "CL", name: "Chile", timezones: [
    { tz: "America/Santiago", label: "Santiago" },
    { tz: "Pacific/Easter", label: "Easter Island" },
  ] },
  { code: "EC", name: "Ecuador", timezones: [
    { tz: "America/Guayaquil", label: "Mainland (Guayaquil)" },
    { tz: "Pacific/Galapagos", label: "Galápagos" },
  ] },
  { code: "ES", name: "Spain", timezones: [
    { tz: "Europe/Madrid", label: "Mainland (Madrid)" },
    { tz: "Atlantic/Canary", label: "Canary Islands" },
  ] },
  { code: "PT", name: "Portugal", timezones: [
    { tz: "Europe/Lisbon", label: "Mainland (Lisbon)" },
    { tz: "Atlantic/Azores", label: "Azores" },
  ] },
  { code: "FR", name: "France", timezones: [
    { tz: "Europe/Paris", label: "Metropolitan France" },
  ] },
  { code: "GB", name: "United Kingdom", timezones: [{ tz: "Europe/London", label: "London" }] },
  { code: "IE", name: "Ireland", timezones: [{ tz: "Europe/Dublin", label: "Dublin" }] },
  { code: "DE", name: "Germany", timezones: [{ tz: "Europe/Berlin", label: "Berlin" }] },
  { code: "IT", name: "Italy", timezones: [{ tz: "Europe/Rome", label: "Rome" }] },
  { code: "NL", name: "Netherlands", timezones: [{ tz: "Europe/Amsterdam", label: "Amsterdam" }] },
  { code: "BE", name: "Belgium", timezones: [{ tz: "Europe/Brussels", label: "Brussels" }] },
  { code: "CH", name: "Switzerland", timezones: [{ tz: "Europe/Zurich", label: "Zurich" }] },
  { code: "AT", name: "Austria", timezones: [{ tz: "Europe/Vienna", label: "Vienna" }] },
  { code: "SE", name: "Sweden", timezones: [{ tz: "Europe/Stockholm", label: "Stockholm" }] },
  { code: "NO", name: "Norway", timezones: [{ tz: "Europe/Oslo", label: "Oslo" }] },
  { code: "DK", name: "Denmark", timezones: [{ tz: "Europe/Copenhagen", label: "Copenhagen" }] },
  { code: "FI", name: "Finland", timezones: [{ tz: "Europe/Helsinki", label: "Helsinki" }] },
  { code: "PL", name: "Poland", timezones: [{ tz: "Europe/Warsaw", label: "Warsaw" }] },
  { code: "CZ", name: "Czechia", timezones: [{ tz: "Europe/Prague", label: "Prague" }] },
  { code: "SK", name: "Slovakia", timezones: [{ tz: "Europe/Bratislava", label: "Bratislava" }] },
  { code: "HU", name: "Hungary", timezones: [{ tz: "Europe/Budapest", label: "Budapest" }] },
  { code: "RO", name: "Romania", timezones: [{ tz: "Europe/Bucharest", label: "Bucharest" }] },
  { code: "BG", name: "Bulgaria", timezones: [{ tz: "Europe/Sofia", label: "Sofia" }] },
  { code: "GR", name: "Greece", timezones: [{ tz: "Europe/Athens", label: "Athens" }] },
  { code: "HR", name: "Croatia", timezones: [{ tz: "Europe/Zagreb", label: "Zagreb" }] },
  { code: "RS", name: "Serbia", timezones: [{ tz: "Europe/Belgrade", label: "Belgrade" }] },
  { code: "UA", name: "Ukraine", timezones: [{ tz: "Europe/Kyiv", label: "Kyiv" }] },
  { code: "BY", name: "Belarus", timezones: [{ tz: "Europe/Minsk", label: "Minsk" }] },
  { code: "LT", name: "Lithuania", timezones: [{ tz: "Europe/Vilnius", label: "Vilnius" }] },
  { code: "LV", name: "Latvia", timezones: [{ tz: "Europe/Riga", label: "Riga" }] },
  { code: "EE", name: "Estonia", timezones: [{ tz: "Europe/Tallinn", label: "Tallinn" }] },
  { code: "IS", name: "Iceland", timezones: [{ tz: "Atlantic/Reykjavik", label: "Reykjavik" }] },
  { code: "TR", name: "Turkey", timezones: [{ tz: "Europe/Istanbul", label: "Istanbul" }] },
  { code: "EG", name: "Egypt", timezones: [{ tz: "Africa/Cairo", label: "Cairo" }] },
  { code: "ZA", name: "South Africa", timezones: [{ tz: "Africa/Johannesburg", label: "Johannesburg" }] },
  { code: "NG", name: "Nigeria", timezones: [{ tz: "Africa/Lagos", label: "Lagos" }] },
  { code: "KE", name: "Kenya", timezones: [{ tz: "Africa/Nairobi", label: "Nairobi" }] },
  { code: "MA", name: "Morocco", timezones: [{ tz: "Africa/Casablanca", label: "Casablanca" }] },
  { code: "GH", name: "Ghana", timezones: [{ tz: "Africa/Accra", label: "Accra" }] },
  { code: "ET", name: "Ethiopia", timezones: [{ tz: "Africa/Addis_Ababa", label: "Addis Ababa" }] },
  { code: "TZ", name: "Tanzania", timezones: [{ tz: "Africa/Dar_es_Salaam", label: "Dar es Salaam" }] },
  { code: "DZ", name: "Algeria", timezones: [{ tz: "Africa/Algiers", label: "Algiers" }] },
  { code: "TN", name: "Tunisia", timezones: [{ tz: "Africa/Tunis", label: "Tunis" }] },
  { code: "IL", name: "Israel", timezones: [{ tz: "Asia/Jerusalem", label: "Jerusalem" }] },
  { code: "AE", name: "United Arab Emirates", timezones: [{ tz: "Asia/Dubai", label: "Dubai" }] },
  { code: "SA", name: "Saudi Arabia", timezones: [{ tz: "Asia/Riyadh", label: "Riyadh" }] },
  { code: "QA", name: "Qatar", timezones: [{ tz: "Asia/Qatar", label: "Doha" }] },
  { code: "KW", name: "Kuwait", timezones: [{ tz: "Asia/Kuwait", label: "Kuwait City" }] },
  { code: "JO", name: "Jordan", timezones: [{ tz: "Asia/Amman", label: "Amman" }] },
  { code: "LB", name: "Lebanon", timezones: [{ tz: "Asia/Beirut", label: "Beirut" }] },
  { code: "IQ", name: "Iraq", timezones: [{ tz: "Asia/Baghdad", label: "Baghdad" }] },
  { code: "IR", name: "Iran", timezones: [{ tz: "Asia/Tehran", label: "Tehran" }] },
  { code: "PK", name: "Pakistan", timezones: [{ tz: "Asia/Karachi", label: "Karachi" }] },
  { code: "IN", name: "India", timezones: [{ tz: "Asia/Kolkata", label: "India" }] },
  { code: "NP", name: "Nepal", timezones: [{ tz: "Asia/Kathmandu", label: "Kathmandu" }] },
  { code: "BD", name: "Bangladesh", timezones: [{ tz: "Asia/Dhaka", label: "Dhaka" }] },
  { code: "LK", name: "Sri Lanka", timezones: [{ tz: "Asia/Colombo", label: "Colombo" }] },
  { code: "MM", name: "Myanmar", timezones: [{ tz: "Asia/Yangon", label: "Yangon" }] },
  { code: "TH", name: "Thailand", timezones: [{ tz: "Asia/Bangkok", label: "Bangkok" }] },
  { code: "VN", name: "Vietnam", timezones: [{ tz: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City" }] },
  { code: "KH", name: "Cambodia", timezones: [{ tz: "Asia/Phnom_Penh", label: "Phnom Penh" }] },
  { code: "LA", name: "Laos", timezones: [{ tz: "Asia/Vientiane", label: "Vientiane" }] },
  { code: "MY", name: "Malaysia", timezones: [{ tz: "Asia/Kuala_Lumpur", label: "Kuala Lumpur" }] },
  { code: "SG", name: "Singapore", timezones: [{ tz: "Asia/Singapore", label: "Singapore" }] },
  { code: "PH", name: "Philippines", timezones: [{ tz: "Asia/Manila", label: "Manila" }] },
  { code: "HK", name: "Hong Kong", timezones: [{ tz: "Asia/Hong_Kong", label: "Hong Kong" }] },
  { code: "TW", name: "Taiwan", timezones: [{ tz: "Asia/Taipei", label: "Taipei" }] },
  { code: "CN", name: "China", timezones: [{ tz: "Asia/Shanghai", label: "China" }] },
  { code: "JP", name: "Japan", timezones: [{ tz: "Asia/Tokyo", label: "Tokyo" }] },
  { code: "KR", name: "South Korea", timezones: [{ tz: "Asia/Seoul", label: "Seoul" }] },
  { code: "KP", name: "North Korea", timezones: [{ tz: "Asia/Pyongyang", label: "Pyongyang" }] },
  { code: "UZ", name: "Uzbekistan", timezones: [{ tz: "Asia/Tashkent", label: "Tashkent" }] },
  { code: "AF", name: "Afghanistan", timezones: [{ tz: "Asia/Kabul", label: "Kabul" }] },
  { code: "GE", name: "Georgia", timezones: [{ tz: "Asia/Tbilisi", label: "Tbilisi" }] },
  { code: "AM", name: "Armenia", timezones: [{ tz: "Asia/Yerevan", label: "Yerevan" }] },
  { code: "AZ", name: "Azerbaijan", timezones: [{ tz: "Asia/Baku", label: "Baku" }] },
  { code: "NZ", name: "New Zealand", timezones: [{ tz: "Pacific/Auckland", label: "Auckland" }] },
  { code: "FJ", name: "Fiji", timezones: [{ tz: "Pacific/Fiji", label: "Fiji" }] },
  { code: "PG", name: "Papua New Guinea", timezones: [{ tz: "Pacific/Port_Moresby", label: "Port Moresby" }] },
  { code: "AR", name: "Argentina", timezones: [{ tz: "America/Argentina/Buenos_Aires", label: "Buenos Aires" }] },
  { code: "CO", name: "Colombia", timezones: [{ tz: "America/Bogota", label: "Bogotá" }] },
  { code: "PE", name: "Peru", timezones: [{ tz: "America/Lima", label: "Lima" }] },
  { code: "VE", name: "Venezuela", timezones: [{ tz: "America/Caracas", label: "Caracas" }] },
  { code: "UY", name: "Uruguay", timezones: [{ tz: "America/Montevideo", label: "Montevideo" }] },
  { code: "PY", name: "Paraguay", timezones: [{ tz: "America/Asuncion", label: "Asunción" }] },
  { code: "BO", name: "Bolivia", timezones: [{ tz: "America/La_Paz", label: "La Paz" }] },
  { code: "PA", name: "Panama", timezones: [{ tz: "America/Panama", label: "Panama City" }] },
  { code: "CR", name: "Costa Rica", timezones: [{ tz: "America/Costa_Rica", label: "San José" }] },
  { code: "GT", name: "Guatemala", timezones: [{ tz: "America/Guatemala", label: "Guatemala City" }] },
  { code: "HN", name: "Honduras", timezones: [{ tz: "America/Tegucigalpa", label: "Tegucigalpa" }] },
  { code: "SV", name: "El Salvador", timezones: [{ tz: "America/El_Salvador", label: "San Salvador" }] },
  { code: "NI", name: "Nicaragua", timezones: [{ tz: "America/Managua", label: "Managua" }] },
  { code: "DO", name: "Dominican Republic", timezones: [{ tz: "America/Santo_Domingo", label: "Santo Domingo" }] },
  { code: "CU", name: "Cuba", timezones: [{ tz: "America/Havana", label: "Havana" }] },
  { code: "JM", name: "Jamaica", timezones: [{ tz: "America/Jamaica", label: "Kingston" }] },
  { code: "TT", name: "Trinidad and Tobago", timezones: [{ tz: "America/Port_of_Spain", label: "Port of Spain" }] },
  { code: "PR", name: "Puerto Rico", timezones: [{ tz: "America/Puerto_Rico", label: "San Juan" }] },
];

export function findCountryByTimezone(tz: string): Country | null {
  return (
    COUNTRIES.find((c) => c.timezones.some((z) => z.tz === tz)) ?? null
  );
}
