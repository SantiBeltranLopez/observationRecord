const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Firebase Admin SDK
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Cargar credenciales
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Ruta del CSV
const csvFilePath = path.join(__dirname, 'mock_profiles_expanded.csv');

console.log('🔄 Iniciando importación de estudiantes...');
console.log('📁 Archivo CSV:', csvFilePath);

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', async (row) => {
    if (!row['Student ID']) return;

    const studentId = row['Student ID'].trim().toUpperCase();

    // Determinar homeroom teacher según grado
    let homeroomTeacher = "N/A";
    if (row['Grade Level'] === 'Kindergarten') {
        homeroomTeacher = "Teacher Maria";
    }

    // 🖼️ Cargar imagen si existe
    let base64ImageString = '';
    const extensions = ['.png', '.jpg', '.jpeg'];
    let fileFound = false;

    for (const ext of extensions) {
        const testPath = path.join(__dirname, 'img', `${studentId}${ext}`);
        if (fs.existsSync(testPath)) {
            try {
                const bitmap = fs.readFileSync(testPath);
                const extName = path.extname(testPath).toLowerCase();
                const mimeType = extName === '.png' ? 'image/png' : 'image/jpeg';
                base64ImageString = `data:${mimeType};base64,${bitmap.toString('base64')}`;
                fileFound = true;
                console.log(`   🖼️ Imagen cargada para: ${studentId}`);
                break;
            } catch (err) {
                console.log(`   ⚠️ Error cargando imagen ${studentId}:`, err.message);
            }
        }
    }

    if (!fileFound) {
        console.log(`   ⚠️ Sin imagen para: ${studentId}`);
    }

    // Construir payload
    const studentPayload = {
        basic_info: {
            name: row['Full Name'] || 'N/A',
            grade: row['Grade Level'] || 'N/A',
            date_of_birth: row['Date of Birth'] || 'N/A',
            age: row['Age'] || 'N/A',
            starting_year: row['Starting Year'] || 'N/A',
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
            homeroom_teacher_id: homeroomTeacher
        }
    };

    try {
        await db.collection('students').doc(studentId).set(studentPayload, { merge: true });
        console.log(`✅ ${studentId} | ${row['Grade Level']} | Homeroom: ${homeroomTeacher}`);
    } catch (error) {
        console.error(`❌ Error en ${studentId}:`, error.message);
    }
  })
  .on('end', () => {
    console.log('🏁 Importación completada!');
  });