import { Question } from "./types";

export interface CheckAnswerResult {
  correct: boolean;
  status: "correct" | "incorrect" | "invalid";
  normalized?: string;
  message?: string;
}

export function parseNumberInput(input: string): { value: number; normalized: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A comma is NOT a decimal point
  if (trimmed.includes(",")) {
    return null;
  }

  // Handle trailing %
  let working = trimmed;
  let hasPercent = false;
  if (working.endsWith("%")) {
    hasPercent = true;
    working = working.slice(0, -1).trim();
  }

  // Handle fraction "a/b"
  if (working.includes("/")) {
    const parts = working.split("/");
    if (parts.length !== 2) return null;
    const numStr = parts[0].trim();
    const denStr = parts[1].trim();
    if (!/^[-+]?\d+$/.test(numStr) || !/^[-+]?\d+$/.test(denStr)) return null;
    const num = Number(numStr);
    const den = Number(denStr);
    if (den === 0 || Number.isNaN(num) || Number.isNaN(den)) return null;
    const val = num / den;
    return {
      value: val,
      normalized: hasPercent ? `${val}%` : `${numStr}/${denStr}`,
    };
  }

  // Standard float / integer
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(working)) {
    return null;
  }

  const parsed = Number(working);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }

  return {
    value: parsed,
    normalized: hasPercent ? `${parsed}%` : String(parsed),
  };
}

export function parseSequenceTokens(input: string): string[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Replace delimiters with standard space delimiter
  const tokens = trimmed
    .replace(/->/g, " ")
    .replace(/>/g, " ")
    .replace(/,/g, " ")
    .replace(/;/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.length > 0 ? tokens : null;
}

export function checkAnswer(question: Question, userInput: string): CheckAnswerResult {
  const raw = userInput.trim();
  if (!raw) {
    return {
      correct: false,
      status: "invalid",
      message: "Please enter an answer.",
    };
  }

  switch (question.answerType) {
    case "number": {
      const parsed = parseNumberInput(raw);
      if (!parsed) {
        return {
          correct: false,
          status: "invalid",
          message: "Please enter a valid number or fraction (e.g. 5.75 or 23/4).",
        };
      }

      const expected = Number(question.expected);
      const isIntegerExpected = Number.isInteger(expected);

      let isCorrect = false;
      if (isIntegerExpected) {
        isCorrect = Math.abs(parsed.value - expected) < 1e-9;
      } else {
        const tol = 0.01;
        isCorrect = Math.abs(parsed.value - expected) <= tol + 1e-9;
      }

      if (isCorrect) {
        return {
          correct: true,
          status: "correct",
          normalized: parsed.normalized,
          message: "Correct!",
        };
      }

      // Check common mistakes
      if (question.commonMistakes && question.commonMistakes.length > 0) {
        for (const mistake of question.commonMistakes) {
          const mVal = Number(mistake.value);
          const match = Number.isInteger(mVal)
            ? Math.abs(parsed.value - mVal) < 1e-9
            : Math.abs(parsed.value - mVal) <= 0.01 + 1e-9;
          if (match) {
            return {
              correct: false,
              status: "incorrect",
              normalized: parsed.normalized,
              message: mistake.message,
            };
          }
        }
      }

      return {
        correct: false,
        status: "incorrect",
        normalized: parsed.normalized,
        message: "Not quite. Check your calculations and try again.",
      };
    }

    case "choice": {
      const normalizedInput = raw.toLowerCase();
      const expectedId = String(question.expected).trim().toLowerCase();
      const isMatch = normalizedInput === expectedId;

      if (isMatch) {
        return {
          correct: true,
          status: "correct",
          normalized: raw,
          message: "Correct!",
        };
      }

      return {
        correct: false,
        status: "incorrect",
        normalized: raw,
        message: "Not quite. Review the choices and try again.",
      };
    }

    case "sequence": {
      const tokens = parseSequenceTokens(raw);
      if (!tokens) {
        return {
          correct: false,
          status: "invalid",
          message: "Please enter a valid sequence (e.g. P1, P2, P3 or P1 -> P2 -> P3).",
        };
      }

      const expectedArray = Array.isArray(question.expected)
        ? question.expected.map((x) => String(x).trim().toLowerCase())
        : [String(question.expected).trim().toLowerCase()];

      const userTokensNorm = tokens.map((t) => t.toLowerCase());

      if (userTokensNorm.length !== expectedArray.length) {
        return {
          correct: false,
          status: "incorrect",
          normalized: tokens.join(" -> "),
          message: `Expected ${expectedArray.length} items in sequence, but got ${userTokensNorm.length}.`,
        };
      }

      const allMatch = userTokensNorm.every((tok, idx) => tok === expectedArray[idx]);
      if (allMatch) {
        return {
          correct: true,
          status: "correct",
          normalized: tokens.join(" -> "),
          message: "Correct!",
        };
      }

      return {
        correct: false,
        status: "incorrect",
        normalized: tokens.join(" -> "),
        message: "Incorrect sequence order.",
      };
    }

    case "set": {
      const tokens = parseSequenceTokens(raw);
      if (!tokens) {
        return {
          correct: false,
          status: "invalid",
          message: "Please enter a set of items (e.g. P1, P2, P3).",
        };
      }

      const userTokensNorm = tokens.map((t) => t.toLowerCase());
      const uniqueUserTokens = Array.from(new Set(userTokensNorm));
      if (uniqueUserTokens.length !== userTokensNorm.length) {
        return {
          correct: false,
          status: "incorrect",
          normalized: tokens.join(", "),
          message: "A set cannot contain duplicate elements.",
        };
      }

      const expectedArray = Array.isArray(question.expected)
        ? question.expected.map((x) => String(x).trim().toLowerCase())
        : [String(question.expected).trim().toLowerCase()];
      const expectedSet = new Set(expectedArray);

      if (uniqueUserTokens.length !== expectedSet.size) {
        return {
          correct: false,
          status: "incorrect",
          normalized: tokens.join(", "),
          message: `Expected ${expectedSet.size} unique items, but got ${uniqueUserTokens.length}.`,
        };
      }

      const allPresent = uniqueUserTokens.every((tok) => expectedSet.has(tok));
      if (allPresent) {
        return {
          correct: true,
          status: "correct",
          normalized: tokens.join(", "),
          message: "Correct!",
        };
      }

      return {
        correct: false,
        status: "incorrect",
        normalized: tokens.join(", "),
        message: "Incorrect set elements.",
      };
    }
  }
}
