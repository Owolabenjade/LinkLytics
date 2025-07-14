import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  HomeIcon, 
  LinkIcon, 
  CogIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  PlusIcon
} from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Links', href: '/links', icon: LinkIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <LinkIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">LinkLytics</span>
            </Link>
            
            {user && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center">
            {user ? (
              <>
                <div className="hidden sm:flex sm:items-center sm:space-x-4">
                  <Link
                    to="/create"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Link
                  </Link>
                  <span className="text-sm text-gray-700">
                    {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
                
                {/* Mobile menu button */}
                <div className="flex items-center sm:hidden">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100"
                  >
                    {mobileMenuOpen ? (
                      <XIcon className="h-6 w-6" />
                    ) : (
                      <MenuIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-primary-600"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {user && mobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                to="/create"
                className="flex items-center px-3 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md mx-3 mb-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <PlusIcon className="h-5 w-5 mr-3" />
                Create Link
              </Link>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md"
              >
                <LogOutIcon className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;