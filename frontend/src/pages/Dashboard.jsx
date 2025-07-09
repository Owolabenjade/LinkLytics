import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, urlAPI } from '../services/api';
import Loading from '../components/Common/Loading';
import { 
  LinkIcon, 
  BarChart3Icon, 
  TrendingUpIcon, 
  MousePointerClickIcon,
  PlusIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format, parseISO } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentUrls, setRecentUrls] = useState([]);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, urlsResponse] = await Promise.all([
        analyticsAPI.getDashboardStats({ days: 7 }),
        urlAPI.getAll({ limit: 5, sort: '-createdAt' })
      ]);

      setStats(statsResponse.data.data);
      setRecentUrls(urlsResponse.data.data.urls);

      // Prepare chart data
      const clicksByDate = statsResponse.data.data.clicksByDate || [];
      setChartData({
        labels: clicksByDate.map(item => format(parseISO(item.date), 'MMM dd')),
        datasets: [
          {
            label: 'Clicks',
            data: clicksByDate.map(item => item.count),
            fill: true,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (shortUrl) => {
    navigator.clipboard.writeText(shortUrl);
    // You can add a toast notification here
  };

  if (loading) return <Loading fullScreen text="Loading dashboard..." />;

  const statCards = [
    {
      title: 'Total Links',
      value: stats?.overview?.totalUrls || 0,
      icon: LinkIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Clicks',
      value: stats?.overview?.totalClicks || 0,
      icon: MousePointerClickIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Recent Links',
      value: stats?.overview?.urlsCreatedRecently || 0,
      icon: TrendingUpIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Avg. Clicks/Link',
      value: stats?.overview?.averageClicksPerUrl || 0,
      icon: BarChart3Icon,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your link performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart and Recent Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Click Trends Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Click Trends (Last 7 Days)
            </h2>
            {chartData && (
              <Line 
                data={chartData}
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
            )}
          </div>

          {/* Recent Links */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Links
              </h2>
              <Link
                to="/create"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                New Link
              </Link>
            </div>
            
            <div className="space-y-3">
              {recentUrls.length > 0 ? (
                recentUrls.map((url) => (
                  <div
                    key={url.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {url.title || url.originalUrl}
                        </p>
                        <div className="mt-1 flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(url.shortUrl)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            {url.shortUrl}
                          </button>
                          <ExternalLinkIcon className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {url.clicks}
                        </p>
                        <p className="text-xs text-gray-500">clicks</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No links created yet</p>
                  <Link
                    to="/create"
                    className="mt-2 inline-block text-primary-600 hover:text-primary-700"
                  >
                    Create your first link
                  </Link>
                </div>
              )}
            </div>

            {recentUrls.length > 0 && (
              <div className="mt-4">
                <Link
                  to="/links"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all links →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Links */}
        {stats?.topUrls && stats.topUrls.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Performing Links
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.topUrls.map((url) => (
                    <tr key={url.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {url.title || url.originalUrl}
                          </p>
                          <p className="text-sm text-gray-500">{url.shortUrl}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {url.clicks.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/analytics/${url.id}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          View Analytics
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;