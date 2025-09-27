import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import VisitorManagement from './VisitorManagement';
import GuardPanel from './GuardPanel';
import AIChat from './AIChat';
import AuditLog from './AuditLog';
import { Users, Shield, MessageSquare, FileText, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, role, householdId, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('visitors');
  const [visitors, setVisitors] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let visitorsQuery;
    
    if (role === 'resident') {
      visitorsQuery = query(
        collection(db, 'visitors'),
        where('hostHouseholdId', '==', householdId),
        orderBy('createdAt', 'desc')
      );
    } else {
      visitorsQuery = query(
        collection(db, 'visitors'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribeVisitors = onSnapshot(visitorsQuery, (snapshot) => {
      const visitorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVisitors(visitorsData);
    });

    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
    });

    return () => {
      unsubscribeVisitors();
      unsubscribeEvents();
    };
  }, [role, householdId]);

  const tabs = [
    { id: 'visitors', label: 'Visitors', icon: Users, roles: ['resident', 'admin'] },
    { id: 'guard', label: 'Guard Panel', icon: Shield, roles: ['guard', 'admin'] },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare, roles: ['resident', 'guard', 'admin'] },
    { id: 'audit', label: 'Audit Log', icon: FileText, roles: ['admin'] }
  ].filter(tab => tab.roles.includes(role));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'visitors':
        return <VisitorManagement visitors={visitors} />;
      case 'guard':
        return <GuardPanel visitors={visitors} />;
      case 'chat':
        return <AIChat />;
      case 'audit':
        return <AuditLog events={events} />;
      default:
        return <VisitorManagement visitors={visitors} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">MyGate</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.displayName || user?.email}</span>
                <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                  {role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;