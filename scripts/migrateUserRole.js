const admin = require('firebase-admin');

// IMPORTANT: Path to your Firebase service account key file
// Make sure this file is present in the 'scripts' directory
const serviceAccount = require('./t-holdem-firebase-adminsdk-v4p2h-17b0754402.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateUserRole() {
  console.log('Starting user role migration from "dealer" to "staff"...');

  const collectionsToMigrate = ['users', 'staff'];
  let totalMigratedCount = 0;

  for (const collectionName of collectionsToMigrate) {
    try {
      console.log(`\nProcessing collection: ${collectionName}`);
      const snapshot = await db.collection(collectionName).where('userRole', '==', 'dealer').get();

      if (snapshot.empty) {
        console.log(`No documents with userRole 'dealer' found in ${collectionName}. Skipping.`);
        continue;
      }

      const batch = db.batch();
      let migratedInCollection = 0;

      snapshot.docs.forEach(doc => {
        console.log(`  - Preparing to update doc: ${doc.id} in ${collectionName}`);
        batch.update(doc.ref, { userRole: 'staff' });
        migratedInCollection++;
      });

      await batch.commit();
      console.log(`Successfully migrated ${migratedInCollection} documents in ${collectionName}.`);
      totalMigratedCount += migratedInCollection;

    } catch (error) {
      console.error(`Error migrating data in ${collectionName}:`, error);
      // Exit on first error to prevent partial migrations
      process.exit(1); 
    }
  }

  if (totalMigratedCount > 0) {
    console.log(`\nMigration completed successfully! Total of ${totalMigratedCount} documents were updated.`);
  } else {
    console.log('\nNo documents needed to be migrated.');
  }
}

migrateUserRole().catch(error => {
  console.error('An unexpected error occurred during the migration process:', error);
  process.exit(1);
});
