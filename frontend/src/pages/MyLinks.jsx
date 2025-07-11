import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { urlAPI } from '../services/api';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  LinkIcon,
  ExternalLinkIcon,
  CopyIcon,
  EditIcon,
  TrashIcon,
  BarChart3,
  SearchIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  QrCodeIcon,
  ScaleIcon
} from 'lucide-react';

const MyLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('-createdAt');
  const [selectedLink, setSelectedLink] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    fetchLinks();
  }, [pagination.page, sortBy, searchTerm, dateFilter]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortBy
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (dateFilter.from) {
        params.dateFrom = dateFilter.from;
      }

      if (dateFilter.to) {
        params.dateTo = dateFilter.to;
      }

      const response = await urlAPI.getAll(params);
      const { urls, pagination: paginationData } = response.data.data;

      setLinks(urls);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
        pages: paginationData.pages
      }));
    } catch (error) {
      toast.error('Failed to fetch links');
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (shortUrl) => {
    navigator.clipboard.writeText(shortUrl);
    toast.success('Copied to clipboard!');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      await urlAPI.delete(id);
      toast.success('Link deleted successfully');
      fetchLinks();
    } catch (error) {
      toast.error('Failed to delete link');
    }
  };

  const handleEdit = (link) => {
    setSelectedLink(link);
    setEditTitle(link.title);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedLink) return;

    try {
      await urlAPI.update(selectedLink.id, { title: editTitle });
      toast.success('Link updated successfully');
      setShowEditModal(false);
      fetchLinks();
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const handleSort = (field) => {
    setSortBy(current => {
      if (current === field) return `-${field}`;
      if (current === `-${field}`) return field;
      return field;
    });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateFilter = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const downloadQRCode = async (shortCode) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/${shortCode}/qr?size=300&format=png`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${shortCode}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('QR code downloaded!');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  if (loading && links.length === 0) {
    return <Loading fullScreen text="Loading your links..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Links</h1>
              <p className="mt-2 text-gray-600">
                Manage and track all your shortened URLs
              </p>
            </div>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Link
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, URL, or short code..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => handleDateFilter('from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => handleDateFilter('to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Links Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title / URL
                      {sortBy.includes('title') && (
                        <span className="ml-1">
                          {sortBy === 'title' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Short Link
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('clicks')}
                  >
                    <div className="flex items-center">
                      Clicks
                      {sortBy.includes('clicks') && (
                        <span className="ml-1">
                          {sortBy === 'clicks' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Created
                      {sortBy.includes('createdAt') && (
                        <span className="ml-1">
                          {sortBy === 'createdAt' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {links.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <LinkIcon className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No links found</p>
                        {searchTerm || dateFilter.from || dateFilter.to ? (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setDateFilter({ from: '', to: '' });
                            }}
                            className="mt-2 text-primary-600 hover:text-primary-700"
                          >
                            Clear filters
                          </button>
                        ) : (
                          <Link
                            to="/create"
                            className="mt-2 text-primary-600 hover:text-primary-700"
                          >
                            Create your first link
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {link.title || 'Untitled'}
                              </p>
                              {link.isABTest && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  <ScaleIcon className="h-3 w-3 mr-1" />
                                  A/B Test
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {link.originalUrl}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:text-primary-700 truncate"
                          >
                            {link.shortUrl}
                          </a>
                          <button
                            onClick={() => copyToClipboard(link.shortUrl)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy to clipboard"
                          >
                            <CopyIcon className="h-4 w-4" />
                          </button>
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                            title="Open in new tab"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {link.clicks.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(link.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/analytics/${link.id}`}
                            className="text-gray-400 hover:text-gray-600"
                            title="View Analytics"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => downloadQRCode(link.shortCode)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Download QR Code"
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(link)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    {[...Array(pagination.pages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === pagination.pages ||
                        (page >= pagination.page - 1 && page <= pagination.page + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.page
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === pagination.page - 2 ||
                        page === pagination.page + 2
                      ) {
                        return (
                          <span
                            key={page}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Link Title
              </h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter title"
              />
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLinks;