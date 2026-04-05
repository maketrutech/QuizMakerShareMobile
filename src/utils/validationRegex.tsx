// validationRegex.js

// Username: 3-16 characters, letters, numbers, underscore
export const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;

// Email: standard email pattern
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password: min 6 characters, at least 1 uppercase, 1 lowercase, 1 number, optional special chars
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*]{6,}$/;
