import React from 'react';
import ApiService from '../services/api';
import { CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';

const GuardPanel = ({ visitors }) => {
  const handleCheckin = async (visitorId) => {
    try {
      await ApiService.checkinVisitor(visitorId);
    } catch (error) {
      console.error('Error checking in visitor:', error);
    }
  };

  const handleCheckout = async (visitorId) => {
    try {
      await ApiService.checkoutVisitor(visitorId);
    } catch (error) {
      console.error('Error checking out visitor:', error);
    }
  };

  const approvedVisitors = visitors.filter(v => v.status === 'approved');
  const checkedInVisitors = visitors.filter(v => v.status === 'checked_in');

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Guard Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-green-500" />
            Approved Visitors ({approvedVisitors.length})
          </h3>
          <div className="space-y-3">
            {approvedVisitors.map((visitor) => (
              <div key={visitor.id} className="border rounded-lg p-4 bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{visitor.name}</h4>
                    <p className="text-sm text-gray-600">{visitor.phone}</p>
                    <p className="text-sm text-gray-500">{visitor.purpose}</p>
                    <p className="text-xs text-gray-400">
                      Scheduled: {new Date(visitor.scheduledTime.seconds * 1000).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckin(visitor.id)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    Check In
                  </button>
                </div>
              </div>
            ))}
            {approvedVisitors.length === 0 && (
              <p className="text-gray-500 text-center py-4">No approved visitors</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-blue-500" />
            Checked In Visitors ({checkedInVisitors.length})
          </h3>
          <div className="space-y-3">
            {checkedInVisitors.map((visitor) => (
              <div key={visitor.id} className="border rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{visitor.name}</h4>
                    <p className="text-sm text-gray-600">{visitor.phone}</p>
                    <p className="text-sm text-gray-500">{visitor.purpose}</p>
                    <p className="text-xs text-gray-400">
                      Checked in: {visitor.checkedInAt && new Date(visitor.checkedInAt.seconds * 1000).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckout(visitor.id)}
                    className="flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Check Out
                  </button>
                </div>
              </div>
            ))}
            {checkedInVisitors.length === 0 && (
              <p className="text-gray-500 text-center py-4">No checked in visitors</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">All Visitors Today</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visitors.slice(0, 10).map((visitor) => (
                <tr key={visitor.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {visitor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visitor.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visitor.purpose}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                    {visitor.scheduledTime && new Date(visitor.scheduledTime.seconds * 1000).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GuardPanel;