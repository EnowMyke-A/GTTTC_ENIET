// marksUtils.ts

// Convert Supabase "numeric" (string) into a number safely
function parseNumeric(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : parseFloat(value);
}

/**
 * Compute average from two scores
 * - If one score missing, average = other score
 * - If both missing, return null
 */
export function computeAverage(
  score1: number | string | null,
  score2: number | string | null
): number | null {
  const s1 = parseNumeric(score1);
  const s2 = parseNumeric(score2);

  if (s1 === null && s2 === null) return null;
  if (s1 !== null && s2 === null) return s1;
  if (s1 === null && s2 !== null) return s2;

  return (s1! + s2!) / 2;
}

/**
 * Compute weighted score (average * coefficient)
 */
export function computeWeighted(
  average: number | null,
  coefficient: number | string
): number | null {
  if (average === null) return null;
  const coef = parseNumeric(coefficient);
  if (coef === null) return null;
  return average * coef;
}

/**
 * Get grade letter from average
 */
export function computeGrade(average: number | null): string | null {
  if (average === null) return null;

  if (average >= 18.5 && average <= 20) return "A";
  if (average >= 16.5 && average <= 18.4) return "B";
  if (average >= 15.5 && average <= 16.4) return "C";
  if (average >= 13.5 && average <= 15.4) return "D";
  if (average >= 12 && average <= 13.4) return "E";
  if (average < 12) return "F";

  return null; // safeguard in case of invalid input
}

/**
 * Get remark based on grade
 */
export function computeRemark(grade: string | null): string | null {
  if (grade === null) return null;

  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Fair";
    case "E":
      return "Pass";
    case "F":
      return "Fail";
    default:
      return null;
  }
}

/**
 * Full pipeline: scores -> all results
 */
export function evaluateScores(
  score1: number | string | null,
  score2: number | string | null,
  coefficient: number | string
) {
  const average = computeAverage(score1, score2);
  const weighted = computeWeighted(average, coefficient);
  const grade = computeGrade(average);
  const remark = computeRemark(grade);

  return { average, weighted, grade, remark };
}
