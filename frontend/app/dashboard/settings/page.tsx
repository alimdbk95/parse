'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function SettingsPage() {
  const { user, setUser, currentWorkspace, theme, setTheme, branding, setBranding } = useStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [removeMember, setRemoveMember] = useState<any>(null);
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

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers();
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
    } catch (error) {
      console.error('Failed to load branding:', error);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const { members } = await api.getWorkspaceMembers(currentWorkspace.id);
      setMembers(members);
    } catch (error) {
      console.error('Failed to fetch members:', error);
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
      await api.inviteToWorkspace(currentWorkspace.id, inviteEmail, inviteRole);
      setShowInvite(false);
      setInviteEmail('');
      fetchMembers();
    } catch (error) {
      console.error('Failed to invite:', error);
    } finally {
      setInviting(false);
    }
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
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm md:text-base text-foreground-secondary">
            Manage your account, branding, and workspace preferences
          </p>
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

                <Button onClick={handleSaveProfile} loading={saving}>
                  Save Changes
                </Button>
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

                  <Button onClick={handleSaveBranding} loading={saving} className="mt-6">
                    Save Branding Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabPanel>

          {/* Team Tab */}
          <TabPanel id="team" activeTab={activeTab}>
            <Card className="mt-6">
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
    </div>
  );
}
