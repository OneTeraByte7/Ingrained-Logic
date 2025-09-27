require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = require('../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function seedData() {
  try {
    console.log('Starting seed process...');

    const residentUser = await auth.createUser({
      email: 'resident@test.com',
      password: 'password123',
      displayName: 'Soham'
    });

    const guardUser = await auth.createUser({
      email: 'guard@test.com',
      password: 'password123',
      displayName: 'Security Guard'
    });

    const adminUser = await auth.createUser({
      email: 'admin@test.com',
      password: 'password123',
      displayName: 'Admin User'
    });

    await auth.setCustomUserClaims(residentUser.uid, {
      role: 'resident',
      householdId: 'household_001'
    });

    await auth.setCustomUserClaims(guardUser.uid, {
      role: 'guard'
    });

    await auth.setCustomUserClaims(adminUser.uid, {
      role: 'admin',
      householdId: 'admin_household'
    });

    await db.collection('users').doc(residentUser.uid).set({
      displayName: 'Soham',
      email: 'resident@test.com',
      householdId: 'household_001',
      roles: ['resident'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(guardUser.uid).set({
      displayName: 'Security Guard',
      email: 'guard@test.com',
      roles: ['guard'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('users').doc(adminUser.uid).set({
      displayName: 'Admin User',
      email: 'admin@test.com',
      householdId: 'admin_household',
      roles: ['admin'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('households').doc('household_001').set({
      flatNo: 'A-101',
      name: 'Doe Family',
      members: [residentUser.uid],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('visitors').add({
      name: 'Ramesh Kumar',
      phone: '+91-9876543210',
      purpose: 'Delivery',
      hostHouseholdId: 'household_001',
      status: 'pending',
      createdBy: residentUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledTime: new Date()
    });

    await db.collection('visitors').add({
      name: 'Mr. Verma',
      phone: '+91-9876543211',
      purpose: 'Meeting',
      hostHouseholdId: 'household_001',
      status: 'approved',
      createdBy: residentUser.uid,
      approvedBy: residentUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledTime: new Date()
    });

    await db.collection('events').add({
      type: 'visitor_created',
      actorUserId: residentUser.uid,
      subjectId: 'seed_visitor_1',
      payload: { visitorName: 'Ramesh Kumar' },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Seed data created successfully!');
    console.log('\nDemo Accounts:');
    console.log('Resident: resident@test.com / password123');
    console.log('Guard: guard@test.com / password123');
    console.log('Admin: admin@test.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();