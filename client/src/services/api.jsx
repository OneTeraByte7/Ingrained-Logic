import { auth } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://ingrainedlogic.onrender.com';

class ApiService {
  async makeRequest(endpoint, options = {}) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }

  // NEW: Get visitors based on user role
  async getVisitors() {
    return this.makeRequest('/visitors', {
      method: 'GET'
    });
  }

  // NEW: Add visitor
  async addVisitor(visitorData) {
    return this.makeRequest('/addVisitor', {
      method: 'POST',
      body: JSON.stringify(visitorData)
    });
  }

  // NEW: Request approval (for guards)
  async requestApproval(visitorId) {
    return this.makeRequest('/requestApproval', {
      method: 'POST',
      body: JSON.stringify({ visitorId })
    });
  }

  async approveVisitor(visitorId) {
    return this.makeRequest('/approveVisitor', {
      method: 'POST',
      body: JSON.stringify({ visitorId })
    });
  }

  async denyVisitor(visitorId, reason) {
    return this.makeRequest('/denyVisitor', {
      method: 'POST',
      body: JSON.stringify({ visitorId, reason })
    });
  }

  async checkinVisitor(visitorId) {
    return this.makeRequest('/checkin', {
      method: 'POST',
      body: JSON.stringify({ visitorId })
    });
  }

  async checkoutVisitor(visitorId) {
    return this.makeRequest('/checkout', {
      method: 'POST',
      body: JSON.stringify({ visitorId })
    });
  }

  async sendNotification(data) {
    return this.makeRequest('/notify', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async chatWithAI(message) {
    return this.makeRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}

export default new ApiService();