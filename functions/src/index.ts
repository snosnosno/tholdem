import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Finds the most suitable available dealer and assigns them to a table.
 * @param {string} tableId The ID of the table to assign the dealer to.
 * @param {admin.firestore.Transaction} transaction Firestore transaction.
 */
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

/**
 * Releases a dealer from a table, making them available.
 * @param {string} dealerId The ID of the dealer to release.
 * @param {admin.firestore.Transaction} transaction Firestore transaction.
 */
async function releaseDealerFromTable(dealerId: string, transaction: admin.firestore.Transaction) {
  const dealerRef = db.collection('staff').doc(dealerId);
  functions.logger.info(`Releasing dealer ${dealerId}`);
  transaction.update(dealerRef, { status: 'available', assignedTableId: null });
}


// Firestore Trigger: listens for changes on 'tables' documents
export const onTableStatusChange = functions.firestore
    .document('tables/{tableId}')
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();

      // Exit if status hasn't changed to 'open' or 'closed'
      if (before.status === after.status) {
        return null;
      }
      
      return db.runTransaction(async (transaction) => {
        // Table opened: find a dealer
        if (after.status === 'open' && !after.assignedDealerId) {
            await findAvailableDealerAndAssign(context.params.tableId, transaction);
        }
        // Table closed: release the dealer
        else if (after.status === 'closed' && before.assignedDealerId) {
            await releaseDealerFromTable(before.assignedDealerId, transaction);
        }
      });
    });

// HTTPS Callable Function: to set a dealer on a break
export const setDealerBreak = functions.https.onCall(async (data, context) => {
  // Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { dealerId, durationMinutes } = data;
  if (!dealerId || !durationMinutes) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "dealerId" and "durationMinutes" arguments.');
  }

  const dealerRef = db.collection('staff').doc(dealerId);
  const breakEndTime = Date.now() + durationMinutes * 60 * 1000;

  try {
    await dealerRef.update({ 
        status: 'on_break', 
        lastBreakStart: Date.now(),
        // In a real scenario, you'd use Cloud Tasks to schedule the status update back to 'available'
        // For now, we'll just log the intended end time.
        breakUntil: breakEndTime
    });
    functions.logger.info(`Dealer ${dealerId} is on break for ${durationMinutes} minutes.`);
    
    // This is where you would schedule a Cloud Task to run at `breakEndTime`
    // to set the status back to 'available'.

    return { success: true, breakUntil: breakEndTime };
  } catch (error) {
    functions.logger.error(`Error setting break for dealer ${dealerId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to set dealer break.');
  }
});

// A function to be called manually by TD for assignment
export const assignDealerManually = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    // You should also check if the caller has a 'TD' role.
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
