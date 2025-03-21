// Import libraries
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { checkDatabaseConnection } from '../services/dbService';
import { setupPeriodicSync } from '../services/syncService';

// Import components
import Header from './Header';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import PostDetail from '../pages/PostDetail';
import NotFound from '../pages/NotFound';
import PrivateRoute from './PrivateRoute';

// Import styles
import './App.css';

function App() {
  // Check database connection status and initialize sync
  useEffect(() => {
    const initializeBackupSystem = async () => {
      try {
        // First check database connection
        const connected = await checkDatabaseConnection();
        if (connected) {
          console.log('Successfully connected to PostgreSQL backup database');
          
          // After successful database connection, set up periodic sync
          try {
            // Set to sync every 24 hours
            const syncResult = await setupPeriodicSync(24);
            console.log('User sync status:', syncResult.message);
          } catch (syncError) {
            console.error('Failed to set up user data sync:', syncError);
          }
        } else {
          console.warn('PostgreSQL backup database connection is not available - user data will not be backed up');
        }
      } catch (error) {
        console.error('Error initializing backup system:', error);
      }
    };
    
    // Delay execution by 3 seconds to ensure other parts of the application (especially authentication) are initialized
    const timer = setTimeout(initializeBackupSystem, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route path="/post/:postId" element={<PostDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 