import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Get branding settings
router.get('/branding', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        brandColors: true,
        brandLogo: true,
        brandFont: true,
        brandFontSize: true,
        brandPrimaryColor: true,
        brandAccentColor: true,
        brandTextColor: true,
        brandBackgroundColor: true,
        brandChartBg: true,
        theme: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      branding: {
        colors: user.brandColors ? JSON.parse(user.brandColors) : null,
        logo: user.brandLogo,
        font: user.brandFont,
        fontSize: user.brandFontSize,
        primaryColor: user.brandPrimaryColor,
        accentColor: user.brandAccentColor,
        textColor: user.brandTextColor,
        backgroundColor: user.brandBackgroundColor,
        chartBackground: user.brandChartBg,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Failed to get branding settings' });
  }
});

// Update branding settings
router.patch('/branding', authenticate, async (req: AuthRequest, res) => {
  try {
    const { colors, font, fontSize, primaryColor, accentColor, textColor, backgroundColor, chartBackground, theme } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(colors && { brandColors: JSON.stringify(colors) }),
        ...(font !== undefined && { brandFont: font }),
        ...(fontSize !== undefined && { brandFontSize: fontSize }),
        ...(primaryColor !== undefined && { brandPrimaryColor: primaryColor }),
        ...(accentColor !== undefined && { brandAccentColor: accentColor }),
        ...(textColor !== undefined && { brandTextColor: textColor }),
        ...(backgroundColor !== undefined && { brandBackgroundColor: backgroundColor }),
        ...(chartBackground !== undefined && { brandChartBg: chartBackground }),
        ...(theme && { theme }),
      },
      select: {
        brandColors: true,
        brandLogo: true,
        brandFont: true,
        brandFontSize: true,
        brandPrimaryColor: true,
        brandAccentColor: true,
        brandTextColor: true,
        brandBackgroundColor: true,
        brandChartBg: true,
        theme: true,
      },
    });

    res.json({
      branding: {
        colors: user.brandColors ? JSON.parse(user.brandColors) : null,
        logo: user.brandLogo,
        font: user.brandFont,
        fontSize: user.brandFontSize,
        primaryColor: user.brandPrimaryColor,
        accentColor: user.brandAccentColor,
        textColor: user.brandTextColor,
        backgroundColor: user.brandBackgroundColor,
        chartBackground: user.brandChartBg,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: 'Failed to update branding settings' });
  }
});

// Upload logo
router.post('/branding/logo', authenticate, upload.single('logo'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        brandLogo: req.file.path,
      },
      select: {
        brandLogo: true,
      },
    });

    res.json({ logo: user.brandLogo });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Get available fonts
router.get('/fonts', authenticate, async (req: AuthRequest, res) => {
  res.json({
    fonts: [
      { id: 'inter', name: 'Inter', category: 'sans-serif' },
      { id: 'roboto', name: 'Roboto', category: 'sans-serif' },
      { id: 'open-sans', name: 'Open Sans', category: 'sans-serif' },
      { id: 'lato', name: 'Lato', category: 'sans-serif' },
      { id: 'poppins', name: 'Poppins', category: 'sans-serif' },
      { id: 'montserrat', name: 'Montserrat', category: 'sans-serif' },
      { id: 'playfair', name: 'Playfair Display', category: 'serif' },
      { id: 'merriweather', name: 'Merriweather', category: 'serif' },
      { id: 'source-code', name: 'Source Code Pro', category: 'monospace' },
      { id: 'fira-code', name: 'Fira Code', category: 'monospace' },
    ],
  });
});

// Get default color palettes
router.get('/palettes', authenticate, async (req: AuthRequest, res) => {
  res.json({
    palettes: [
      {
        id: 'default',
        name: 'Default',
        colors: ['#f97066', '#47d4c1', '#3b82f6', '#a3e635', '#f472b6'],
      },
      {
        id: 'ocean',
        name: 'Ocean',
        colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16'],
      },
      {
        id: 'sunset',
        name: 'Sunset',
        colors: ['#f97316', '#f59e0b', '#eab308', '#ef4444', '#ec4899'],
      },
      {
        id: 'forest',
        name: 'Forest',
        colors: ['#22c55e', '#16a34a', '#15803d', '#14532d', '#84cc16'],
      },
      {
        id: 'royal',
        name: 'Royal',
        colors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
      },
      {
        id: 'monochrome',
        name: 'Monochrome',
        colors: ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'],
      },
    ],
  });
});

// Get user preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        theme: true,
        brandColors: true,
        brandFont: true,
      },
    });

    res.json({
      preferences: {
        theme: user?.theme || 'dark',
        colors: user?.brandColors ? JSON.parse(user.brandColors) : null,
        font: user?.brandFont || 'inter',
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update preferences
router.patch('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const { theme, defaultChartType, defaultBackground } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(theme && { theme }),
      },
      select: {
        theme: true,
      },
    });

    res.json({
      preferences: {
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
