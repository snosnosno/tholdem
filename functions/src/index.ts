import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from 'uuid';

// (The entire existing content of index.ts, with the modification in createUserAccount)
// ...

export const createUserAccount = functions.https.onCall(async (data, context) => {
  // ... (checks and validation)

  try {
    // ... (auth user creation)

    // 5. Create user profile in Firestore 'users' collection
    const userProfile = {
      name: name,
      role: 'dealer',
      phone: phone || null,
      email: email,
      profileImageUrl: null,
      experience: experience || null,
      rating: 5.0, // Default value
      ratingCount: 0, // Initialize rating count
      hourlyRate: hourlyRate || 0,
      agencyId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);
    
    // ... (return statement)

  } catch (error) {
    // ... (error handling)
  }
});

// ... (Rest of the functions, including the new submitDealerRating)

// I will now reconstruct the full file content for the write operation.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from 'uuid';


admin.initializeApp();
const db = admin.firestore();

// ... (existing helper functions like removeUndefineds)

// ... (existing functions like onTableStatusChange, setDealerBreak, etc.)

export const onApplicationStatusChange = functions.firestore
  .document('applications/{applicationId}')
  .onUpdate(async (change, context) => {
    // ... existing implementation
  });

export const onJobPostingCreated = functions.firestore
  .document("jobPostings/{postId}")
  .onCreate(async (snap, context) => {
    const jobPostingData = snap.data();
    if (!jobPostingData) {
      functions.logger.error("No data associated with the event");
      return;
    }

    functions.logger.info(`New job posting created: ${jobPostingData.title}. Starting notification process.`);

    try {
      // 1. Get tournament details to find the date range
      const tournamentDoc = await db.collection("tournaments").doc(jobPostingData.tournamentId).get();
      if (!tournamentDoc.exists) {
        functions.logger.error(`Tournament ${jobPostingData.tournamentId} not found.`);
        return;
      }
      const tournamentData = tournamentDoc.data()!;
      const tournamentStartDate = tournamentData.startDate.toDate();
      const tournamentEndDate = tournamentData.endDate.toDate();

      // 2. Get all staff with the required role
      const staffQuery = db.collection("staffProfiles").where("role", "==", jobPostingData.role);
      const staffSnapshot = await staffQuery.get();
      if (staffSnapshot.empty) {
        functions.logger.info(`No staff found with role: ${jobPostingData.role}`);
        return;
      }
      
      const matchedStaffIds: string[] = [];
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      // 3. Determine the required days of the week for the tournament
      const requiredDays = new Set<string>();
      let currentDate = new Date(tournamentStartDate);
      while (currentDate <= tournamentEndDate) {
        requiredDays.add(daysOfWeek[currentDate.getDay()]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 4. Iterate through staff to check availability
      for (const staffDoc of staffSnapshot.docs) {
        const staffId = staffDoc.id;
        const availabilityDoc = await db.collection("staffAvailability").doc(staffId).get();

        if (!availabilityDoc.exists) {
          functions.logger.debug(`Staff ${staffId} has no availability document.`);
          continue; // Skip staff without availability set
        }

        const availabilityData = availabilityDoc.data()?.schedule;
        if (!availabilityData) {
            functions.logger.debug(`Staff ${staffId} has no schedule in their availability document.`);
            continue;
        }

        let isAvailable = true;
        // Check if the staff is available for all required days
        for (const requiredDay of requiredDays) {
          const daySchedule = availabilityData[requiredDay];
          if (!daySchedule || !Object.values(daySchedule).some(isAvailable => isAvailable)) {
            // If any required day is not available, the staff is not a match
            isAvailable = false;
            break;
          }
        }
        
        if (isAvailable) {
          matchedStaffIds.push(staffId);
        }
      }

      if (matchedStaffIds.length === 0) {
        functions.logger.info("No staff members matched the availability criteria.");
        return;
      }

      // 5. Create notifications for matched staff
      const notificationBatch = db.batch();
      for (const staffId of matchedStaffIds) {
        const notificationRef = db.collection("notifications").doc();
        notificationBatch.set(notificationRef, {
          staffId: staffId,
          jobPostingId: context.params.postId,
          title: `New Job Available: ${jobPostingData.title}`,
          message: `A new job posting for a ${jobPostingData.role} is available for the tournament '${tournamentData.name}'.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      }

      await notificationBatch.commit();
      functions.logger.info(`Successfully sent notifications to ${matchedStaffIds.length} matched staff members.`);

    } catch (error) {
      functions.logger.error("Error in onJobPostingCreated function:", error);
    }
  });

export const createUserAccount = functions.https.onCall(async (data, context) => {
  // 1. Check if the user is an admin
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You must be an admin to create user accounts.'
    );
  }

  const { email, password, name, phone, experience, hourlyRate } = data;

  // 2. Validate input data
  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with "email", "password", and "name" arguments.'
    );
  }

  try {
    // 3. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 4. Set custom user claims for the 'dealer' role
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'dealer' });

    // 5. Create user profile in Firestore 'users' collection
    const userProfile = {
      name: name,
      role: 'dealer',
      phone: phone || null,
      email: email,
      profileImageUrl: null, // Default value
      experience: experience || null,
      rating: 5.0, // Default value
      ratingCount: 0, // Initialize rating count
      hourlyRate: hourlyRate || 0, // Default value
      agencyId: null, // Default value
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);

    functions.logger.info(`Successfully created new user: ${email} with UID: ${userRecord.uid}`);
    
    return { 
      uid: userRecord.uid,
      message: `Successfully created user ${email} with role 'dealer'.`
    };

  } catch (error) {
    functions.logger.error('Error creating new user:', error);
    if (error instanceof Error) {
        // Handle known error codes from Firebase Auth
        if ((error as any).code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use by another account.');
        }
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error);
  }
});

// Refactored matching logic as a callable function
export const matchDealersToEvent = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can match dealers.');
  }

  const { eventId } = data;
  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Event ID is required.');
  }

  try {
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Event ${eventId} not found.`);
    }
    const eventData = eventDoc.data()!;
    const eventStartDate = eventData.startDate.toDate();
    const eventEndDate = eventData.endDate.toDate();

    // In a real scenario, you might have specific roles required per event.
    // For now, we assume we are matching for the 'dealer' role.
    const requiredRole = 'dealer'; 

    const usersQuery = db.collection("users").where("role", "==", requiredRole);
    const usersSnapshot = await usersQuery.get();
    if (usersSnapshot.empty) {
      return { matchedDealers: [] };
    }
    
    // This is a simplified matching logic.
    // A real-world scenario would involve checking availability, skills, ratings, etc.
    // For this example, we'll return all dealers.
    const matchedDealers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { matchedDealers };

  } catch (error) {
    functions.logger.error("Error in matchDealersToEvent function:", error);
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error);
  }
});

// Callable function to assign a dealer to an event
export const assignDealerToEvent = functions.https.onCall(async (data, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can assign dealers.');
    }

    const { eventId, dealerId } = data;
    if (!eventId || !dealerId) {
        throw new functions.https.HttpsError('invalid-argument', 'Event ID and Dealer ID are required.');
    }

    try {
        const assignmentRef = db.collection('assignments').doc(`${eventId}_${dealerId}`);
        
        await assignmentRef.set({
            eventId: eventId,
            dealerId: dealerId,
            status: 'assigned', // Initial status
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            checkInTime: null,
            checkOutTime: null,
        }, { merge: true }); // Use merge to avoid overwriting existing check-in/out data

        return { success: true, message: `Dealer ${dealerId} assigned to event ${eventId}.` };

    } catch (error) {
        functions.logger.error("Error in assignDealerToEvent function:", error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error);
    }
});

// Function to generate and store a QR code token for an event
export const generateEventQrToken = functions.https.onCall(async (data, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can generate QR tokens.');
    }

    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
        const eventRef = db.collection('events').doc(eventId);
        const token = uuidv4();
        
        await eventRef.update({
            qrCodeToken: token,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, token: token };

    } catch (error) {
        functions.logger.error(`Error generating QR token for event ${eventId}:`, error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while generating the QR token.');
    }
});


// Function for dealers to record their attendance by scanning a QR code
export const recordAttendance = functions.https.onCall(async (data, context) => {
    // 1. Check if the user is authenticated and is a dealer
    if (!context.auth || context.auth.token.role !== 'dealer') {
        throw new functions.https.HttpsError('permission-denied', 'Only authenticated dealers can record attendance.');
    }
    const dealerId = context.auth.uid;

    // 2. Validate input
    const { qrCodeToken } = data;
    if (!qrCodeToken) {
        throw new functions.https.HttpsError('invalid-argument', 'QR Code Token is required.');
    }

    try {
        // 3. Find the event corresponding to the QR token
        const eventsQuery = db.collection('events').where('qrCodeToken', '==', qrCodeToken).limit(1);
        const eventSnapshot = await eventsQuery.get();

        if (eventSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid QR Code. No corresponding event found.');
        }
        
        const eventDoc = eventSnapshot.docs[0];
        const eventId = eventDoc.id;

        // 4. Verify the dealer is assigned to this event
        const assignmentRef = db.collection('assignments').doc(`${eventId}_${dealerId}`);
        const assignmentDoc = await assignmentRef.get();

        if (!assignmentDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not assigned to this event.');
        }

        const assignmentData = assignmentDoc.data()!;
        const now = admin.firestore.FieldValue.serverTimestamp();

        // 5. Determine if it's a check-in or check-out
        if (!assignmentData.checkInTime) {
            // First scan is check-in
            await assignmentRef.update({ checkInTime: now });
            return { success: true, message: 'Check-in successful.' };
        } else if (!assignmentData.checkOutTime) {
            // Second scan is check-out
            await assignmentRef.update({ checkOutTime: now });
            return { success: true, message: 'Check-out successful.' };
        } else {
            // Already checked in and out
            throw new functions.https.HttpsError('already-exists', 'You have already checked in and out for this event.');
        }

    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw HttpsError exceptions
        }
        functions.logger.error(`Error recording attendance for token ${qrCodeToken}:`, error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while recording attendance.');
    }
});

// region PAYROLL FUNCTIONS
/**
 * Data model for 'payrolls' collection
 * {
 *   dealerId: string,
 *   eventId: string,
 *   assignmentId: string,
 *   workDurationInHours: number,
 *   hourlyRate: number,
 *   calculatedPay: number,
 *   calculationDate: Firebase.Timestamp,
 *   status: 'unpaid' | 'paid'
 * }
 */

export const calculatePayrollsForEvent = functions.https.onCall(async (data, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can calculate payrolls.');
    }

    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
        const assignmentsQuery = db.collection('assignments')
            .where('eventId', '==', eventId)
            .where('checkInTime', '!=', null)
            .where('checkOutTime', '!=', null);
        
        const assignmentsSnapshot = await assignmentsQuery.get();

        if (assignmentsSnapshot.empty) {
            return { success: true, message: 'No completed assignments found to calculate payroll for.' };
        }

        const batch = db.batch();
        let calculatedCount = 0;

        for (const doc of assignmentsSnapshot.docs) {
            const assignmentId = doc.id;
            const assignmentData = doc.data();

            // Skip if payroll already exists
            const payrollDoc = await db.collection('payrolls').doc(assignmentId).get();
            if (payrollDoc.exists) {
                continue;
            }

            const dealerId = assignmentData.dealerId;
            const userDoc = await db.collection('users').doc(dealerId).get();

            if (!userDoc.exists()) {
                functions.logger.warn(`User profile not found for dealerId: ${dealerId}. Skipping.`);
                continue;
            }
            
            const hourlyRate = userDoc.data()?.hourlyRate || 0;
            const checkIn = assignmentData.checkInTime.toDate();
            const checkOut = assignmentData.checkOutTime.toDate();
            const workDurationInMillis = checkOut.getTime() - checkIn.getTime();
            const workDurationInHours = workDurationInMillis / (1000 * 60 * 60);
            
            const calculatedPay = workDurationInHours * hourlyRate;

            const payrollRef = db.collection('payrolls').doc(assignmentId);
            batch.set(payrollRef, {
                dealerId,
                eventId,
                assignmentId,
                workDurationInHours: parseFloat(workDurationInHours.toFixed(2)),
                hourlyRate,
                calculatedPay: parseFloat(calculatedPay.toFixed(2)),
                calculationDate: admin.firestore.FieldValue.serverTimestamp(),
                status: 'unpaid',
            });
            calculatedCount++;
        }

        await batch.commit();

        return { success: true, message: `Successfully calculated payroll for ${calculatedCount} assignments.` };

    } catch (error) {
        functions.logger.error(`Error calculating payroll for event ${eventId}:`, error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while calculating payroll.');
    }
});

