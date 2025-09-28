import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Plus, Clock, CheckCircle, XCircle, User, Phone, FileText, Calendar, X, Eye, EyeOff } from 'lucide-react';

const ResidentVisitorManagement = () => {
  const [visitors, setVisitors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('my-visitors');
  const [newVisitor, setNewVisitor] = useState({
    name: '',
    phone: '',
    purpose: '',
    scheduledTime: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch visitors from API based on user role
  const fetchVisitors = async () => {
    try {
      const response = await ApiService.getVisitors();
      setVisitors(response.visitors || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    }
  };

  useEffect(() => {
    fetchVisitors();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchVisitors, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await ApiService.addVisitor({
        name: newVisitor.name,
        phone: newVisitor.phone,
        purpose: newVisitor.purpose,
        scheduledTime: newVisitor.scheduledTime
      });

      // Refresh the visitor list
      fetchVisitors();
      setNewVisitor({ name: '', phone: '', purpose: '', scheduledTime: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding visitor:', error);
      alert(`Error adding visitor: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (visitorId) => {
    try {
      await ApiService.approveVisitor(visitorId);
      fetchVisitors(); // Refresh the list
    } catch (error) {
      console.error('Error approving visitor:', error);
      alert(`Error approving visitor: ${error.message}`);
    }
  };

  const handleDeny = async (visitorId) => {
    const reason = prompt('Reason for denial (optional):');
    try {
      await ApiService.denyVisitor(visitorId, reason);
      fetchVisitors(); // Refresh the list
    } catch (error) {
      console.error('Error denying visitor:', error);
      alert(`Error denying visitor: ${error.message}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checked_in':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'checked_out':
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Not scheduled';

  let date;

  if (timestamp.seconds) {
    // Firestore Timestamp
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp._seconds) {
    // Raw proto Timestamp object
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp.toDate) {
    // Firestore Timestamp object
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    console.error("Unsupported timestamp type:", timestamp);
    return "Invalid date";
  }

  if (isNaN(date.getTime())) {
    console.error("Failed to parse date:", date, "from input:", timestamp);
    return 'Invalid date';
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

  // Filter visitors based on active tab
  const filteredVisitors = visitors.filter(visitor => {
    if (activeTab === 'my-visitors') {
      return true; // API already filters by household
    } else if (activeTab === 'pending-approval') {
      return visitor.status === 'pending';
    }
    return true;
  });

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitor Management</h1>
            <p className="mt-2 text-sm text-gray-600">Manage and track visitors to your household</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Visitor
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my-visitors')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'my-visitors'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  My Visitors ({visitors.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pending-approval')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pending-approval'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending Approval ({visitors.filter(v => v.status === 'pending').length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Add Visitor Form */}
        {showAddForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Add New Visitor</h2>
                <p className="text-indigo-100 text-sm mt-1">Fill in the visitor details below</p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddVisitor} className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Visitor Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      className="block w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter visitor's full name"
                      value={newVisitor.name}
                      onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      className="block w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="+1 (555) 123-4567"
                      value={newVisitor.phone}
                      onChange={(e) => setNewVisitor({ ...newVisitor, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Purpose of Visit
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="e.g., Delivery, Meeting, Personal visit"
                      value={newVisitor.purpose}
                      onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Scheduled Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="datetime-local"
                      className="block w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                      value={newVisitor.scheduledTime}
                      onChange={(e) => setNewVisitor({ ...newVisitor, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    'Add Visitor'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Visitors List */}
        <div className="grid gap-6">
          {filteredVisitors.map((visitor) => (
            <div key={visitor.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gray-50">
                      {getStatusIcon(visitor.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{visitor.name}</h3>
                          <div className="space-y-1">
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="text-sm">{visitor.phone}</span>
                            </div>
                            {visitor.purpose && (
                              <div className="flex items-center text-gray-600">
                                <FileText className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-sm">{visitor.purpose}</span>
                              </div>
                            )}
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="text-sm">{formatDateTime(visitor.scheduledTime)}</span>
                            </div>
                            {visitor.createdAt && (
                              <div className="flex items-center text-gray-500 text-xs mt-2">
                                <span>Added: {formatDateTime(visitor.createdAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-3 ml-6">
                          <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(visitor.status)}`}>
                            {visitor.status.replace('_', ' ').toUpperCase()}
                          </span>
                          
                          {visitor.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApprove(visitor.id)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeny(visitor.id)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
                              >
                                Deny
                              </button>
                            </div>
                          )}

                          {visitor.status === 'approved' && (
                            <div className="text-sm text-green-600 font-medium">
                              Ready for check-in
                            </div>
                          )}

                          {visitor.status === 'checked_in' && (
                            <div className="text-sm text-blue-600 font-medium">
                              Currently on premises
                            </div>
                          )}

                          {visitor.status === 'denied' && visitor.denialReason && (
                            <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                              Reason: {visitor.denialReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredVisitors.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              {activeTab === 'my-visitors' ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No visitors yet</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Add your first visitor to start managing entries to your household
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 font-medium"
                  >
                    Add First Visitor
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending approvals</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    All visitors have been approved or denied
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentVisitorManagement;