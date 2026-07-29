// Vitest setup — runs before every test file.
// Adds jest-dom matchers (toBeInTheDocument, etc.) and cleans up the DOM
// after each test so tests stay isolated.
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
