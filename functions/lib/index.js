"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.onUserRoleChange = exports.createUserAccount = exports.submitDealerRating = exports.getPayrolls = exports.calculatePayrollsForEvent = exports.recordAttendance = exports.generateEventQrToken = exports.assignDealerToEvent = exports.matchDealersToEvent = exports.onJobPostingCreated = exports.onApplicationStatusChange = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Firestore
const db = admin.firestore();
// CORS handler
const corsHandler = (0, cors_1.default)({ origin: true });
// --- Existing Functions (placeholders for brevity) ---
exports.onApplicationStatusChange = functions.firestore.document('applications/{applicationId}').onUpdate(async (change, context) => { });
exports.onJobPostingCreated = functions.firestore.document("jobPostings/{postId}").onCreate(async (snap, context) => { });
exports.matchDealersToEvent = functions.https.onCall(async (data, context) => { });
exports.assignDealerToEvent = functions.https.onCall(async (data, context) => { });
exports.generateEventQrToken = functions.https.onCall(async (data, context) => { });
exports.recordAttendance = functions.https.onCall(async (data, context) => { });
exports.calculatePayrollsForEvent = functions.https.onCall(async (data, context) => { });
exports.getPayrolls = functions.https.onCall(async (data, context) => { });
exports.submitDealerRating = functions.https.onCall(async (data, context) => { });
// --- Authentication and Role Management Functions ---
/**
 * Creates a new user account, stores details in Firestore, and sets a custom role claim.
 */
exports.createUserAccount = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Ensure the caller is an admin
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
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
    }
    catch (error) {
        console.error("Error creating new user:", error);
        throw new functions.https.HttpsError('internal', error.message, error);
    }
});
/**
 * Firestore trigger that automatically sets a custom user claim whenever a user's role is
 * created or changed in the 'users' collection.
 */
exports.onUserRoleChange = functions.firestore.document('users/{uid}').onWrite(async (change, context) => {
    var _a, _b;
    const { uid } = context.params;
    const newRole = change.after.exists ? (_a = change.after.data()) === null || _a === void 0 ? void 0 : _a.role : null;
    const oldRole = change.before.exists ? (_b = change.before.data()) === null || _b === void 0 ? void 0 : _b.role : null;
    // Only update claims if the role has actually changed to prevent unnecessary writes.
    if (newRole === oldRole) {
        console.log(`User ${uid}: Role unchanged (${newRole}). No action taken.`);
        return null;
    }
    try {
        console.log(`Setting custom claim for user ${uid}. New role: ${newRole}`);
        await admin.auth().setCustomUserClaims(uid, { role: newRole });
        return { result: `Custom claim for ${uid} updated to ${newRole}.` };
    }
    catch (error) {
        console.error(`Failed to set custom claim for ${uid}`, error);
        return { error: 'Failed to set custom claim.' };
    }
});
// --- Dashboard Functions ---
exports.getDashboardStats = functions.https.onRequest((request, response) => {
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
            const [ongoingEventsSnapshot, totalDealersSnapshot, topDealersSnapshot,] = await Promise.all([
                ongoingEventsQuery.get(),
                totalDealersQuery.get(),
                topDealersQuery.get(),
            ]);
            const topRatedDealers = topDealersSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
            response.status(200).send({
                data: {
                    ongoingEventsCount: ongoingEventsSnapshot.size,
                    totalDealersCount: totalDealersSnapshot.size,
                    topRatedDealers,
                },
            });
        }
        catch (error) {
            functions.logger.error("Error getting dashboard stats:", error);
            response.status(500).send({ data: { error: "Internal Server Error" } });
        }
    });
});
//# sourceMappingURL=index.js.map