import React from 'react';
import ApiService from '../services/api';
import { CheckCircle, XCircle, LogIn, LogOut, Clock, Shield, Users, Activity } from 'lucide-react';

const GuardPanel = ({ visitors }) => {
  const handleApprove = async (visitorId) => {
    try {
      await ApiService.approveVisitor(visitorId);
    } catch (error) {
      console.error('Error approving visitor:', error);
      alert('Error approving visitor: ' + error.message);
    }
  };

  const handleDeny = async (visitorId) => {
    const reason = prompt('Reason for denial (optional):');
    try {
      await ApiService.denyVisitor(visitorId, reason);
    } catch (error) {
      console.error('Error denying visitor:', error);
      alert('Error denying visitor: ' + error.message);
    }
  };

  const handleCheckin = async (visitorId) => {
    try {
      await ApiService.checkinVisitor(visitorId);
    } catch (error) {
      console.error('Error checking in visitor:', error);
      alert('Error checking in visitor: ' + error.message);
    }
  };

  const handleCheckout = async (visitorId) => {
    try {
      await ApiService.checkoutVisitor(visitorId);
    } catch (error) {
      console.error('Error checking out visitor:', error);
      alert('Error checking out visitor: ' + error.message);
    }
  };

  const pendingVisitors = visitors.filter(v => v.status === 'pending');
  const approvedVisitors = visitors.filter(v => v.status === 'approved');
  const checkedInVisitors = visitors.filter(v => v.status === 'checked_in');

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Not scheduled';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Guard Panel</h1>
              <p className="text-sm text-gray-600">Monitor and manage visitor entries and exits</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingVisitors.length}</p>
                <p className="text-sm text-gray-600">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedVisitors.length}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{checkedInVisitors.length}</p>
                <p className="text-sm text-gray-600">Inside Premises</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{visitors.length}</p>
                <p className="text-sm text-gray-600">Total Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Pending Approvals */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Pending Approval ({pendingVisitors.length})
              </h3>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {pendingVisitors.map((visitor) => (
                <div key={visitor.id} className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{visitor.name}</h4>
                      <p className="text-sm text-gray-600">{visitor.phone}</p>
                      <p className="text-sm text-gray-500">{visitor.purpose}</p>
                      <p className="text-xs text-gray-400">
                        Scheduled: {formatDateTime(visitor.scheduledTime)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(visitor.id)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(visitor.id)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingVisitors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No pending approvals</p>
                </div>
              )}
            </div>
          </div>

          {/* Approved - Ready for Check-in */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Ready for Entry ({approvedVisitors.length})
              </h3>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {approvedVisitors.map((visitor) => (
                <div key={visitor.id} className="border border-green-200 rounded-xl p-4 bg-green-50">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{visitor.name}</h4>
                      <p className="text-sm text-gray-600">{visitor.phone}</p>
                      <p className="text-sm text-gray-500">{visitor.purpose}</p>
                      <p className="text-xs text-gray-400">
                        Approved: {formatDateTime(visitor.approvedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckin(visitor.id)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Check In
                    </button>
                  </div>
                </div>
              ))}
              {approvedVisitors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No approved visitors</p>
                </div>
              )}
            </div>
          </div>

          {/* Checked In - Inside Premises */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Inside Premises ({checkedInVisitors.length})
              </h3>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {checkedInVisitors.map((visitor) => (
                <div key={visitor.id} className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{visitor.name}</h4>
                      <p className="text-sm text-gray-600">{visitor.phone}</p>
                      <p className="text-sm text-gray-500">{visitor.purpose}</p>
                      <p className="text-xs text-gray-400">
                        Entered: {formatDateTime(visitor.checkedInAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckout(visitor.id)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Check Out
                    </button>
                  </div>
                </div>
              ))}
              {checkedInVisitors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No visitors inside</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Visitors Table */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">All Visitors Today</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visitor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visitors.slice(0, 15).map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{visitor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{visitor.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{visitor.purpose}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        visitor.status === 'approved' ? 'bg-green-100 text-green-800' :
                        visitor.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                        visitor.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                        visitor.status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {visitor.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(visitor.scheduledTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visitors.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No visitors today</p>
                <p className="text-sm">All visitor activities will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardPanel;