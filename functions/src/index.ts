import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

// CORS handler
const corsHandler = cors({ origin: true });

// --- Existing Functions (placeholders for brevity) ---
export const onApplicationStatusChange = functions.firestore.document('applications/{applicationId}').onUpdate(async (change, context) => { /* ... */ });
export const onJobPostingCreated = functions.firestore.document("jobPostings/{postId}").onCreate(async (snap, context) => { /* ... */ });
export const matchDealersToEvent = functions.https.onCall(async (data, context) => { /* ... */ });
export const assignDealerToEvent = functions.https.onCall(async (data, context) => { /* ... */ });
export const generateEventQrToken = functions.https.onCall(async (data, context) => { /* ... */ });
export const recordAttendance = functions.https.onCall(async (data, context) => { /* ... */ });
export const calculatePayrollsForEvent = functions.https.onCall(async (data, context) => { /* ... */ });
export const getPayrolls = functions.https.onCall(async (data, context) => { /* ... */ });
export const submitDealerRating = functions.https.onCall(async (data, context) => { /* ... */ });


// --- Authentication and Role Management Functions ---

/**
 * Handles a new user registration request.
 * - Dealers are created and enabled immediately.
 * - Managers are created as disabled and await admin approval.
 */
export const requestRegistration = functions.https.onCall(async (data) => {
    const { email, password, name, role, phone } = data; // Add phone

    if (!email || !password || !name || !role) { // phone is optional for now
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields for registration.');
    }
    if (role !== 'dealer' && role !== 'manager') {
        throw new functions.https.HttpsError('invalid-argument', 'Role must be either "dealer" or "manager".');
    }

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            disabled: true, // All users are created as disabled initially
        });

        let userRole = '';
        if (role === 'dealer') {
            await admin.auth().updateUser(userRecord.uid, { disabled: false });
            userRole = 'dealer';
        } else { // role === 'manager'
            userRole = 'pending_manager';
        }

        await admin.auth().setCustomUserClaims(userRecord.uid, { role: userRole });

        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            phone: phone || null, // Store phone, or null if not provided
            role: userRole,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: `Registration for ${name} as ${role} is processing.` };
    } catch (error: any) {
        console.error("Error during registration request:", error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error.message);
    }
});


/**
 * Processes a registration request for a manager, either approving or rejecting it.
 * Only callable by an admin.
 */
export const processRegistration = functions.https.onCall(async (data, context) => {
    // Ensure the caller is an admin
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can process registration requests.');
    }

    const { targetUid, action } = data; // action can be 'approve' or 'reject'

    if (!targetUid || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing "targetUid" or "action".');
    }

    const userRef = db.collection('users').doc(targetUid);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists || userDoc.data()?.role !== 'pending_manager') {
            throw new functions.https.HttpsError('not-found', 'The specified user is not awaiting approval.');
        }

        if (action === 'approve') {
            await admin.auth().updateUser(targetUid, { disabled: false });
            await admin.auth().setCustomUserClaims(targetUid, { role: 'manager' });
            await userRef.update({ role: 'manager' });
            return { success: true, message: 'User approved as manager.' };
        } else if (action === 'reject') {
            await admin.auth().deleteUser(targetUid);
            await userRef.delete();
            return { success: true, message: 'User registration rejected.' };
        } else {
            throw new functions.https.HttpsError('invalid-argument', 'Action must be "approve" or "reject".');
        }
    } catch (error: any) {
        console.error("Error processing registration:", error);
        throw new functions.https.HttpsError('internal', 'Failed to process registration.', error.message);
    }
});

/**
 * Creates a new user account, stores details in Firestore, and sets a custom role claim.
 */
export const createUserAccount = functions.https.onCall(async (data, context) => {
    // Ensure the caller is an admin
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create new user accounts.');
    }

    const { email, name, role } = data;
    if (!email || !name || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "email", "name", and "role" arguments.');
    }

    try {
        // Create the user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            displayName: name,
        });

        // Set the custom role claim on the user's token
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: role });

        // Create the user document in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { result: `Successfully created ${role}: ${name} (${email})` };
    } catch (error: any) {
        console.error("Error creating new user:", error);
        throw new functions.https.HttpsError('internal', error.message, error);
    }
});

/**
 * Firestore trigger that automatically sets a custom user claim whenever a user's role is
 * created or changed in the 'users' collection.
 */
export const onUserRoleChange = functions.firestore.document('users/{uid}').onWrite(async (change, context) => {
    const { uid } = context.params;
    const newRole = change.after.exists ? change.after.data()?.role : null;
    const oldRole = change.before.exists ? change.before.data()?.role : null;

    // Only update claims if the role has actually changed to prevent unnecessary writes.
    if (newRole === oldRole) {
        console.log(`User ${uid}: Role unchanged (${newRole}). No action taken.`);
        return null;
    }

    try {
        console.log(`Setting custom claim for user ${uid}. New role: ${newRole}`);
        await admin.auth().setCustomUserClaims(uid, { role: newRole });
        return { result: `Custom claim for ${uid} updated to ${newRole}.` };
    } catch (error) {
        console.error(`Failed to set custom claim for ${uid}`, error);
        return { error: 'Failed to set custom claim.' };
    }
});


// --- Dashboard Functions ---

export const getDashboardStats = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      // For security, you should validate the ID token here in a real app.
      const now = new Date();
      const ongoingEventsQuery = db.collection("events").where("endDate", ">=", now);
      const totalDealersQuery = db.collection("users").where("role", "==", "dealer");
      const topDealersQuery = db.collection("users")
        .where("role", "==", "dealer")
        .orderBy("rating", "desc")
        .limit(5);

      const [
        ongoingEventsSnapshot,
        totalDealersSnapshot,
        topDealersSnapshot,
      ] = await Promise.all([
        ongoingEventsQuery.get(),
        totalDealersQuery.get(),
        topDealersQuery.get(),
      ]);

      const topRatedDealers = topDealersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
      }));

      response.status(200).send({
        data: {
          ongoingEventsCount: ongoingEventsSnapshot.size,
          totalDealersCount: totalDealersSnapshot.size,
          topRatedDealers,
        },
      });
    } catch (error) {
      functions.logger.error("Error getting dashboard stats:", error);
      response.status(500).send({ data: { error: "Internal Server Error" } });
    }
  });
});
