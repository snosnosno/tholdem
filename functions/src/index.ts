import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Recursively removes properties with `undefined` values from an object.
 * @param {any} obj The object to clean.
 * @return {any} The cleaned object.
 */
function removeUndefineds(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefineds).filter((item) => item !== undefined);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = removeUndefineds(obj[key]);
      if (value !== undefined) {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}

const db = admin.firestore();

// ... (other functions remain the same)

async function findAvailableDealerAndAssign(tableId: string, transaction: admin.firestore.Transaction) {
  const availableDealersQuery = db.collection('staff')
      .where('role', '==', 'Dealer')
      .where('status', '==', 'available')
      .orderBy('totalWorkMinutes', 'asc')
      .limit(1);

  const availableDealersSnapshot = await transaction.get(availableDealersQuery);

  if (!availableDealersSnapshot.empty) {
    const dealerToAssign = availableDealersSnapshot.docs[0];
    functions.logger.info(`Assigning dealer ${dealerToAssign.id} to table ${tableId}`);

    const tableRef = db.collection('tables').doc(tableId);
    transaction.update(tableRef, { assignedDealerId: dealerToAssign.id });
    transaction.update(dealerToAssign.ref, {
      status: 'on_table',
      assignedTableId: tableId,
    });
  } else {
    functions.logger.warn(`No available dealers to assign to table ${tableId}`);
  }
}

async function releaseDealerFromTable(dealerId: string, transaction: admin.firestore.Transaction) {
  const dealerRef = db.collection('staff').doc(dealerId);
  functions.logger.info(`Releasing dealer ${dealerId}`);
  transaction.update(dealerRef, { status: 'available', assignedTableId: null });
}

export const onTableStatusChange = functions.firestore
    .document('tables/{tableId}')
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();
      if (before.status === after.status) return null;
      return db.runTransaction(async (transaction) => {
        if (after.status === 'open' && !after.assignedDealerId) {
            await findAvailableDealerAndAssign(context.params.tableId, transaction);
        } else if (after.status === 'closed' && before.assignedDealerId) {
            await releaseDealerFromTable(before.assignedDealerId, transaction);
        }
      });
    });

export const setDealerBreak = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const { dealerId, durationMinutes } = data;
  if (!dealerId || !durationMinutes) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing "dealerId" or "durationMinutes".');
  }
  const dealerRef = db.collection('staff').doc(dealerId);
  const breakEndTime = Date.now() + durationMinutes * 60 * 1000;
  try {
    await dealerRef.update({ status: 'on_break', lastBreakStart: Date.now(), breakUntil: breakEndTime });
    functions.logger.info(`Dealer ${dealerId} is on break for ${durationMinutes} minutes.`);
    return { success: true, breakUntil: breakEndTime };
  } catch (error) {
    functions.logger.error(`Error setting break for dealer ${dealerId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to set dealer break.');
  }
});

export const assignDealerManually = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { tableId, dealerId } = data;
    if (!tableId || !dealerId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing "tableId" or "dealerId".');
    }
    const tableRef = db.collection('tables').doc(tableId);
    const dealerRef = db.collection('staff').doc(dealerId);
    try {
        await db.runTransaction(async (transaction) => {
            transaction.update(tableRef, { assignedDealerId: dealerId });
            transaction.update(dealerRef, { status: 'on_table', assignedTableId: tableId });
        });
        return { success: true };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to assign dealer.');
    }
});


// HTTPS Callable Function: to log an action from the client
export const logAction = functions.https.onCall(async (data, context) => {
  functions.logger.info("LogAction function triggered. Received data:", data);

  if (!context.auth) {
    functions.logger.error("Authentication check failed. User is not authenticated.");
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { action, details } = data;
  if (!action) {
    functions.logger.error("Invalid arguments: 'action' is missing.", data);
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with an 'action' argument.");
  }

  const uid = context.auth.uid;
  let userName = "Anonymous";
  try {
    const userDoc = await db.collection("staff").doc(uid).get();
    if (userDoc.exists) {
        userName = userDoc.data()?.name || context.auth.token.name || "Anonymous";
    }
  } catch(err) {
      functions.logger.warn(`Could not fetch user name for uid: ${uid}`, err)
  }

  const cleanedDetails = removeUndefineds(details || {});

  try {
    const logData = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: action,
      userId: uid,
      userName: userName,
      details: cleanedDetails,
    };
    
    functions.logger.info("Attempting to write log to Firestore:", logData);
    await db.collection("logs").add(logData);
    functions.logger.info("Successfully wrote log to Firestore.");
    
    return { success: true };
  } catch (error) {
    functions.logger.error("FATAL: Error writing to Firestore log.", {
      action,
      userId: uid,
      details: cleanedDetails,
      error,
    });
    throw new functions.https.HttpsError("internal", "Failed to write log.", error);
  }
});

// HTTPS Callable Function: to set a custom role on a user
export const setRole = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'This function can only be called by an admin.');
  }
  const { email, role } = data;
  if (!email || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'The "email" and "role" arguments are required.');
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: role });
    const staffRef = db.collection('staff').doc(user.uid);
    await staffRef.set({ role: role }, { merge: true });
    return { message: `Success! ${email} has been made a ${role}.` };
  } catch (error) {
    functions.logger.error('Error setting custom claims for ' + email, error);
    throw new functions.https.HttpsError('internal', 'Error setting role.');
  }
});
