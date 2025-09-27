import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { onMessageListener } from './config/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('SW registration successful');
        })
        .catch((error) => {
          console.log('SW registration failed');
        });
    }

    onMessageListener()
      .then((payload) => {
        console.log('Received foreground message:', payload);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/favicon.ico'
          });
        }
      })
      .catch((error) => {
        console.log('Error receiving message:', error);
      });
  }, []);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;