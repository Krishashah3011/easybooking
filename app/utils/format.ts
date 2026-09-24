export function formatDateDisplayML(dateStrML: string): string {
  const matchML = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStrML);
  if (!matchML) return dateStrML;
  const [, yearML, monthML, dayML] = matchML;
  return `${dayML}-${monthML}-${yearML}`;
}

export function to12HourML(timeML: string): string {
  const matchML = /^(\d{1,2}):(\d{2})$/.exec(timeML);
  if (!matchML) return timeML;
  let hourML = Number(matchML[1]);
  const minuteML = matchML[2];
  const periodML = hourML >= 12 ? "PM" : "AM";
  hourML = hourML % 12;
  if (hourML === 0) hourML = 12;
  return `${hourML}:${minuteML} ${periodML}`;
}

export function formatTimeRangeDisplayML(startML: string, endML: string): string {
  return `${to12HourML(startML)} \u2013 ${to12HourML(endML)}`;
}

export function bookingSourceLabelML(sourceML: string): string {
  return sourceML === "ADMIN_MANUAL" ? "by admin" : "by customer";
}