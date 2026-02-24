import express from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all notifications for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        read: false,
      },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get unread count only
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        read: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
      },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete a notification
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user!.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// Helper function to create a notification (used by other routes)
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  analysisId?: string;
  messageId?: string;
  workspaceId?: string;
  commentId?: string;
  actorId?: string;
  actorName?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data,
    });

    // Emit socket event for real-time notification
    const io = (global as any).io;
    if (io) {
      io.to(`user:${data.userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

// Helper to extract @mentions from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

// Helper to find users by name for mentions
export async function findUsersByMention(names: string[], workspaceId: string) {
  if (names.length === 0) return [];

  // Get workspace members
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Match names (case-insensitive)
  const matchedUsers = members.filter((member) =>
    names.some(
      (name) =>
        member.user.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(member.user.name.toLowerCase())
    )
  );

  return matchedUsers.map((m) => m.user);
}

export default router;
