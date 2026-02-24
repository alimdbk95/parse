'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Palette,
  Users,
  Moon,
  Sun,
  Plus,
  Mail,
  Trash2,
  Check,
  Upload,
  Image,
  Type,
  BarChart3,
  Copy,
  RefreshCw,
  Clock,
  Link2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabPanel, TabPanels } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Dropdown } from '@/components/ui/dropdown';
import { ColorPicker, ColorPaletteEditor } from '@/components/ui/color-picker';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'branding', label: 'Branding', icon: <Palette className="h-4 w-4" /> },
  { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
];

const fonts = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Playfair Display', label: 'Playfair Display' },
];

const fontSizes = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

// Sample chart data for preview
const sampleChartData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SettingsPage() {
  const { user, setUser, currentWorkspace, theme, setTheme, branding, setBranding } = useStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [removeMember, setRemoveMember] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokeInvitation, setRevokeInvitation] = useState<any>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [name, setName] = useState(user?.name || '');

  // Branding state - initialized from store
  const [logo, setLogo] = useState<string | null>(null);
  const [chartColors, setChartColors] = useState(branding.chartColors);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [textColor, setTextColor] = useState(branding.textColor);
  const [backgroundColor, setBackgroundColor] = useState(branding.backgroundColor);
  const [selectedFont, setSelectedFont] = useState(branding.font);
  const [fontSize, setFontSize] = useState(branding.fontSize);
  const [chartBackground, setChartBackground] = useState<'dark' | 'light' | 'transparent'>(branding.chartBackground);

  // Debounced values for auto-save
  const debouncedName = useDebounce(name, 1000);
  const debouncedChartColors = useDebounce(chartColors, 1000);
  const debouncedPrimaryColor = useDebounce(primaryColor, 1000);
  const debouncedAccentColor = useDebounce(accentColor, 1000);
  const debouncedTextColor = useDebounce(textColor, 1000);
  const debouncedBackgroundColor = useDebounce(backgroundColor, 1000);
  const debouncedSelectedFont = useDebounce(selectedFont, 1000);
  const debouncedFontSize = useDebounce(fontSize, 1000);
  const debouncedChartBackground = useDebounce(chartBackground, 1000);

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers();
      fetchInvitations();
    }
    // Load saved branding settings
    loadBrandingSettings();
  }, [currentWorkspace]);

  const loadBrandingSettings = async () => {
    try {
      const { branding } = await api.getBranding();
      if (branding) {
        if (branding.colors) setChartColors(branding.colors);
        if (branding.font) setSelectedFont(branding.font);
        if (branding.logo) setLogo(branding.logo);
        if (branding.primaryColor) setPrimaryColor(branding.primaryColor);
        if (branding.accentColor) setAccentColor(branding.accentColor);
        if (branding.textColor) setTextColor(branding.textColor);
        if (branding.backgroundColor) setBackgroundColor(branding.backgroundColor);
        if (branding.fontSize) setFontSize(branding.fontSize);
        if (branding.chartBackground) setChartBackground(branding.chartBackground);
      }
      // Mark as initialized after loading
      setTimeout(() => setInitialized(true), 100);
    } catch (error) {
      console.error('Failed to load branding:', error);
      setInitialized(true);
    }
  };

  // Auto-save profile when name changes
  useEffect(() => {
    if (!initialized || !user || debouncedName === user.name) return;

    const saveProfile = async () => {
      setSaveStatus('saving');
      try {
        const { user: updatedUser } = await api.updateProfile({ name: debouncedName });
        setUser({ ...user!, ...updatedUser });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to auto-save profile:', error);
        setSaveStatus('idle');
      }
    };

    saveProfile();
  }, [debouncedName, initialized]);

  // Auto-save branding settings when any branding value changes
  useEffect(() => {
    if (!initialized) return;

    const saveBranding = async () => {
      setSaveStatus('saving');
      try {
        await api.updateBranding({
          colors: debouncedChartColors,
          font: debouncedSelectedFont,
          fontSize: debouncedFontSize,
          primaryColor: debouncedPrimaryColor,
          accentColor: debouncedAccentColor,
          textColor: debouncedTextColor,
          backgroundColor: debouncedBackgroundColor,
          chartBackground: debouncedChartBackground,
          theme,
        });

        // Update the store so changes apply globally
        setBranding({
          chartColors: debouncedChartColors,
          font: debouncedSelectedFont,
          fontSize: debouncedFontSize,
          primaryColor: debouncedPrimaryColor,
          accentColor: debouncedAccentColor,
          textColor: debouncedTextColor,
          backgroundColor: debouncedBackgroundColor,
          chartBackground: debouncedChartBackground,
        });

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to auto-save branding:', error);
        setSaveStatus('idle');
      }
    };

    saveBranding();
  }, [
    debouncedChartColors,
    debouncedPrimaryColor,
    debouncedAccentColor,
    debouncedTextColor,
    debouncedBackgroundColor,
    debouncedSelectedFont,
    debouncedFontSize,
    debouncedChartBackground,
    initialized,
  ]);

  // Auto-save theme when it changes
  useEffect(() => {
    if (!initialized) return;

    const saveTheme = async () => {
      setSaveStatus('saving');
      try {
        await api.updateBranding({ theme });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save theme:', error);
        setSaveStatus('idle');
      }
    };

    saveTheme();
  }, [theme, initialized]);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const { members } = await api.getWorkspaceMembers(currentWorkspace.id);
      setMembers(members);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!currentWorkspace) return;
    try {
      const { invitations } = await api.getWorkspaceInvitations(currentWorkspace.id);
      setInvitations(invitations);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { user: updatedUser } = await api.updateProfile({ name });
      setUser({ ...user!, ...updatedUser });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await api.updateBranding({
        colors: chartColors,
        font: selectedFont,
        fontSize,
        primaryColor,
        accentColor,
        textColor,
        backgroundColor,
        chartBackground,
        theme,
      });

      // Update the store so changes apply globally
      setBranding({
        chartColors,
        font: selectedFont,
        fontSize,
        primaryColor,
        accentColor,
        textColor,
        backgroundColor,
        chartBackground,
      });
    } catch (error) {
      console.error('Failed to update branding:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const { logo: uploadedLogo } = await api.uploadLogo(file);
      setLogo(uploadedLogo);
    } catch (error) {
      console.error('Failed to upload logo:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !currentWorkspace) return;
    setInviting(true);
    try {
      const result = await api.inviteToWorkspace(currentWorkspace.id, inviteEmail, inviteRole);
      // If an invitation was created (not direct member add), show the link
      if (result.invitation?.inviteLink) {
        setLastInviteLink(result.invitation.inviteLink);
      }
      setShowInvite(false);
      setInviteEmail('');
      fetchMembers();
      fetchInvitations();
    } catch (error) {
      console.error('Failed to invite:', error);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;
    setResendingId(invitationId);
    try {
      await api.resendInvitation(currentWorkspace.id, invitationId);
      fetchInvitations();
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!revokeInvitation || !currentWorkspace) return;
    try {
      await api.revokeInvitation(currentWorkspace.id, revokeInvitation.id);
      setInvitations((prev) => prev.filter((i) => i.id !== revokeInvitation.id));
      setRevokeInvitation(null);
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
    }
  };

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const handleRemoveMember = async () => {
    if (!removeMember || !currentWorkspace) return;
    try {
      await api.removeMember(currentWorkspace.id, removeMember.user.id);
      setMembers((prev) => prev.filter((m) => m.user.id !== removeMember.user.id));
      setRemoveMember(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
              <p className="mt-1 text-sm md:text-base text-foreground-secondary">
                Manage your account, branding, and workspace preferences
              </p>
            </div>
            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-foreground-tertiary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-green-500">
                  <Check className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

        <TabPanels activeTab={activeTab}>
          {/* Profile Tab */}
          <TabPanel id="profile" activeTab={activeTab}>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar name={user?.name || ''} size="lg" />
                  <div>
                    <Button variant="secondary" size="sm">
                      Change Avatar
                    </Button>
                    <p className="mt-1 text-xs text-foreground-tertiary">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Name */}
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />

                {/* Email (read-only) */}
                <Input
                  label="Email"
                  value={user?.email || ''}
                  disabled
                  placeholder="your@email.com"
                />

                {/* Theme */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Theme
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                        theme === 'dark'
                          ? 'bg-primary/20 text-primary border border-primary/50'
                          : 'bg-background-secondary hover:bg-background-tertiary'
                      )}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                        theme === 'light'
                          ? 'bg-primary/20 text-primary border border-primary/50'
                          : 'bg-background-secondary hover:bg-background-tertiary'
                      )}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </button>
                  </div>
                </div>

                <p className="text-xs text-foreground-tertiary">
                  Changes are saved automatically
                </p>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Branding Tab */}
          <TabPanel id="branding" activeTab={activeTab}>
            <div className="mt-4 md:mt-6 grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Logo & Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logo & Identity
                  </CardTitle>
                  <CardDescription>
                    Upload your logo for branded exports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Logo</label>
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed overflow-hidden',
                          logo ? 'border-transparent' : 'border-border'
                        )}
                      >
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                          <Upload className="h-8 w-8 text-foreground-tertiary" />
                        )}
                      </div>
                      <div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {logo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        {logo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogo(null)}
                            className="ml-2 text-red-400"
                          >
                            Remove
                          </Button>
                        )}
                        <p className="mt-1 text-xs text-foreground-tertiary">
                          PNG, SVG or JPG. Recommended 200x200px.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Primary Color */}
                  <ColorPicker
                    label="Primary Color"
                    color={primaryColor}
                    onChange={setPrimaryColor}
                  />

                  {/* Accent Color */}
                  <ColorPicker
                    label="Accent Color"
                    color={accentColor}
                    onChange={setAccentColor}
                  />

                  {/* Text Color */}
                  <ColorPicker
                    label="Text Color"
                    color={textColor}
                    onChange={setTextColor}
                  />

                  {/* Background Color */}
                  <ColorPicker
                    label="Background Color"
                    color={backgroundColor}
                    onChange={setBackgroundColor}
                  />

                  {/* Color Preview */}
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium">Preview</label>
                    <div
                      className="rounded-lg p-4 border"
                      style={{ backgroundColor: backgroundColor }}
                    >
                      <p style={{ color: textColor, fontFamily: selectedFont }}>
                        This is how your text will look
                      </p>
                      <p
                        className="mt-2 font-bold"
                        style={{ color: primaryColor, fontFamily: selectedFont }}
                      >
                        Primary Color Text
                      </p>
                      <p
                        className="mt-1"
                        style={{ color: accentColor, fontFamily: selectedFont }}
                      >
                        Accent Color Text
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Typography
                  </CardTitle>
                  <CardDescription>
                    Customize fonts for your charts and exports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Font Family */}
                  <Dropdown
                    label="Font Family"
                    items={fonts}
                    value={selectedFont}
                    onChange={setSelectedFont}
                  />

                  {/* Font Size */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Font Size</label>
                    <div className="flex gap-2">
                      {fontSizes.map((size) => (
                        <button
                          key={size.value}
                          onClick={() => setFontSize(size.value)}
                          className={cn(
                            'flex-1 rounded-lg px-4 py-2 text-sm transition-colors',
                            fontSize === size.value
                              ? 'bg-primary/20 text-primary border border-primary/50'
                              : 'bg-background-secondary hover:bg-background-tertiary'
                          )}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Typography Preview */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-foreground-tertiary mb-2">Preview</p>
                    <p
                      className={cn(
                        fontSize === 'small' && 'text-sm',
                        fontSize === 'medium' && 'text-base',
                        fontSize === 'large' && 'text-lg'
                      )}
                      style={{ fontFamily: selectedFont }}
                    >
                      The quick brown fox jumps over the lazy dog.
                    </p>
                    <p
                      className={cn(
                        'mt-2 font-bold',
                        fontSize === 'small' && 'text-lg',
                        fontSize === 'medium' && 'text-xl',
                        fontSize === 'large' && 'text-2xl'
                      )}
                      style={{ fontFamily: selectedFont }}
                    >
                      Chart Title Example
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Chart Colors */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Chart Customization
                  </CardTitle>
                  <CardDescription>
                    Define your chart color palette and style
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Color Palette Editor */}
                    <div className="space-y-4">
                      <ColorPaletteEditor
                        label="Chart Color Palette"
                        colors={chartColors}
                        onChange={setChartColors}
                        maxColors={8}
                      />

                      {/* Chart Background */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Chart Background
                        </label>
                        <div className="flex gap-2">
                          {(['dark', 'light', 'transparent'] as const).map((bg) => (
                            <button
                              key={bg}
                              onClick={() => setChartBackground(bg)}
                              className={cn(
                                'flex-1 rounded-lg px-4 py-2 text-sm capitalize transition-colors',
                                chartBackground === bg
                                  ? 'bg-primary/20 text-primary border border-primary/50'
                                  : 'bg-background-secondary hover:bg-background-tertiary'
                              )}
                            >
                              {bg}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chart Preview */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Chart Preview
                      </label>
                      <div
                        className={cn(
                          'rounded-xl border p-4',
                          chartBackground === 'dark' && 'bg-gray-900 border-gray-700',
                          chartBackground === 'light' && 'bg-white border-gray-200',
                          chartBackground === 'transparent' && 'bg-transparent border-border'
                        )}
                      >
                        <p
                          className={cn(
                            'mb-3 font-semibold',
                            chartBackground === 'light' ? 'text-gray-900' : 'text-white',
                            fontSize === 'small' && 'text-sm',
                            fontSize === 'medium' && 'text-base',
                            fontSize === 'large' && 'text-lg'
                          )}
                          style={{ fontFamily: selectedFont }}
                        >
                          Monthly Revenue
                        </p>
                        <ChartRenderer
                          type="bar"
                          data={sampleChartData}
                          colors={chartColors}
                          background={chartBackground}
                          height={200}
                          showLegend={false}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-foreground-tertiary">
                    Changes are saved automatically
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabPanel>

          {/* Team Tab */}
          <TabPanel id="team" activeTab={activeTab}>
            <div className="mt-6 space-y-6">
              {/* Team Members Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage who has access to {currentWorkspace?.name || 'this workspace'}
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowInvite(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {members.map((member) => (
                      <div
                        key={member.user.id}
                        className="flex items-center justify-between py-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={member.user.name} size="sm" />
                          <div>
                            <p className="font-medium">{member.user.name}</p>
                            <p className="text-sm text-foreground-tertiary">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              member.role === 'admin'
                                ? 'bg-primary/20 text-primary'
                                : member.role === 'editor'
                                ? 'bg-accent-teal/20 text-accent-teal'
                                : 'bg-background-secondary text-foreground-secondary'
                            )}
                          >
                            {member.role}
                          </span>
                          {member.user.id !== user?.id && member.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setRemoveMember(member)}
                              className="text-foreground-tertiary hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Invitations Card */}
              {invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Pending Invitations
                    </CardTitle>
                    <CardDescription>
                      Invitations that haven't been accepted yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {invitations.map((invitation) => {
                        const expired = isInvitationExpired(invitation.expiresAt);
                        return (
                          <div
                            key={invitation.id}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3",
                              expired && "opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-background-secondary flex items-center justify-center">
                                <Mail className="h-4 w-4 text-foreground-tertiary" />
                              </div>
                              <div>
                                <p className="font-medium">{invitation.email}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-0.5 text-xs font-medium',
                                      invitation.role === 'admin'
                                        ? 'bg-primary/20 text-primary'
                                        : invitation.role === 'editor'
                                        ? 'bg-accent-teal/20 text-accent-teal'
                                        : 'bg-background-secondary text-foreground-secondary'
                                    )}
                                  >
                                    {invitation.role}
                                  </span>
                                  <span className={cn(
                                    "flex items-center gap-1 text-xs",
                                    expired ? "text-red-400" : "text-foreground-tertiary"
                                  )}>
                                    <Clock className="h-3 w-3" />
                                    {formatExpiryDate(invitation.expiresAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-12 sm:ml-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(invitation.token)}
                                className="text-foreground-tertiary hover:text-foreground"
                              >
                                {copiedLink === invitation.token ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1 text-green-500" />
                                    <span className="text-green-500">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="h-4 w-4 mr-1" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                              {expired ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  disabled={resendingId === invitation.id}
                                >
                                  {resendingId === invitation.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Resend
                                    </>
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setRevokeInvitation(invitation)}
                                className="text-foreground-tertiary hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite Team Member"
        description="Send an invitation to join your workspace"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            icon={<Mail className="h-4 w-4" />}
          />
          <Dropdown
            label="Role"
            items={[
              { value: 'viewer', label: 'Viewer', description: 'Can view documents and analyses' },
              { value: 'editor', label: 'Editor', description: 'Can create and edit content' },
              { value: 'admin', label: 'Admin', description: 'Full access to workspace settings' },
            ]}
            value={inviteRole}
            onChange={setInviteRole}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={inviting}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Confirmation */}
      <ConfirmModal
        isOpen={!!removeMember}
        onClose={() => setRemoveMember(null)}
        onConfirm={handleRemoveMember}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeMember?.user.name} from this workspace?`}
        confirmText="Remove"
        variant="danger"
      />

      {/* Revoke Invitation Confirmation */}
      <ConfirmModal
        isOpen={!!revokeInvitation}
        onClose={() => setRevokeInvitation(null)}
        onConfirm={handleRevokeInvitation}
        title="Revoke Invitation"
        description={`Are you sure you want to revoke the invitation for ${revokeInvitation?.email}? They will no longer be able to join this workspace with this link.`}
        confirmText="Revoke"
        variant="danger"
      />

      {/* Invite Link Success Modal */}
      <Modal
        isOpen={!!lastInviteLink}
        onClose={() => setLastInviteLink(null)}
        title="Invitation Created"
        description="Share this link with the invited person"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-background-secondary rounded-lg border border-border">
            <input
              type="text"
              value={lastInviteLink || ''}
              readOnly
              className="flex-1 bg-transparent text-sm text-foreground-secondary outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (lastInviteLink) {
                  await navigator.clipboard.writeText(lastInviteLink);
                  setCopiedLink('last');
                  setTimeout(() => setCopiedLink(null), 2000);
                }
              }}
            >
              {copiedLink === 'last' ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-foreground-tertiary">
            The invitation will expire in 7 days. You can resend or revoke it from the Team settings.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setLastInviteLink(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
