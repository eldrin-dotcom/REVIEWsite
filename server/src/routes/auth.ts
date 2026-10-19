import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  signed: true,
  path: '/',
};

// Get Available Profiles
authRouter.get('/profiles', async (_req, res) => {
  try {
    const db = getDb();
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        theme: users.theme,
      })
      .from(users)
      .all();

    return res.json({
      success: true,
      data: allUsers,
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch profiles' });
  }
});

// Login / Select Profile
authRouter.post('/login', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username or profile required' });
    }

    const db = getDb();
    const user = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase())).get();

    if (!user) {
      return res.status(404).json({ success: false, error: 'Reviewer profile not found' });
    }

    // Set signed session cookie directly
    const sessionData = JSON.stringify({ userId: user.id, username: user.username });
    res.cookie('session', sessionData, COOKIE_OPTIONS);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          theme: user.theme,
        },
        message: 'Reviewer profile selected successfully',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during profile selection' });
  }
});

// Logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('session', { path: '/' });
  return res.json({ success: true, data: { message: 'Logged out successfully' } });
});

// Current User
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const user = await db.select().from(users).where(eq(users.id, req.userId!)).get();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update Theme
authRouter.put('/theme', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { theme } = req.body;
    const validThemes = ['light', 'dark', 'pink'];

    if (!theme || !validThemes.includes(theme)) {
      return res.status(400).json({ success: false, error: 'Invalid theme. Must be light, dark, or pink' });
    }

    const db = getDb();
    await db.update(users).set({ theme }).where(eq(users.id, req.userId!)).run();

    return res.json({ success: true, data: { theme } });
  } catch (error) {
    console.error('Update theme error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update Password
authRouter.put('/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
    }

    const db = getDb();
    const user = await db.select().from(users).where(eq(users.id, req.userId!)).get();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id)).run();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});
