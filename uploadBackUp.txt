const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 1. Modern Firebase Admin Import Syntax
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 2. Load your credential token file
const serviceAccount = require('./serviceAccountKey.json');

// 3. Initialize Engine safely using modular functions
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Define the path to your expanded sheet matching your local directory
const csvFilePath = path.join(__dirname, 'mock_profiles_expanded.csv');

console.log('🔄 Initiating bulk data migration pipeline with Base64 Image encoding...');

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', async (row) => {
    // 4. Validate primary key header
    if (!row['Student ID']) return;

    const studentId = row['Student ID'].trim().toUpperCase();

    // 🖼️ Flexible Multi-Extension Image Processing Strategy
    let base64ImageString = '';
    const extensions = ['.png', '.jpg', '.jpeg'];
    let localImagePath = '';
    let fileFound = false;

    // Check each possible extension to find the real file matching the case
    for (const ext of extensions) {
      const testPath = path.join(__dirname, 'img', `${studentId}${ext}`);
      if (fs.existsSync(testPath)) {
        localImagePath = testPath;
        fileFound = true;
        break;
      }
    }

    try {
      if (fileFound) {
        // Read local binary files and encode them dynamically into compliant Base64 string tags
        const bitmap = fs.readFileSync(localImagePath);
        const extName = path.extname(localImagePath).toLowerCase();
        const mimeType = extName === '.png' ? 'image/png' : 'image/jpeg';
        
        base64ImageString = `data:${mimeType};base64,${bitmap.toString('base64')}`;
        console.log(`   🖼️ SUCCESS: Loaded file asset for student: ${studentId} from ${extName}`);
      } else {
        console.error(`   ❌ MISMATCH ERROR: No physical file exists for student ID: ${studentId} (checked .png, .jpg, .jpeg)`);
      }
    } catch (imgError) {
      console.error(`❌ Failed to encode image for ${studentId}:`, imgError.message);
    }

    // Reconstruct flat rows into our nested profile schema with the embedded string asset
    const studentPayload = {
      basic_info: {
        name: row['Full Name'] || 'N/A',
        grade: row['Grade Level'] || 'N/A',
        date_of_birth: row['Date of Birth'] || 'N/A',
        age: row['Age'] || 'N/A',
        starting_year: row['Starting Year'] || 'N/A',
        // Option 1: Nested field placement inside basic_info block
        photo: base64ImageString || "" 
      },
      inclusion_and_support: {
        inclusion: row['Inclusion Student'] || 'No',
        diagnostic: row['Diagnostic Context'] || 'None Assigned',
        therapeutic_process: row['Therapeutic Process'] || 'None'
      },
      family_and_contact: {
        father_name: row["Father's Name"] || 'N/A',
        father_contact: row["Father's Contact"] || 'N/A',
        father_occupation: row["Father's Occupation"] || 'N/A',
        father_email: row["Father's Email"] || 'N/A',
        mother_name: row["Mother's Name"] || 'N/A',
        mother_contact: row["Mother's Contact"] || 'N/A', 
        mother_occupation: row["Mother's Occupation"] || 'N/A',
        mother_email: row["Mother's Email"] || 'N/A',
        siblings: row['Total Siblings'] || "0"
      },
      medical_record: {
        illnesses: row['Chronic Illnesses'] || 'None Reported',
        allergies: row['Medical & Allergies'] || 'No Restrictions',
        medicine: row['Active Medications'] || 'None',
        prescription: row['Prescription Details'] || 'None'
      },
      academic_metrics: {
        academic_performance: row['Academic Standing'] || 'N/A',
        perf: row['Academic Standing'] || '-%'
      },
      governance: {
        homeroom_teacher_id: row['Homeroom Teacher ID'] || 'Teacher Maria' 
      },
      // Option 2: Original flat fallback property field link
      photo_path: base64ImageString || "",
      // Option 3: Deep structural override matching older object tracks
      photo_record: {
        photo_path: base64ImageString || ""
      }
    };

    try {
      // Uses merge: true to avoid deleting existing nested records
      await db.collection('students').doc(studentId).set(studentPayload, { merge: true });
      console.log(`✅ Student [${studentId}] completely migrated successfully with base64 image data.`);
    } catch (error) {
      console.error(`❌ Error migrating student ${studentId}:`, error.message);
    }
  })
  .on('end', () => {
    console.log('🏁 Bulk importation stream successfully completed!');
  });