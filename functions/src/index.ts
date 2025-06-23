import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
