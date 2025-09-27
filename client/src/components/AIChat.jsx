import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';
import { Send, Bot, User, MessageSquare, Sparkles, Check, AlertCircle } from 'lucide-react';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hi! I\'m your AI assistant. I can help you approve visitors, check them in/out, and more. Try saying "approve Ramesh" or "check in Mr. Verma".',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await ApiService.chatWithAI(inputMessage);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.message || 'I processed your request successfully!',
        action: response.action,
        success: response.success,
        timestamp: new Date(),
        error: response.error
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, there was an error: ${error.message}`,
        error: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickCommands = [
    { text: "approve ", label: "Approve" },
    { text: "deny ", label: "Deny" },
    { text: "check in ", label: "Check in" },
    { text: "show pending visitors", label: "Show pending" }
  ];

  const handleQuickCommand = (command) => {
    setInputMessage(command);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-full flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
              <p className="text-sm text-gray-600">Manage visitors with natural language commands</p>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: '500px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' 
                    : message.error 
                    ? 'bg-red-100 text-red-600 border-2 border-red-200'
                    : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                }`}>
                  {message.type === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-md ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block px-6 py-4 rounded-2xl shadow-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                      : message.error
                      ? 'bg-red-50 text-red-800 border-2 border-red-200'
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {/* Action Badge */}
                    {message.action && (
                      <div className="mt-3 flex items-center space-x-2">
                        {message.success ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs font-medium opacity-75">
                          Action: {message.action.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`mt-1 text-xs text-gray-500 ${
                    message.type === 'user' ? 'text-right' : ''
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Commands */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-3">Quick Commands:</p>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((cmd, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickCommand(cmd.text)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200 text-gray-700 hover:text-indigo-700"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a command like 'approve Ramesh' or 'check in Mr. Verma'"
                  className="block w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bot className="h-5 w-5 mr-2 text-indigo-500" />
            Available Commands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"approve [visitor name]"</p>
                  <p className="text-xs text-gray-600">Approve a pending visitor</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"deny [visitor name]"</p>
                  <p className="text-xs text-gray-600">Deny a pending visitor</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"check in [visitor name]"</p>
                  <p className="text-xs text-gray-600">Check in approved visitor (Guard/Admin)</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">"check out [visitor name]"</p>
                  <p className="text-xs text-gray-600">Check out visitor (Guard/Admin)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-800">
              💡 <strong>Pro tip:</strong> You can also provide reasons like "deny John due to security concerns"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;