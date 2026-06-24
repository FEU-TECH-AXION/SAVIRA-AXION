// web/frontend/src/utils/birthdayValidation.js

/**
 * Validates a birthday date string (YYYY-MM-DD).
 * Returns null if valid, or an error message string if invalid.
 */
export function validateBirthday(dateString) {
  if (!dateString) return "Birthday is required.";

  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based
  const day = parseInt(dayStr, 10);

  // Basic structure check
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return "Invalid date format.";
  }

  // ── Leap year validation ──────────────────────────────────────────────────
  const isLeapYear = (y) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  const daysInMonth = [0, 31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month < 1 || month > 12) return "Invalid month.";
  if (day < 1 || day > daysInMonth[month]) {
    return month === 2 && day === 29
      ? `${year} is not a leap year. February 29 does not exist.`
      : "Invalid day for the selected month.";
  }

  // ── Age bounds ────────────────────────────────────────────────────────────
  const today = new Date();
  const birth = new Date(year, month - 1, day);

  // Exact age in years
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age--;

  const MIN_AGE = 13;
  const MAX_AGE = 125; // 120–130 window; 125 is a reasonable ceiling

  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old.`;
  if (age > MAX_AGE) return `Please enter a valid birth year (maximum ${MAX_AGE} years ago).`;

  return null; // valid
}