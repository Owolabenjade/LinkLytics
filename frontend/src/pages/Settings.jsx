import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, webhookAPI } from '../services/api';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  UserIcon,
  KeyIcon,
  LockIcon,
  WebhookIcon,
  CopyIcon,
  RefreshCwIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  TestTubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';

const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // API Key state
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookForm, setWebhookForm] = useState({
    url: '',
    events: []
  });

  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab]);

  const fetchWebhooks = async () => {
    try {
      const response = await webhookAPI.getAll();
      setWebhooks(response.data.data.webhooks);
    } catch (error) {
      toast.error('Failed to fetch webhooks');
    }
  };

  // Profile handlers
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateProfile({ name: profileData.name });
    
    if (result.success) {
      toast.success('Profile updated successfully');
    }
    
    setLoading(false);
  };

  // Password handlers
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully. Please login again.');
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // API Key handlers
  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authAPI.regenerateApiKey();
      setApiKey(response.data.data.apiKey);
      toast.success('API key regenerated successfully');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  // Webhook handlers
  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    
    if (webhookForm.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }
    
    setLoading(true);
    
    try {
      if (editingWebhook) {
        await webhookAPI.update(editingWebhook.id, {
          events: webhookForm.events,
          isActive: true
        });
        toast.success('Webhook updated successfully');
      } else {
        await webhookAPI.create(webhookForm);
        toast.success('Webhook created successfully');
      }
      
      setShowWebhookModal(false);
      setWebhookForm({ url: '', events: [] });
      setEditingWebhook(null);
      fetchWebhooks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleWebhookDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    
    try {
      await webhookAPI.delete(id);
      toast.success('Webhook deleted successfully');
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleWebhookTest = async (id) => {
    try {
      await webhookAPI.test(id);
      toast.success('Test webhook sent successfully');
    } catch (error) {
      toast.error('Failed to send test webhook');
    }
  };

  const handleWebhookToggle = async (webhook) => {
    try {
      await webhookAPI.update(webhook.id, {
        isActive: !webhook.isActive
      });
      toast.success(`Webhook ${webhook.isActive ? 'disabled' : 'enabled'} successfully`);
      fetchWebhooks();
    } catch (error) {
      toast.error('Failed to update webhook');
    }
  };

  const toggleEventSelection = (event) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const availableEvents = [
    { value: 'click', label: 'Click', description: 'Triggered when someone clicks your link' },
    { value: 'milestone', label: 'Milestone', description: 'Triggered at 100, 1k, 10k clicks' },
    { value: 'url_created', label: 'URL Created', description: 'Triggered when you create a new link' },
    { value: 'url_deleted', label: 'URL Deleted', description: 'Triggered when you delete a link' }
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'password', label: 'Password', icon: LockIcon },
    { id: 'api', label: 'API Key', icon: KeyIcon },
    { id: 'webhooks', label: 'Webhooks', icon: WebhookIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and integrations</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    disabled
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? (
                        <EyeOffIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? (
                        <EyeOffIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? (
                        <EyeOffIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* API Key Tab */}
          {activeTab === 'api' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">API Key</h2>
              <p className="text-gray-600 mb-6">
                Use your API key to integrate LinkLytics with your applications. Keep it secret!
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your API Key
                    </label>
                    <div className="flex items-center">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="px-3 py-2 border-t border-b border-gray-300 bg-white hover:bg-gray-50"
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={copyApiKey}
                        className="px-3 py-2 border border-gray-300 rounded-r-md bg-white hover:bg-gray-50"
                        title="Copy to clipboard"
                      >
                        <CopyIcon className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleRegenerateApiKey}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-medium text-gray-900">API Usage Example</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST ${process.env.REACT_APP_API_URL}/urls/api/shorten \\
  -H "X-API-Key: ${showApiKey ? apiKey : 'your-api-key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "originalUrl": "https://example.com/very-long-url",
    "customAlias": "my-link"
  }'`}
                </pre>
              </div>
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
                  <p className="text-gray-600">Get real-time notifications when events occur</p>
                </div>
                <button
                  onClick={() => {
                    setEditingWebhook(null);
                    setWebhookForm({ url: '', events: [] });
                    setShowWebhookModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Webhook
                </button>
              </div>
              
              {webhooks.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <WebhookIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No webhooks configured</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add a webhook to receive real-time notifications
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {webhook.url}
                            </p>
                            {webhook.isActive ? (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {webhook.events.map((event) => (
                              <span
                                key={event}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {event.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                          {webhook.failureCount > 0 && (
                            <div className="mt-2 flex items-center text-sm text-orange-600">
                              <AlertCircleIcon className="h-4 w-4 mr-1" />
                              {webhook.failureCount} consecutive failures
                            </div>
                          )}
                          {webhook.lastTriggeredAt && (
                            <p className="mt-1 text-xs text-gray-500">
                              Last triggered: {format(new Date(webhook.lastTriggeredAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                          <button
                            onClick={() => handleWebhookTest(webhook.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Test webhook"
                          >
                            <TestTubeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleWebhookToggle(webhook)}
                            className="text-gray-400 hover:text-gray-600"
                            title={webhook.isActive ? 'Disable webhook' : 'Enable webhook'}
                          >
                            {webhook.isActive ? (
                              <XCircleIcon className="h-4 w-4" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingWebhook(webhook);
                              setWebhookForm({
                                url: webhook.url,
                                events: webhook.events
                              });
                              setShowWebhookModal(true);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit webhook"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleWebhookDelete(webhook.id)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete webhook"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Webhook Modal */}
        {showWebhookModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
              </h3>
              <form onSubmit={handleWebhookSubmit} className="space-y-4">
                <div>
                  <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    id="webhookUrl"
                    value={webhookForm.url}
                    onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://example.com/webhook"
                    required
                    disabled={editingWebhook}
                  />
                  {editingWebhook && (
                    <p className="mt-1 text-sm text-gray-500">URL cannot be changed</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events
                  </label>
                  <div className="space-y-2">
                    {availableEvents.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-start cursor-pointer p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={webhookForm.events.includes(event.value)}
                          onChange={() => toggleEventSelection(event.value)}
                          className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{event.label}</p>
                          <p className="text-xs text-gray-500">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWebhookModal(false);
                      setEditingWebhook(null);
                      setWebhookForm({ url: '', events: [] });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || webhookForm.events.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingWebhook ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;