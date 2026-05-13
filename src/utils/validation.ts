export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_ERROR = {
  en: "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
  es: "La contraseña debe tener al menos 8 caracteres e incluir una letra mayúscula, un número y un carácter especial.",
  it: "La password deve contenere almeno 8 caratteri, una lettera maiuscola, un numero e un carattere speciale.",
};

export const PASSWORD_HINTS = {
  en: [
    "At least 8 characters",
    "One uppercase letter (A-Z)",
    "One number (0-9)",
    "One special character (!@#$%...)",
  ],
  es: [
    "Al menos 8 caracteres",
    "Una letra mayúscula (A-Z)",
    "Un número (0-9)",
    "Un carácter especial (!@#$%...)",
  ],
  it: [
    "Almeno 8 caratteri",
    "Una lettera maiuscola (A-Z)",
    "Un numero (0-9)",
    "Un carattere speciale (!@#$%...)",
  ],
};
