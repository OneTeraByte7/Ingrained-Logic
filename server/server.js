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

    const message = {
      notification: {
        title: 'Visitor Approved',
        body: `${visitor.name} has been approved for entry`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(message);

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

    const message = {
      notification: {
        title: 'Visitor Denied',
        body: `${visitor.name} entry has been denied`
      },
      topic: `household_${visitor.hostHouseholdId}`
    };

    await messaging.send(message);

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

    const tools = [
      {
        type: 'function',
        function: {
          name: 'approve_visitor',
          description: 'Approve a pending visitor by name',
          parameters: {
            type: 'object',
            properties: {
              visitorName: {
                type: 'string',
                description: 'The exact name of the visitor to approve'
              }
            },
            required: ['visitorName'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'deny_visitor',
          description: 'Deny a pending visitor by name with optional reason',
          parameters: {
            type: 'object',
            properties: {
              visitorName: {
                type: 'string',
                description: 'The exact name of the visitor to deny'
              },
              reason: {
                type: 'string',
                description: 'Optional reason for denial'
              }
            },
            required: ['visitorName'],
            additionalProperties: false
          }
        }
      }
    ];

    if (['guard', 'admin'].includes(userRole)) {
      tools.push({
        type: 'function',
        function: {
          name: 'checkin_visitor',
          description: 'Check in an approved visitor by name',
          parameters: {
            type: 'object',
            properties: {
              visitorName: {
                type: 'string',
                description: 'The exact name of the visitor to check in'
              }
            },
            required: ['visitorName'],
            additionalProperties: false
          }
        }
      });

      tools.push({
        type: 'function',
        function: {
          name: 'checkout_visitor',
          description: 'Check out a checked-in visitor by name',
          parameters: {
            type: 'object',
            properties: {
              visitorName: {
                type: 'string',
                description: 'The exact name of the visitor to check out'
              }
            },
            required: ['visitorName'],
            additionalProperties: false
          }
        }
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a community gate management system. Help users manage visitors efficiently.
          
Current user role: ${userRole}
Available actions:
- Residents: approve/deny visitors for their household
- Guards: check in/out approved visitors
- Admins: all actions

Be concise and helpful. Use the available functions to perform actions when requested.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      tools,
      tool_choice: 'auto',
      response_format: {
        type: 'json_object'
      }
    });

    const responseMessage = completion.choices[0].message;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let visitor = null;
      if (functionArgs.visitorName) {
        let visitorsQuery;
        
        if (userRole === 'resident') {
          visitorsQuery = db.collection('visitors')
            .where('hostHouseholdId', '==', req.user.householdId)
            .where('name', '>=', functionArgs.visitorName)
            .where('name', '<=', functionArgs.visitorName + '\uf8ff')
            .limit(1);
        } else {
          visitorsQuery = db.collection('visitors')
            .where('name', '>=', functionArgs.visitorName)
            .where('name', '<=', functionArgs.visitorName + '\uf8ff')
            .limit(1);
        }
        
        const visitorsSnap = await visitorsQuery.get();
        if (!visitorsSnap.empty) {
          visitor = { id: visitorsSnap.docs[0].id, ...visitorsSnap.docs[0].data() };
        }
      }

      if (!visitor) {
        return res.json({ 
          message: `Visitor "${functionArgs.visitorName}" not found. Please check the name and try again.`,
          success: false
        });
      }

      let result;
      switch (functionName) {
        case 'approve_visitor':
          result = await executeApproval(visitor.id, req.user);
          break;
        case 'deny_visitor':
          result = await executeDenial(visitor.id, functionArgs.reason, req.user);
          break;
        case 'checkin_visitor':
          result = await executeCheckin(visitor.id, req.user);
          break;
        case 'checkout_visitor':
          result = await executeCheckout(visitor.id, req.user);
          break;
        default:
          result = { success: false, message: 'Unknown action' };
      }

      res.json({
        message: result.message,
        action: functionName,
        success: result.success,
        visitorName: visitor.name
      });
    } else {
      let responseContent;
      try {
        const jsonResponse = JSON.parse(responseMessage.content);
        responseContent = jsonResponse.message || responseMessage.content;
      } catch {
        responseContent = responseMessage.content || "I'm here to help you manage visitors. Try commands like 'approve John' or 'check in Mary'.";
      }

      res.json({ 
        message: responseContent,
        success: true 
      });
    }
  } catch (error) {
    console.error('Error processing chat:', error);
    
    let errorMessage = 'Sorry, I encountered an error processing your request.';
    if (error.message.includes('OpenAI')) {
      errorMessage = 'AI service is temporarily unavailable. Please try the manual buttons instead.';
    }
    
    res.json({ 
      message: errorMessage,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});