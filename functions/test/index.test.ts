import firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';
import { expect } from 'chai';
import { getDashboardStats } from '../src/index';

// Initialize the test environment in online mode to use the Firestore emulator
const testEnv = firebaseFunctionsTest({
  projectId: 't-holdem-cbe4d', // Use a real project ID
});

describe('Dashboard Functions with Emulator', () => {

  // Seed the emulator with test data before each test
  beforeEach(async () => {
    const db = admin.firestore();
    const batch = db.batch();

    // Clear previous data
    const eventsSnap = await db.collection('events').get();
    eventsSnap.docs.forEach(doc => batch.delete(doc.ref));
    const usersSnap = await db.collection('users').get();
    usersSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Create new test data
    const writeBatch = db.batch();

    // Events
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 5);
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 5);
    
    const eventsCol = db.collection('events');
    writeBatch.set(eventsCol.doc('event1'), { name: 'Ongoing Event', endDate: admin.firestore.Timestamp.fromDate(futureDate) });
    writeBatch.set(eventsCol.doc('event2'), { name: 'Past Event', endDate: admin.firestore.Timestamp.fromDate(pastDate) });

    // Users
    const usersCol = db.collection('users');
    writeBatch.set(usersCol.doc('dealer1'), { name: 'Jane Smith', role: 'dealer', rating: 4.9, ratingCount: 15 });
    writeBatch.set(usersCol.doc('dealer2'), { name: 'John Doe', role: 'dealer', rating: 4.8, ratingCount: 10 });
    writeBatch.set(usersCol.doc('dealer3'), { name: 'No Rating Dealer', role: 'dealer', rating: 3.0, ratingCount: 1 });
    writeBatch.set(usersCol.doc('admin1'), { name: 'Admin User', role: 'admin' });

    await writeBatch.commit();
  });

  after(() => {
    // Cleanup the test environment
    testEnv.cleanup();
  });

  it('should return correct stats for an admin user', async () => {
    const wrapped = testEnv.wrap(getDashboardStats);

    const context = {
      auth: { uid: 'adminUserId', token: { role: 'admin' } }
    };

    const result = await wrapped({}, context);

    expect(result.ongoingEventsCount).to.equal(1);
    expect(result.totalDealersCount).to.equal(3);
    expect(result.topRatedDealers).to.be.an('array').with.lengthOf(3);
    expect(result.topRatedDealers[0].name).to.equal('Jane Smith');
    expect(result.topRatedDealers[0].rating).to.equal(4.9);
  });

  it('should deny access to non-admin users', async () => {
    const wrapped = testEnv.wrap(getDashboardStats);
    const context = { auth: { uid: 'dealerUserId', token: { role: 'dealer' } } };

    try {
      await wrapped({}, context);
      expect.fail('The function should have thrown a permission-denied error.');
    } catch (error: any) {
      expect(error.code).to.equal('permission-denied');
      expect(error.message).to.equal('Only admins can access dashboard statistics.');
    }
  });
});
