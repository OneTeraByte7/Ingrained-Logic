require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');
const OpenAI = require('openai');

const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// NEW: Resident can add visitor
app.post('/addVisitor', authenticateUser, async (req, res) => {
  try {
    const { name, phone, purpose, scheduledTime } = req.body;
    const userRole = req.user.role;

    if (!['resident', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only residents can add visitors' });
    }

    // Input validation
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const visitorData = {
      name,
      phone,
      purpose: purpose || '',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      hostHouseholdId: req.user.householdId,
      hostUserId: req.user.uid,
      createdBy: req.user.uid,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const visitorRef = await db.collection('visitors').add(visitorData);

    // Log event
    await db.collection('events').add({
      type: 'visitor_added',
      actorUserId: req.user.uid,
      subjectId: visitorRef.id,
      payload: { visitorName: name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify guards about new visitor request
    const message = {
      notification: {
        title: 'New Visitor Request',
        body: `${name} is requesting to visit. Please check for approval.`
      },
      topic: 'guards',
      data: {
        visitorId: visitorRef.id,
        action: 'visitor_request'
      }
    };

    await messaging.send(message);

    res.json({ 
      success: true, 
      message: 'Visitor added successfully',
      visitorId: visitorRef.id 
    });
  } catch (error) {
    console.error('Error adding visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Get visitors based on user role
app.get('/visitors', authenticateUser, async (req, res) => {
  try {
    const userRole = req.user.role;
    let visitorsQuery;

    if (userRole === 'resident') {
      // Residents see only their own visitors
      visitorsQuery = db.collection('visitors')
        .where('hostHouseholdId', '==', req.user.householdId);
    } else if (userRole === 'guard') {
      // Guards see approved visitors for check-in/out
      visitorsQuery = db.collection('visitors')
        .where('status', 'in', ['approved', 'checked_in']);
    } else if (userRole === 'admin') {
      // Admins see all visitors
      visitorsQuery = db.collection('visitors');
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const visitorsSnap = await visitorsQuery.get();
    let visitors = visitorsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      approvedAt: doc.data().approvedAt?.toDate(),
      deniedAt: doc.data().deniedAt?.toDate(),
      checkedInAt: doc.data().checkedInAt?.toDate(),
      checkedOutAt: doc.data().checkedOutAt?.toDate()
    }));

    // Sort by createdAt in JavaScript instead of Firestore
    visitors.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });

    res.json({ success: true, visitors });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATED: Guard can request approval from resident
app.post('/requestApproval', authenticateUser, async (req, res) => {
  try {
    const { visitorId } = req.body;
    const userRole = req.user.role;

    if (!['guard', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only guards can request approval' });
    }

    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'pending') {
      return res.status(400).json({ error: 'Visitor is not in pending status' });
    }

    // Update visitor with approval request timestamp
    await visitorRef.update({
      approvalRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvalRequestedBy: req.user.uid
    });

    // Notify the resident household about approval request
    const message = {
      notification: {
        title: 'Visitor Approval Required',
        body: `${visitor.name} is at the gate. Please approve or deny entry.`
      },
      topic: `household_${visitor.hostHouseholdId}`,
      data: {
        visitorId: visitorId,
        action: 'approval_request'
      }
    };

    await messaging.send(message);

    // Log event
    await db.collection('events').add({
      type: 'approval_requested',
      actorUserId: req.user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Approval request sent to resident' });
  } catch (error) {
    console.error('Error requesting approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/approveVisitor', authenticateUser, async (req, res) => {
  try {
    const { visitorId } = req.body;
    const userRole = req.user.role;

    if (!['resident', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'pending') {
      return res.status(400).json({ error: 'Visitor is not pending approval' });
    }

    if (userRole === 'resident' && visitor.hostHouseholdId !== req.user.householdId) {
      return res.status(403).json({ error: 'Can only approve visitors for your household' });
    }

    await visitorRef.update({
      status: 'approved',
      approvedBy: req.user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_approved',
      actorUserId: req.user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify guards that visitor is approved for check-in
    const guardMessage = {
      notification: {
        title: 'Visitor Approved',
        body: `${visitor.name} has been approved and can be checked in`
      },
      topic: 'guards',
      data: {
        visitorId: visitorId,
        action: 'visitor_approved'
      }
    };

    await messaging.send(guardMessage);

    // Notify household
    const householdMessage = {
      notification: {
        title: 'Visitor Approved',
        body: `${visitor.name} has been approved for entry`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(householdMessage);

    res.json({ success: true, message: 'Visitor approved successfully' });
  } catch (error) {
    console.error('Error approving visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/denyVisitor', authenticateUser, async (req, res) => {
  try {
    const { visitorId, reason } = req.body;
    const userRole = req.user.role;

    if (!['resident', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'pending') {
      return res.status(400).json({ error: 'Visitor is not pending approval' });
    }

    if (userRole === 'resident' && visitor.hostHouseholdId !== req.user.householdId) {
      return res.status(403).json({ error: 'Can only deny visitors for your household' });
    }

    await visitorRef.update({
      status: 'denied',
      deniedBy: req.user.uid,
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
      denialReason: reason || ''
    });

    await db.collection('events').add({
      type: 'visitor_denied',
      actorUserId: req.user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name, reason },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify guards about denial
    const guardMessage = {
      notification: {
        title: 'Visitor Denied',
        body: `${visitor.name} entry has been denied`
      },
      topic: 'guards',
      data: {
        visitorId: visitorId,
        action: 'visitor_denied'
      }
    };

    await messaging.send(guardMessage);

    // Notify household
    const householdMessage = {
      notification: {
        title: 'Visitor Denied',
        body: `${visitor.name} entry has been denied`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(householdMessage);

    res.json({ success: true, message: 'Visitor denied successfully' });
  } catch (error) {
    console.error('Error denying visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/checkin', authenticateUser, async (req, res) => {
  try {
    const { visitorId } = req.body;
    const userRole = req.user.role;

    if (!['guard', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only guards can check in visitors' });
    }

    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'approved') {
      return res.status(400).json({ error: 'Visitor must be approved before check-in' });
    }

    await visitorRef.update({
      status: 'checked_in',
      checkedInBy: req.user.uid,
      checkedInAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_checked_in',
      actorUserId: req.user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const message = {
      notification: {
        title: 'Visitor Checked In',
        body: `${visitor.name} has entered the premises`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(message);

    res.json({ success: true, message: 'Visitor checked in successfully' });
  } catch (error) {
    console.error('Error checking in visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const { visitorId } = req.body;
    const userRole = req.user.role;

    if (!['guard', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only guards can check out visitors' });
    }

    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'checked_in') {
      return res.status(400).json({ error: 'Visitor must be checked in before checkout' });
    }

    await visitorRef.update({
      status: 'checked_out',
      checkedOutBy: req.user.uid,
      checkedOutAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_checked_out',
      actorUserId: req.user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const message = {
      notification: {
        title: 'Visitor Checked Out',
        body: `${visitor.name} has left the premises`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(message);

    res.json({ success: true, message: 'Visitor checked out successfully' });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/notify', authenticateUser, async (req, res) => {
  try {
    const { title, body, topic } = req.body;

    const message = {
      notification: { title, body },
      topic: topic || 'all'
    };

    await messaging.send(message);

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/chat', authenticateUser, async (req, res) => {
  try {
    const { message } = req.body;
    const userRole = req.user.role;

    console.log(`Chat request from ${userRole}: "${message}"`);

    // Input validation
    if (!message || typeof message !== 'string') {
      return res.json({
        message: 'Please provide a valid message.',
        success: false,
        error: true
      });
    }

    // Simple pattern matching as fallback if OpenAI fails
    const lowerMessage = message.toLowerCase().trim();
    
    // Extract visitor name from common patterns
    let visitorName = null;
    let action = null;
    
    if (lowerMessage.includes('approve')) {
      action = 'approve';
      visitorName = lowerMessage.replace(/approve\s+/i, '').trim();
    } else if (lowerMessage.includes('deny')) {
      action = 'deny';
      visitorName = lowerMessage.replace(/deny\s+/i, '').trim();
    } else if (lowerMessage.includes('check in')) {
      action = 'checkin';
      visitorName = lowerMessage.replace(/check\s+in\s+/i, '').trim();
    } else if (lowerMessage.includes('check out')) {
      action = 'checkout';
      visitorName = lowerMessage.replace(/check\s+out\s+/i, '').trim();
    }

    // If we have a direct action, process it without OpenAI
    if (action && visitorName) {
      console.log(`Direct action detected: ${action} for visitor: ${visitorName}`);
      
      // Find visitor
      let visitor = null;
      try {
        let visitorsQuery;
        
        if (userRole === 'resident') {
          visitorsQuery = db.collection('visitors')
            .where('hostHouseholdId', '==', req.user.householdId);
        } else {
          visitorsQuery = db.collection('visitors');
        }
        
        const visitorsSnap = await visitorsQuery.get();
        
        // Search for visitor by name (case-insensitive)
        const visitorDoc = visitorsSnap.docs.find(doc => {
          const data = doc.data();
          return data.name && data.name.toLowerCase().includes(visitorName.toLowerCase());
        });
        
        if (visitorDoc) {
          visitor = { id: visitorDoc.id, ...visitorDoc.data() };
          console.log(`Found visitor: ${visitor.name} (${visitor.id})`);
        }
      } catch (searchError) {
        console.error('Error searching for visitor:', searchError);
        return res.json({
          message: `Error searching for visitor: ${searchError.message}`,
          success: false,
          error: true
        });
      }

      if (!visitor) {
        return res.json({ 
          message: `Visitor "${visitorName}" not found. Please check the name and try again.`,
          success: false
        });
      }

      // Execute the action
      let result;
      try {
        switch (action) {
          case 'approve':
            if (!['resident', 'admin'].includes(userRole)) {
              return res.json({
                message: 'Only residents and admins can approve visitors.',
                success: false
              });
            }
            result = await executeApproval(visitor.id, req.user);
            break;
          case 'deny':
            if (!['resident', 'admin'].includes(userRole)) {
              return res.json({
                message: 'Only residents and admins can deny visitors.',
                success: false
              });
            }
            // Extract reason from message if present
            const reason = lowerMessage.includes('due to') ? 
              lowerMessage.split('due to')[1]?.trim() : '';
            result = await executeDenial(visitor.id, reason, req.user);
            break;
          case 'checkin':
            if (!['guard', 'admin'].includes(userRole)) {
              return res.json({
                message: 'Only guards and admins can check in visitors.',
                success: false
              });
            }
            result = await executeCheckin(visitor.id, req.user);
            break;
          case 'checkout':
            if (!['guard', 'admin'].includes(userRole)) {
              return res.json({
                message: 'Only guards and admins can check out visitors.',
                success: false
              });
            }
            result = await executeCheckout(visitor.id, req.user);
            break;
          default:
            result = { success: false, message: 'Unknown action' };
        }

        return res.json({
          message: result.message,
          action: action,
          success: result.success,
          visitorName: visitor.name
        });
      } catch (actionError) {
        console.error(`Error executing ${action}:`, actionError);
        return res.json({
          message: `Error executing ${action}: ${actionError.message}`,
          success: false,
          error: true
        });
      }
    }

    // Fallback response for non-action messages
    return res.json({
      message: `I understand you said "${message}". Try specific commands like:\n• "approve [name]" to approve a visitor\n• "deny [name]" to deny a visitor\n• "check in [name]" to check in a visitor (guards/admin)\n• "check out [name]" to check out a visitor (guards/admin)`,
      success: true
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    
    return res.json({ 
      message: `Sorry, there was an error processing your request: ${error.message}`,
      success: false,
      error: true 
    });
  }
});

async function executeApproval(visitorId, user) {
  try {
    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return { success: false, message: 'Visitor not found' };
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'pending') {
      return { success: false, message: 'Visitor is not pending approval' };
    }

    if (user.role === 'resident' && visitor.hostHouseholdId !== user.householdId) {
      return { success: false, message: 'Can only approve visitors for your household' };
    }

    await visitorRef.update({
      status: 'approved',
      approvedBy: user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_approved',
      actorUserId: user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: `${visitor.name} has been approved successfully` };
  } catch (error) {
    return { success: false, message: 'Error approving visitor' };
  }
}

async function executeDenial(visitorId, reason, user) {
  try {
    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return { success: false, message: 'Visitor not found' };
    }

    const visitor = visitorSnap.data();

    await visitorRef.update({
      status: 'denied',
      deniedBy: user.uid,
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
      denialReason: reason || ''
    });

    await db.collection('events').add({
      type: 'visitor_denied',
      actorUserId: user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name, reason },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: `${visitor.name} has been denied` };
  } catch (error) {
    return { success: false, message: 'Error denying visitor' };
  }
}

async function executeCheckin(visitorId, user) {
  try {
    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return { success: false, message: 'Visitor not found' };
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'approved') {
      return { success: false, message: 'Visitor must be approved before check-in' };
    }

    await visitorRef.update({
      status: 'checked_in',
      checkedInBy: user.uid,
      checkedInAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_checked_in',
      actorUserId: user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: `${visitor.name} has been checked in successfully` };
  } catch (error) {
    return { success: false, message: 'Error checking in visitor' };
  }
}

async function executeCheckout(visitorId, user) {
  try {
    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return { success: false, message: 'Visitor not found' };
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'checked_in') {
      return { success: false, message: 'Visitor must be checked in before checkout' };
    }

    await visitorRef.update({
      status: 'checked_out',
      checkedOutBy: user.uid,
      checkedOutAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('events').add({
      type: 'visitor_checked_out',
      actorUserId: user.uid,
      subjectId: visitorId,
      payload: { visitorName: visitor.name },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: `${visitor.name} has been checked out successfully` };
  } catch (error) {
    return { success: false, message: 'Error checking out visitor' };
  }
}

async function executeRequestApproval(visitorId, user) {
  try {
    const visitorRef = db.collection('visitors').doc(visitorId);
    const visitorSnap = await visitorRef.get();

    if (!visitorSnap.exists) {
      return { success: false, message: 'Visitor not found' };
    }

    const visitor = visitorSnap.data();

    if (visitor.status !== 'pending') {
      return { success: false, message: 'Visitor is not in pending status' };
    }

    await visitorRef.update({
      approvalRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvalRequestedBy: user.uid
    });

    const message = {
      notification: {
        title: 'Visitor Approval Required',
        body: `${visitor.name} is at the gate. Please approve or deny entry.`
      },
      topic: `household_${visitor.hostHouseholdId}`,
      data: {
        visitorId: visitorId,
        action: 'approval_request'
      }
    };

    await messaging.send(message);

    return { success: true, message: `Approval request sent for ${visitor.name}` };
  } catch (error) {
    return { success: false, message: 'Error requesting approval' };
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});