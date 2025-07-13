import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analyticsAPI, urlAPI } from '../services/api';
import Loading from '../components/Common/Loading';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  Line, Bar, Doughnut
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  LinkIcon,
  ExternalLinkIcon,
  CopyIcon,
  MousePointerClickIcon,
  GlobeIcon,
  MonitorIcon,
  ChromeIcon,
  CalendarIcon,
  ClockIcon,
  Share2Icon,
  TrendingUpIcon,
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [id, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch URL details
      const urlResponse = await urlAPI.getOne(id);
      setUrl(urlResponse.data.data.url);

      // Fetch analytics
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const analyticsResponse = await analyticsAPI.getUrlAnalytics(id, params);
      setAnalytics(analyticsResponse.data.data.analytics);
    } catch (error) {
      toast.error('Failed to fetch analytics');
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const exportData = () => {
    if (!analytics) return;

    const data = {
      url: url.originalUrl,
      shortUrl: url.shortUrl,
      totalClicks: analytics.totalClicks,
      clicksByDate: analytics.clicksByDate,
      clicksByCountry: analytics.clicksByCountry,
      clicksByDevice: analytics.clicksByDevice,
      clicksByBrowser: analytics.clicksByBrowser,
      clicksByOS: analytics.clicksByOS,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${id}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Analytics data exported!');
  };

  if (loading) {
    return <Loading fullScreen text="Loading analytics..." />;
  }

  if (!url || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics not found</h2>
          <Link to="/links" className="text-primary-600 hover:text-primary-700">
            Back to My Links
          </Link>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const clicksChartData = {
    labels: analytics.clicksByDate.map(item => format(parseISO(item.date), 'MMM dd')),
    datasets: [
      {
        label: 'Clicks',
        data: analytics.clicksByDate.map(item => item.count),
        fill: true,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const countryChartData = {
    labels: analytics.clicksByCountry.slice(0, 5).map(item => item.country || 'Unknown'),
    datasets: [
      {
        label: 'Clicks by Country',
        data: analytics.clicksByCountry.slice(0, 5).map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      },
    ],
  };

  const deviceChartData = {
    labels: analytics.clicksByDevice.map(item => item.device || 'Unknown'),
    datasets: [
      {
        label: 'Clicks by Device',
        data: analytics.clicksByDevice.map(item => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
      },
    ],
  };

  const browserChartData = {
    labels: analytics.clicksByBrowser.slice(0, 5).map(item => item.browser || 'Unknown'),
    datasets: [
      {
        label: 'Clicks',
        data: analytics.clicksByBrowser.slice(0, 5).map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  // Calculate heatmap max value for color intensity
  const heatmapMax = Math.max(...analytics.clickHeatmap.flat());

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/links"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to My Links
          </Link>
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {url.title || 'Untitled Link'}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  <a
                    href={url.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {url.shortUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(url.shortUrl)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Created {format(new Date(url.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 truncate">
                {url.originalUrl}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportData}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {analytics.totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <MousePointerClickIcon className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {analytics.clicksByCountry.length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <GlobeIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Devices</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {analytics.clicksByDevice.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <MonitorIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Daily</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {analytics.clicksByDate.length > 0
                    ? Math.round(analytics.totalClicks / analytics.clicksByDate.length)
                    : 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clicks Over Time */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Clicks Over Time
            </h2>
            {analytics.clicksByDate.length > 0 ? (
              <Line 
                data={clicksChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No click data available</p>
            )}
          </div>

          {/* Countries */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Countries
            </h2>
            {analytics.clicksByCountry.length > 0 ? (
              <Doughnut 
                data={countryChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No country data available</p>
            )}
          </div>

          {/* Devices */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Devices
            </h2>
            {analytics.clicksByDevice.length > 0 ? (
              <Doughnut 
                data={deviceChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No device data available</p>
            )}
          </div>

          {/* Browsers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Browsers
            </h2>
            {analytics.clicksByBrowser.length > 0 ? (
              <Bar 
                data={browserChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No browser data available</p>
            )}
          </div>
        </div>

        {/* Click Heatmap */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Click Heatmap (Day/Hour)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-xs font-medium text-gray-500"></th>
                  {[...Array(24)].map((_, i) => (
                    <th key={i} className="px-2 py-1 text-xs font-medium text-gray-500">
                      {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                  <tr key={day}>
                    <td className="px-2 py-1 text-xs font-medium text-gray-500">{day}</td>
                    {analytics.clickHeatmap[dayIndex].map((value, hourIndex) => {
                      const intensity = heatmapMax > 0 ? value / heatmapMax : 0;
                      return (
                        <td
                          key={hourIndex}
                          className="px-2 py-1 text-xs text-center"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                            color: intensity > 0.5 ? 'white' : 'black'
                          }}
                          title={`${value} clicks`}
                        >
                          {value > 0 ? value : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Hours are displayed in 24-hour format. Darker cells indicate more clicks.
          </p>
        </div>

        {/* Recent Clicks */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Clicks
          </h2>
          {analytics.recentClicks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Browser
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.recentClicks.map((click, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(click.clickedAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {click.city || 'Unknown'}, {click.country || 'XX'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {click.device || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {click.browser || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent clicks</p>
          )}
        </div>

        {/* UTM Campaigns */}
        {analytics.clicksByUTM && analytics.clicksByUTM.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              UTM Campaign Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medium
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.clicksByUTM.map((utm, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {utm.utmSource || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {utm.utmMedium || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {utm.utmCampaign || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {utm.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Referrers */}
        {analytics.clicksByReferer && analytics.clicksByReferer.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Referrers
            </h2>
            <div className="space-y-2">
              {analytics.clicksByReferer.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center flex-1 min-w-0">
                    <Share2Icon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">
                      {referrer.referer || 'Direct Traffic'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-4">
                    {referrer.count} clicks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;