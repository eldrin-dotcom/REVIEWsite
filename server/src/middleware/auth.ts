import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  username?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionCookie = req.signedCookies?.session;
    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const session = typeof sessionCookie === 'string' ? JSON.parse(sessionCookie) : sessionCookie;
    if (!session?.userId || !session?.username) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    req.userId = session.userId;
    req.username = session.username;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }
}
