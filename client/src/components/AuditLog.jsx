import React from 'react';
import { Clock, User, Shield, CheckCircle, XCircle } from 'lucide-react';

const AuditLog = ({ events }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'visitor_created':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'visitor_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'visitor_denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'visitor_checked_in':
        return <Shield className="h-4 w-4 text-indigo-500" />;
      case 'visitor_checked_out':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventDescription = (event) => {
    const payload = event.payload || {};
    switch (event.type) {
      case 'visitor_created':
        return `Created visitor entry for ${payload.visitorName || 'Unknown'}`;
      case 'visitor_approved':
        return `Approved visitor ${payload.visitorName || 'Unknown'}`;
      case 'visitor_denied':
        return `Denied visitor ${payload.visitorName || 'Unknown'}${payload.reason ? ` (Reason: ${payload.reason})` : ''}`;
      case 'visitor_checked_in':
        return `Checked in visitor ${payload.visitorName || 'Unknown'}`;
      case 'visitor_checked_out':
        return `Checked out visitor ${payload.visitorName || 'Unknown'}`;
      default:
        return `${event.type.replace('_', ' ')} - ${payload.visitorName || 'Unknown'}`;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'visitor_created':
        return 'bg-blue-50 border-blue-200';
      case 'visitor_approved':
        return 'bg-green-50 border-green-200';
      case 'visitor_denied':
        return 'bg-red-50 border-red-200';
      case 'visitor_checked_in':
        return 'bg-indigo-50 border-indigo-200';
      case 'visitor_checked_out':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h2>
      
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className={`border rounded-lg p-4 ${getEventColor(event.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {getEventDescription(event)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {event.timestamp && new Date(event.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                </div>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Actor: {event.actorUserId || 'System'}</span>
                  <span>Subject: {event.subjectId}</span>
                  <span className="capitalize">Type: {event.type.replace('_', ' ')}</span>
                </div>
                {event.payload && Object.keys(event.payload).length > 0 && (
                  <div className="mt-2 text-xs">
                    <details className="cursor-pointer">
                      <summary className="text-gray-600 hover:text-gray-800">View Details</summary>
                      <pre className="mt-1 bg-white p-2 rounded text-gray-700 overflow-x-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No audit events found</p>
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Event Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {events.filter(e => e.type === 'visitor_created').length}
            </p>
            <p className="text-xs text-gray-600">Created</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {events.filter(e => e.type === 'visitor_approved').length}
            </p>
            <p className="text-xs text-gray-600">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {events.filter(e => e.type === 'visitor_denied').length}
            </p>
            <p className="text-xs text-gray-600">Denied</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">
              {events.filter(e => e.type === 'visitor_checked_in').length}
            </p>
            <p className="text-xs text-gray-600">Checked In</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {events.filter(e => e.type === 'visitor_checked_out').length}
            </p>
            <p className="text-xs text-gray-600">Checked Out</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;