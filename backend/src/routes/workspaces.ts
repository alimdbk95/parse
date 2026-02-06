import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all workspaces for user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: {
        workspace: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: {
                members: true,
                documents: true,
                analyses: true,
              },
            },
          },
        },
      },
    });

    res.json({
      workspaces: workspaces.map(w => ({
        ...w.workspace,
        role: w.role,
        joinedAt: w.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Create workspace
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            role: 'admin',
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get single workspace
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Workspace not found or not a member' });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            analyses: true,
            charts: true,
          },
        },
      },
    });

    res.json({
      workspace,
      role: membership.role,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

// Update workspace
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    // Verify admin access
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Invite user to workspace
router.post('/:id/invite', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify admin access
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if already a member
      const existingMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: req.params.id,
          userId: existingUser.id,
        },
      });

      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Add user directly
      const newMembership = await prisma.workspaceMember.create({
        data: {
          workspaceId: req.params.id,
          userId: existingUser.id,
          role: role || 'viewer',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Emit socket event
      const io = req.app.get('io');
      io.to(`workspace:${req.params.id}`).emit('member-added', {
        member: newMembership,
        addedBy: req.user,
      });

      return res.status(201).json({ member: newMembership });
    }

    // Create invitation for non-existing user
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role || 'viewer',
        token: uuidv4(),
        workspaceId: req.params.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // In production, send email here
    // For now, return the invitation token
    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
      message: 'Invitation created. In production, an email would be sent.',
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Accept invitation
router.post('/invitations/:token/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        token: req.params.token,
        email: req.user!.email,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Create membership
    const membership = await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: req.user!.id,
        role: invitation.role,
      },
      include: {
        workspace: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Delete invitation
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`workspace:${invitation.workspaceId}`).emit('member-joined', {
      member: membership,
    });

    res.json({ membership });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Update member role
router.patch('/:id/members/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify admin access
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Can't change owner's role
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    if (workspace?.ownerId === req.params.userId) {
      return res.status(400).json({ error: "Cannot change owner's role" });
    }

    const updated = await prisma.workspaceMember.updateMany({
      where: {
        workspaceId: req.params.id,
        userId: req.params.userId,
      },
      data: { role },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Remove member
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Verify admin access or self-removal
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const isSelfRemoval = req.params.userId === req.user!.id;
    const isAdmin = membership.role === 'admin';

    if (!isSelfRemoval && !isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Can't remove owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    if (workspace?.ownerId === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId: req.params.id,
        userId: req.params.userId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`workspace:${req.params.id}`).emit('member-removed', {
      userId: req.params.userId,
      removedBy: req.user,
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Get workspace members
router.get('/:id/members', authenticate, async (req: AuthRequest, res) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Workspace not found or not a member' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// Delete workspace
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or not the owner' });
    }

    await prisma.workspace.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

export default router;
