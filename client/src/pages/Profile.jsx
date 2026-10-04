import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shell from '../components/Shell';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import { selectUser, updateProfile, uploadProfileAvatar } from '../features/auth/authSlice';

const TABS = ['Personal Info', 'Security', 'Preferences'];

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const avatarInput = useRef(null);

  const [activeTab, setActiveTab] = useState('Personal Info');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const save = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateProfile({ name: name.trim(), bio: bio.trim() })).unwrap();
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err || 'Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Profile photo must be 5MB or smaller', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      await dispatch(uploadProfileAvatar(file)).unwrap();
      toast('Profile photo updated', 'success');
    } catch (err) {
      toast(err || 'Could not upload profile photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="card p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <Avatar name={user?.name} src={user?.avatar} size="xl" />
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  aria-label="Choose profile photo"
                />
                <button
                  type="button"
                  className="btn-secondary !rounded-[10px] !px-3 !py-1.5 text-xs"
                  onClick={() => avatarInput.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="upload" className="h-3.5 w-3.5" />}
                  {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                </button>
              </div>
              <div>
                <h1 className="text-[20px] font-bold tracking-tight text-ink">
                  {user?.name || 'User'}
                </h1>
                <p className="text-[13px] text-body">{user?.email || ''}</p>
                <p className="text-[13px] text-muted">
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : 'Member'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('Personal Info')}
              className="btn-primary !rounded-[10px]"
            >
              Edit Profile
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-line">
            <div className="flex gap-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative pb-3 text-[13.5px] font-semibold transition ${
                    activeTab === tab ? 'text-primary' : 'text-body hover:text-ink'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {activeTab === 'Personal Info' && (
              <form onSubmit={save}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className="mb-1.5 block text-[13px] font-semibold text-ink">
                      Full Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-email" className="mb-1.5 block text-[13px] font-semibold text-ink">
                      Email
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      readOnly
                      className="input !bg-canvas/50"
                      title="Email cannot be changed"
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <label htmlFor="profile-bio" className="mb-1.5 block text-[13px] font-semibold text-ink">
                    Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Tell us about yourself..."
                    className="input resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary mt-6 !rounded-[10px] !px-6 !py-2.5"
                >
                  {saving ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Icon name="upload" className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Update Profile'}
                </button>
              </form>
            )}

            {activeTab === 'Security' && (
              <div className="max-w-lg">
                <h2 className="text-[15px] font-bold text-ink">Password</h2>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  To change your password, use the forgot-password flow. A reset
                  link will be sent to your email.
                </p>
                <a href="/forgot-password" className="btn-secondary mt-4 !rounded-[10px]">
                  Reset Password
                </a>
              </div>
            )}

            {activeTab === 'Preferences' && (
              <div className="max-w-lg">
                <h2 className="text-[15px] font-bold text-ink">Preferences</h2>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  Notification and appearance preferences live under{' '}
                  <a href="/settings" className="font-semibold text-primary hover:text-primary-dark">
                    Settings
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
