import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { urlAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  LinkIcon, 
  CopyIcon, 
  ExternalLinkIcon,
  PlusIcon,
  TrashIcon
} from 'lucide-react';

const CreateLink = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [isABTest, setIsABTest] = useState(false);
  const [formData, setFormData] = useState({
    originalUrl: '',
    customAlias: '',
    title: '',
    destinations: [
      { url: '', weight: 50 },
      { url: '', weight: 50 }
    ]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDestinationChange = (index, field, value) => {
    const newDestinations = [...formData.destinations];
    newDestinations[index][field] = field === 'weight' ? parseInt(value) || 0 : value;
    setFormData(prev => ({
      ...prev,
      destinations: newDestinations
    }));
  };

  const addDestination = () => {
    const currentTotal = formData.destinations.reduce((sum, dest) => sum + dest.weight, 0);
    const remainingWeight = Math.max(0, 100 - currentTotal);
    
    setFormData(prev => ({
      ...prev,
      destinations: [...prev.destinations, { url: '', weight: remainingWeight }]
    }));
  };

  const removeDestination = (index) => {
    if (formData.destinations.length <= 2) {
      toast.error('A/B test requires at least 2 destinations');
      return;
    }
    
    const newDestinations = formData.destinations.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      destinations: newDestinations
    }));
  };

  const validateForm = () => {
    if (isABTest) {
      const validDestinations = formData.destinations.filter(d => d.url);
      if (validDestinations.length < 2) {
        toast.error('Please provide at least 2 destination URLs for A/B testing');
        return false;
      }
      
      const totalWeight = formData.destinations.reduce((sum, dest) => sum + dest.weight, 0);
      if (totalWeight !== 100) {
        toast.error('Destination weights must sum to 100%');
        return false;
      }
      
      for (const dest of formData.destinations) {
        if (dest.url && !/^https?:\/\/.+/.test(dest.url)) {
          toast.error('All destination URLs must start with http:// or https://');
          return false;
        }
      }
    } else {
      if (!formData.originalUrl) {
        toast.error('Please enter a URL to shorten');
        return false;
      }
      
      if (!/^https?:\/\/.+/.test(formData.originalUrl)) {
        toast.error('URL must start with http:// or https://');
        return false;
      }
    }
    
    if (formData.customAlias && !/^[a-zA-Z0-9_-]+$/.test(formData.customAlias)) {
      toast.error('Custom alias can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        originalUrl: isABTest ? undefined : formData.originalUrl,
        customAlias: formData.customAlias || undefined,
        title: formData.title || undefined,
        isABTest,
        destinations: isABTest ? formData.destinations.filter(d => d.url) : undefined
      };
      
      const response = await urlAPI.create(payload);
      const data = response.data.data;
      
      setShortUrl(data.shortUrl);
      toast.success('Link created successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create link';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    toast.success('Copied to clipboard!');
  };

  const reset = () => {
    setFormData({
      originalUrl: '',
      customAlias: '',
      title: '',
      destinations: [
        { url: '', weight: 50 },
        { url: '', weight: 50 }
      ]
    });
    setShortUrl('');
    setIsABTest(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Create Short Link
          </h1>

          {!shortUrl ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* A/B Test Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    A/B Testing
                  </label>
                  <p className="text-sm text-gray-500">
                    Split traffic between multiple destinations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsABTest(!isABTest)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isABTest ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isABTest ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {isABTest ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      Destination URLs
                    </h3>
                    <button
                      type="button"
                      onClick={addDestination}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Destination
                    </button>
                  </div>
                  
                  {formData.destinations.map((dest, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="flex-1">
                        <input
                          type="url"
                          placeholder={`Destination ${index + 1} URL`}
                          value={dest.url}
                          onChange={(e) => handleDestinationChange(index, 'url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Weight"
                          value={dest.weight}
                          onChange={(e) => handleDestinationChange(index, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                      <span className="py-2 text-sm text-gray-500">%</span>
                      {formData.destinations.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <div className="text-sm text-gray-600">
                    Total weight: {formData.destinations.reduce((sum, dest) => sum + dest.weight, 0)}%
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700">
                    Long URL
                  </label>
                  <input
                    type="url"
                    name="originalUrl"
                    id="originalUrl"
                    value={formData.originalUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/very-long-url"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="customAlias" className="block text-sm font-medium text-gray-700">
                  Custom Alias (Optional)
                </label>
                <div className="mt-1 flex items-center">
                  <span className="text-gray-500 sm:text-sm">
                    {process.env.REACT_APP_BASE_URL}/
                  </span>
                  <input
                    type="text"
                    name="customAlias"
                    id="customAlias"
                    value={formData.customAlias}
                    onChange={handleChange}
                    placeholder="my-link"
                    className="flex-1 ml-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="My awesome link"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <LinkIcon className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Link Created Successfully!
              </h2>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Your short link:</p>
                <div className="flex items-center justify-center space-x-2">
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-primary-600 hover:text-primary-700"
                  >
                    {shortUrl}
                  </a>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 text-gray-600 hover:text-gray-700"
                    title="Copy to clipboard"
                  >
                    <CopyIcon className="h-5 w-5" />
                  </button>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-gray-700"
                    title="Open in new tab"
                  >
                    <ExternalLinkIcon className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Create Another
                </button>
                <button
                  onClick={() => navigate('/links')}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  View All Links
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateLink;