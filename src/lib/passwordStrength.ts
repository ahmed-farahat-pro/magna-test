export type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "weak" | "medium" | "strong";
  hint: string;
};

/**
 * Lightweight password-strength scoring for the signup meter. Rewards length and
 * character-class variety; caps obvious/common patterns at weak. Pure — safe on
 * client and server.
 */
export function passwordStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(pw),
  ).length;
  if (classes >= 2) score++;
  if (classes >= 3) score++;

  // Obvious/common patterns can never rate above weak.
  if (
    pw.length < 8 ||
    /^(.)\1+$/.test(pw) ||
    /^(password|12345678|qwerty123|letmein|welcome1|iloveyou)/i.test(pw)
  ) {
    score = Math.min(score, 1);
  }

  const s = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  const label = s <= 1 ? "weak" : s <= 2 ? "medium" : "strong";
  const hint =
    label === "weak"
      ? "Use 8+ characters and mix upper/lowercase, numbers, or symbols."
      : label === "medium"
        ? "Add more length or another character type for a strong password."
        : "Strong password.";
  return { score: s, label, hint };
}