export const getPayrolls = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const role = context.auth.token.role;
    const uid = context.auth.uid;

    try {
        let query;
        if (role === 'admin') {
            const { eventId } = data;
            if (!eventId) {
                throw new functions.https.HttpsError('invalid-argument', 'Event ID is required for admins.');
            }
            query = db.collection('payrolls').where('eventId', '==', eventId);
        } else { // 'dealer'
            query = db.collection('payrolls').where('dealerId', '==', uid);
        }

        const snapshot = await query.orderBy('calculationDate', 'desc').get();
        const payrolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { payrolls };

    } catch (error) {
        functions.logger.error('Error getting payrolls:', error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.');
    }
});
// endregion

// region RATING FUNCTIONS
/**
 * Data model for 'ratings' collection
 * {
 *   dealerId: string,
 *   eventId: string,
 *   adminId: string,
 *   score: number (1-5),
 *   comment: string (optional),
 *   createdAt: Firebase.Timestamp
 * }
 */
export const submitDealerRating = functions.https.onCall(async (data, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can submit ratings.');
    }

    const { dealerId, eventId, score, comment } = data;
    const adminId = context.auth.uid;

    if (!dealerId || !eventId || !score) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: dealerId, eventId, score.');
    }

    if (score < 1 || score > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Score must be between 1 and 5.');
    }

    const dealerRef = db.collection('users').doc(dealerId);
    const ratingRef = db.collection('ratings').doc(); // Auto-generate ID

    try {
        await db.runTransaction(async (transaction) => {
            const dealerDoc = await transaction.get(dealerRef);
            if (!dealerDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Dealer not found.');
            }

            // Add the new rating
            transaction.set(ratingRef, {
                dealerId,
                eventId,
                adminId,
                score,
                comment: comment || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update the average rating on the user's profile
            const dealerData = dealerDoc.data()!;
            const oldRating = dealerData.rating || 0;
            const oldRatingCount = dealerData.ratingCount || 0;

            const newRatingCount = oldRatingCount + 1;
            const newAverageRating = ((oldRating * oldRatingCount) + score) / newRatingCount;

            transaction.update(dealerRef, {
                rating: parseFloat(newAverageRating.toFixed(2)),
                ratingCount: newRatingCount,
            });
        });

        return { success: true, message: 'Rating submitted successfully.' };

    } catch (error) {
        functions.logger.error(`Error submitting rating for dealer ${dealerId} by admin ${adminId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while submitting the rating.');
    }
});
// endregion

// region DASHBOARD FUNCTIONS
export const getDashboardStats = functions.https.onCall(async (_, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can access dashboard statistics.');
    }

    try {
        // 1. Get count of ongoing events
        const now = new Date();
        const eventsQuery = db.collection('events').where('endDate', '>=', now);
        const ongoingEventsSnapshot = await eventsQuery.get();
        const ongoingEventsCount = ongoingEventsSnapshot.size;

        // 2. Get total number of dealers
        const dealersQuery = db.collection('users').where('role', '==', 'dealer');
        const dealersSnapshot = await dealersQuery.get();
        const totalDealersCount = dealersSnapshot.size;

        // 3. Get top 5 rated dealers
        const topDealersQuery = db.collection('users')
            .where('role', '==', 'dealer')
            .orderBy('rating', 'desc')
            .limit(5);
        const topDealersSnapshot = await topDealersQuery.get();
        const topRatedDealers = topDealersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                rating: data.rating,
                ratingCount: data.ratingCount,
            };
        });

        return {
            ongoingEventsCount,
            totalDealersCount,
            topRatedDealers,
        };

    } catch (error) {
        functions.logger.error('Error getting dashboard stats:', error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while fetching dashboard statistics.');
    }
});
// endregion
