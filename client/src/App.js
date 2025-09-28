// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { onMessageListener } from './config/firebase';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VisitorManagement from './components/VisitorManagement';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role)) return <Navigate to="/" />;
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(() => console.log('SW registration successful'))
        .catch(() => console.log('SW registration failed'));
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
      .catch((error) => console.log('Error receiving message:', error));
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route
          path="/visitors"
          element={
            <RoleProtectedRoute allowedRoles={["resident", "admin"]}>
              <VisitorManagement />
            </RoleProtectedRoute>
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
