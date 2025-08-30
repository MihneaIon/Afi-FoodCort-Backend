import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, generateTokens, setTokenCookies, JWTPayload } from '../utils/jwt';
import { prisma } from '../index';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      // Verify access token
      const decoded = verifyAccessToken(token);
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      req.user = user;
      next();
    } catch (accessTokenError) {
      // Access token expired, try refresh token
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'Access token expired and no refresh token' });
      }

      try {
        const decoded = verifyRefreshToken(refreshToken);
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Generate new tokens
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        // Set new cookies
        setTokenCookies(res, newAccessToken, newRefreshToken);

        req.user = user;
        next();
      } catch (refreshTokenError) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};
