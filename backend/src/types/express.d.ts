import type { AuthContext } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Có giá trị sau middleware `authenticate`. */
      auth?: AuthContext;
    }
  }
}

export {};
