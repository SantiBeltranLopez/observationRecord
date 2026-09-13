
        const firebaseConfig = {
            apiKey: "AIzaSyCGc2-DXXf9tIaodODA1ORw93QiUGqoEhM",
            authDomain: "school-observation-system.firebaseapp.com",
            projectId: "school-observation-system",
            storageBucket: "school-observation-system.firebasestorage.app",
            messagingSenderId: "328709547954",
            appId: "1:328709547954:web:c99a6cf500a7086e2126ab"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();

        emailjs.init({ publicKey: "rVqcvMDn94UgiDv0d" });

        let currentTeacherProfile = null;
        let activeStudentId = null;
        let initialStudentDataBackup = null;
        let uploadedPhotoBase64 = "";
        let editPhotoBase64 = "";

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        const defaultAvatarPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237f8c8d'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

        const authView = document.getElementById('authView');
        const appView = document.getElementById('appView');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const txtEmail = document.getElementById('txtEmail');
        const txtPassword = document.getElementById('txtPassword');
        const authStatusMsg = document.getElementById('authStatusMsg');
        const userStatusContainer = document.getElementById('userStatusContainer');
        const currentUserLabel = document.getElementById('currentUserLabel');

        const searchBtn = document.getElementById('searchBtn');
        const studentIdInput = document.getElementById('studentIdInput');
        const statusMsg = document.getElementById('statusMsg');
        const profileLayout = document.getElementById('profileLayout');
        const timelineContainer = document.getElementById('timelineContainer');
        const avatarFrame = document.getElementById('avatarFrame');

        const newObservationForm = document.getElementById('newObservationForm');
        const formStatusMsg = document.getElementById('formStatusMsg');

        const topAdminSection = document.getElementById('topAdminSection');
        const bottomAdminSection = document.getElementById('bottomAdminSection');
        const createStudentFormCard = document.getElementById('createStudentFormCard');
        const btnShowCreateForm = document.getElementById('btnShowCreateForm');
        const btnCancelCreate = document.getElementById('btnCancelCreate');
        const newStudentForm = document.getElementById('newStudentForm');
        const createStatusMsg = document.getElementById('createStatusMsg');
        const newStudentPhoto = document.getElementById('newStudentPhoto');

        const btnEditProfile = document.getElementById('btnEditProfile');
        const editActionButtons = document.getElementById('editActionButtons');
        const btnSaveProfileUpdates = document.getElementById('btnSaveProfileUpdates');
        const btnCancelUpdates = document.getElementById('btnCancelUpdates');
        const updateStatusMsg = document.getElementById('updateStatusMsg');

        const homeroomRosterSection = document.getElementById('homeroomRosterSection');
        const rosterFlexContainer = document.getElementById('rosterFlexContainer');
        const htComplianceTracker = document.getElementById('htComplianceTracker');
        const conferenceSection = document.getElementById('conferenceSection');
        const newConferenceForm = document.getElementById('newConferenceForm');
        const confStatusMsg = document.getElementById('confStatusMsg');
        const signaturePad = document.getElementById('signaturePad');
        const btnClearSignature = document.getElementById('btnClearSignature');
        const ctx = signaturePad.getContext('2d');

        // Elementos del reporte consolidado
        const consolidatedReport = document.getElementById('consolidatedReport');
        const teacherSelect = document.getElementById('teacherSelect');
        const reportSummary = document.getElementById('reportSummary');
        const reportDetailContainer = document.getElementById('reportDetailContainer');
        const reportDetailBody = document.getElementById('reportDetailBody');
        const reportEmpty = document.getElementById('reportEmpty');
        const btnRefreshReport = document.getElementById('btnRefreshReport');

        function setupSignatureCanvas() {
            const rect = signaturePad.getBoundingClientRect();
            signaturePad.width = rect.width;
            signaturePad.height = rect.height;

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            signaturePad.addEventListener('mousedown', (e) => {
                isDrawing = true;
                [lastX, lastY] = [e.offsetX, e.offsetY];
            });
            signaturePad.addEventListener('mousemove', draw);
            signaturePad.addEventListener('mouseup', () => isDrawing = false);
            signaturePad.addEventListener('mouseout', () => isDrawing = false);

            signaturePad.addEventListener('touchstart', (e) => {
                isDrawing = true;
                const touch = e.touches[0];
                const rect = signaturePad.getBoundingClientRect();
                lastX = touch.clientX - rect.left;
                lastY = touch.clientY - rect.top;
            });
            signaturePad.addEventListener('touchmove', (e) => {
                if (!isDrawing) return;
                const touch = e.touches[0];
                const rect = signaturePad.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                [lastX, lastY] = [x, y];
            });
            signaturePad.addEventListener('touchend', () => isDrawing = false);
        }

        function draw(e) {
            if (!isDrawing) return;
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            [lastX, lastY] = [e.offsetX, e.offsetY];
        }

        btnClearSignature.addEventListener('click', () => {
            ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
        });

        async function loadHomeroomRoster(assignedGrade) {
            if (!currentTeacherProfile || currentTeacherProfile.role !== 'homeroom') {
                homeroomRosterSection.style.display = 'none';
                return;
            }

            rosterFlexContainer.innerHTML = "<p class='subtitle'>Loading your classroom group...</p>";
            try {
                const snapshot = await db.collection('students')
                    .where('basic_info.grade', '==', assignedGrade)
                    .get();
                rosterFlexContainer.innerHTML = "";
                if (snapshot.empty) {
                    rosterFlexContainer.innerHTML = "<p class='subtitle'>No students registered in this grade level.</p>";
                    return;
                }
                snapshot.forEach(doc => {
                    const student = doc.data();
                    const studentId = doc.id;

                    const badge = document.createElement('div');
                    badge.className = "roster-badge-item";
                    badge.innerText = student.basic_info?.name || studentId;

                    badge.addEventListener('click', () => {
                        studentIdInput.value = studentId;
                        searchBtn.click();
                    });
                    rosterFlexContainer.appendChild(badge);
                });
            } catch (err) {
                console.error("Roster Query Failure:", err);
                rosterFlexContainer.innerHTML = "<p class='subtitle error'>Roster fetch error.</p>";
            }
        }

        // 📊 Función para cargar el listado de Homeroom Teachers
        async function loadTeacherList() {
            try {
                const studentsSnapshot = await db.collection('students').get();
                const teachersSet = new Set();

                studentsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const teacher = data.governance?.homeroom_teacher_id;
                    if (teacher && teacher !== 'N/A' && teacher !== 'Sin asignar') {
                        teachersSet.add(teacher);
                    }
                });

                const currentValue = teacherSelect.value;

                teacherSelect.innerHTML = '<option value="">-- Select a Homeroom Teacher --</option>';
                const sortedTeachers = Array.from(teachersSet).sort();
                sortedTeachers.forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher;
                    option.textContent = teacher;
                    teacherSelect.appendChild(option);
                });

                if (currentValue && sortedTeachers.includes(currentValue)) {
                    teacherSelect.value = currentValue;
                }

                console.log(`✅ ${sortedTeachers.length} Homeroom Teachers encontrados`);

            } catch (error) {
                console.error("Error loading teacher list:", error);
            }
        }

        // 📊 Función para cargar el reporte detallado de un profesor
        async function loadTeacherReport(teacherName) {
            if (!teacherName) {
                reportSummary.style.display = 'none';
                reportDetailContainer.style.display = 'none';
                reportEmpty.style.display = 'none';
                return;
            }

            reportSummary.style.display = 'flex';
            reportDetailContainer.style.display = 'none';
            reportEmpty.style.display = 'none';
            reportDetailBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Cargando datos...</td></tr>';

            try {
                const studentsSnapshot = await db.collection('students')
                    .where('governance.homeroom_teacher_id', '==', teacherName)
                    .get();

                if (studentsSnapshot.empty) {
                    reportEmpty.style.display = 'block';
                    reportSummary.style.display = 'none';
                    return;
                }

                let totalConferences = 0;
                let totalWithSignature = 0;
                let studentCount = 0;
                const allConferences = [];

                for (const studentDoc of studentsSnapshot.docs) {
                    const studentData = studentDoc.data();
                    const studentId = studentDoc.id;
                    const studentName = studentData.basic_info?.name || studentId;
                    const grade = studentData.basic_info?.grade || 'N/A';

                    const confSnapshot = await studentDoc.ref.collection('conferences').get();

                    if (!confSnapshot.empty) {
                        studentCount++;
                        confSnapshot.forEach(confDoc => {
                            const confData = confDoc.data();
                            const confId = confDoc.id;

                            let dateCreated = 'N/A';
                            if (confData.date_logged && typeof confData.date_logged.toDate === 'function') {
                                dateCreated = confData.date_logged.toDate().toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }

                            const hasSignature = confData.parent_signature && confData.parent_signature.length > 100;

                            totalConferences++;
                            if (hasSignature) totalWithSignature++;

                            allConferences.push({
                                studentName,
                                studentId,
                                grade,
                                dateCreated,
                                hasSignature,
                                confId,
                                parentName: confData.parent_name || 'N/A'
                            });
                        });
                    }
                }

                document.getElementById('totalConferences').textContent = totalConferences;
                document.getElementById('totalStudents').textContent = studentCount;
                document.getElementById('totalWithConferences').textContent = totalWithSignature;

                reportDetailContainer.style.display = 'block';
                reportEmpty.style.display = 'none';

                if (allConferences.length === 0) {
                    reportEmpty.style.display = 'block';
                    reportDetailContainer.style.display = 'none';
                    return;
                }

                allConferences.sort((a, b) => {
                    if (a.dateCreated === 'N/A') return 1;
                    if (b.dateCreated === 'N/A') return -1;
                    return new Date(b.dateCreated) - new Date(a.dateCreated);
                });

                reportDetailBody.innerHTML = '';
                allConferences.forEach(conf => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                            <td><strong>${conf.studentName}</strong><br><span style="font-size: 11px; color: var(--text-light);">${conf.studentId}</span></td>
                            <td>${conf.grade}</td>
                            <td>${conf.dateCreated}</td>
                            <td>${conf.hasSignature ? '✅ Sí' : '❌ No'}</td>
                            <td>
                                <button onclick="viewConferenceFromReport('${conf.studentId}', '${conf.confId}')" 
                                        style="background: var(--primary); color: white; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 12px; width: auto;">
                                    📄 Ver PDF
                                </button>
                            </td>
                        `;
                    reportDetailBody.appendChild(row);
                });

            } catch (error) {
                console.error("Error loading teacher report:", error);
                reportDetailBody.innerHTML =
                    `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error: ${error.message}</td></tr>`;
            }
        }

        // Función para ver una conferencia desde el reporte (usa el mismo flujo que los badges)
        window.viewConferenceFromReport = function(studentId, conferenceId) {
            // Buscar el estudiante
            studentIdInput.value = studentId;
            searchBtn.click();

            // Esperar a que se cargue el perfil y luego abrir la conferencia
            setTimeout(() => {
                const dot = document.querySelector(`.tracker-dot[data-conference-id="${conferenceId}"]`);
                if (dot) {
                    dot.click();
                } else {
                    statusMsg.className = "status-message error";
                    statusMsg.innerText = "⚠️ Conference not found. Please search the student first.";
                }
            }, 1500);
        };

        // Evento de selección de profesor
        teacherSelect.addEventListener('change', function() {
            const selectedTeacher = this.value;
            if (selectedTeacher) {
                loadTeacherReport(selectedTeacher);
            } else {
                reportSummary.style.display = 'none';
                reportDetailContainer.style.display = 'none';
                reportEmpty.style.display = 'none';
            }
        });

        btnRefreshReport.addEventListener('click', async function() {
            const selectedTeacher = teacherSelect.value;
            if (selectedTeacher) {
                await loadTeacherReport(selectedTeacher);
            } else {
                await loadTeacherList();
            }
        });

        // 📊 Función para cargar el reporte consolidado
        async function loadConsolidatedReport() {
            if (!currentTeacherProfile || (currentTeacherProfile.role !== 'admin' && currentTeacherProfile.role !==
                    'coordinator')) {
                consolidatedReport.style.display = 'none';
                return;
            }

            consolidatedReport.style.display = 'block';
            await loadTeacherList();

            if (teacherSelect.value) {
                await loadTeacherReport(teacherSelect.value);
            }
        }

        auth.onAuthStateChanged(async (user) => {
            authStatusMsg.innerText = "";
            txtEmail.value = "";
            txtPassword.value = "";

            if (user) {
                try {
                    const teacherDoc = await db.collection('users').doc(user.uid).get();
                    if (teacherDoc.exists) {
                        currentTeacherProfile = teacherDoc.data();
                        currentTeacherProfile.uid = user.uid;

                        currentUserLabel.innerText =
                            `${currentTeacherProfile.name || 'Staff Member'} (${currentTeacherProfile.role || 'User'})`;
                        userStatusContainer.style.display = "block";
                        authView.style.display = "none";
                        appView.style.display = "block";

                        if (currentTeacherProfile.role === 'admin' || currentTeacherProfile.role === 'coordinator') {
                            topAdminSection.style.display = "block";
                            bottomAdminSection.style.display = "block";
                            homeroomRosterSection.style.display = "none";
                            await loadConsolidatedReport();
                        } else if (currentTeacherProfile.role === 'homeroom') {
                            topAdminSection.style.display = "none";
                            bottomAdminSection.style.display = "none";
                            homeroomRosterSection.style.display = "block";
                            consolidatedReport.style.display = "none";
                            await loadHomeroomRoster(currentTeacherProfile.assigned_group || "");
                        } else {
                            topAdminSection.style.display = "none";
                            bottomAdminSection.style.display = "none";
                            homeroomRosterSection.style.display = "none";
                            consolidatedReport.style.display = "none";
                        }
                    } else {
                        auth.signOut();
                        authStatusMsg.innerText = "Access denied: Missing associated user profile reference tracking rules.";
                    }
                } catch (err) {
                    console.error("Profile Synchronization Error:", err);
                    auth.signOut();
                    authStatusMsg.innerText = "Execution fault syncing teacher verification rules.";
                }
            } else {
                currentTeacherProfile = null;
                activeStudentId = null;
                userStatusContainer.style.display = "none";
                appView.style.display = "none";
                profileLayout.style.display = "none";
                topAdminSection.style.display = "none";
                bottomAdminSection.style.display = "none";
                homeroomRosterSection.style.display = "none";
                consolidatedReport.style.display = "none";
                createStudentFormCard.style.display = "none";
                studentIdInput.value = "";
                newObservationForm.reset();
                newConferenceForm.reset();
                ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
                authView.style.display = "block";
                revertFieldsToLabels();
            }
        });

        loginBtn.addEventListener('click', async () => {
            const email = txtEmail.value.trim();
            const password = txtPassword.value.trim();
            authStatusMsg.innerText = "";

            if (!email || !password) {
                authStatusMsg.innerText = "Please provide both email and password parameters.";
                return;
            }

            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error("Authentication Error Code: ", error.code);
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code ===
                    'auth/invalid-credential') {
                    authStatusMsg.innerText = "Invalid credentials. Please verify your entries and try again.";
                } else {
                    authStatusMsg.innerText = error.message;
                }
            }
        });

        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });

        btnShowCreateForm.addEventListener('click', () => {
            createStudentFormCard.style.display = "block";
            createStatusMsg.innerText = "";
            uploadedPhotoBase64 = "";
            newStudentForm.reset();
        });

        btnCancelCreate.addEventListener('click', () => {
            createStudentFormCard.style.display = "none";
            uploadedPhotoBase64 = "";
        });

        newStudentPhoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    uploadedPhotoBase64 = reader.result;
                };
                reader.onerror = (err) => {
                    console.error("Image Processing Fault:", err);
                    createStatusMsg.className = "status-message error";
                    createStatusMsg.innerText = "Failed to convert picture to data serialization structures.";
                };
                reader.readAsDataURL(file);
            }
        });

        newStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            createStatusMsg.className = "status-message";
            createStatusMsg.innerText = "Processing configuration schema changes to remote clusters...";

            const studentId = document.getElementById('newStudentId').value.trim().toUpperCase();

            const payload = {
                basic_info: {
                    name: document.getElementById('newName').value.trim(),
                    grade: document.getElementById('newGrade').value,
                    date_of_birth: document.getElementById('newDOB').value.trim() || "N/A",
                    age: document.getElementById('newAge').value.trim() || "N/A",
                    starting_year: document.getElementById('newStartYear').value.trim() || "N/A",
                    photo: uploadedPhotoBase64 || ""
                },
                inclusion_and_support: {
                    inclusion: document.getElementById('newInclusion').value,
                    diagnostic: document.getElementById('newDiagnostic').value.trim() || "None Assigned",
                    therapeutic_process: document.getElementById('newTherapy').value.trim() || "None"
                },
                governance: {
                    homeroom_teacher_id: document.getElementById('newTeacher').value.trim() || "N/A"
                },
                family_and_contact: {
                    father_name: document.getElementById('newFatherName').value.trim() || "N/A",
                    father_contact: document.getElementById('newFatherContact').value.trim() || "N/A",
                    father_occupation: document.getElementById('newFatherJob').value.trim() || "N/A",
                    father_email: document.getElementById('newFatherEmail').value.trim() || "N/A",
                    mother_name: document.getElementById('newMotherName').value.trim() || "N/A",
                    mother_contact: document.getElementById('newMotherContact').value.trim() || "N/A",
                    mother_occupation: document.getElementById('newMotherJob').value.trim() || "N/A",
                    mother_email: document.getElementById('newMotherEmail').value.trim() || "N/A",
                    siblings: document.getElementById('newSiblings').value.trim() || "0"
                },
                medical_record: {
                    illnesses: document.getElementById('newIllness').value.trim() || "None Reported",
                    allergies: document.getElementById('newAllergies').value.trim() || "No Restrictions",
                    medicine: document.getElementById('newMedicine').value.trim() || "None",
                    prescription: document.getElementById('newPrescription').value.trim() || "None"
                },
                academic_metrics: {
                    academic_performance: document.getElementById('newPerformance').value.trim() || "N/A",
                    perf: document.getElementById('newPerf').value.trim() || "-%"
                }
            };

            try {
                const checkDoc = await db.collection('students').doc(studentId).get();
                if (checkDoc.exists) {
                    createStatusMsg.className = "status-message error";
                    createStatusMsg.innerText =
                        `Registration Failure: Primary record context [${studentId}] is already mapped on the registry database allocation layers.`;
                    return;
                }

                await db.collection('students').doc(studentId).set(payload);
                createStatusMsg.className = "status-message success";
                createStatusMsg.innerText = "Student registration structural parameters committed down successfully!";
                newStudentForm.reset();
                uploadedPhotoBase64 = "";
                setTimeout(() => { createStudentFormCard.style.display = "none"; }, 2000);
            } catch (err) {
                console.error(err);
                createStatusMsg.className = "status-message error";
                createStatusMsg.innerText = "Write operation rejected: Validation rules failed server-side criteria parsing routines.";
            }
        });

        btnEditProfile.addEventListener('click', () => {
            btnEditProfile.style.display = "none";
            editActionButtons.style.display = "flex";
            updateStatusMsg.innerText = "";
            editPhotoBase64 = "";

            const fileInput = document.createElement('input');
            fileInput.type = "file";
            fileInput.id = "editStudentPhoto";
            fileInput.accept = "image/*";
            fileInput.style.marginTop = "10px";
            fileInput.style.fontSize = "13px";
            fileInput.style.width = "100%";

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        editPhotoBase64 = reader.result;
                        document.getElementById('imgStudentPhoto').src = editPhotoBase64;
                    };
                    reader.readAsDataURL(file);
                }
            });
            avatarFrame.appendChild(fileInput);

            const fields = document.querySelectorAll('.editable-field');
            fields.forEach(field => {
                const currentText = field.innerText;
                const parent = field.parentElement;

                const input = document.createElement('input');
                input.type = "text";
                input.className = "inline-edit";
                input.value = currentText === "-" ? "" : currentText;
                input.setAttribute('data-target-id', field.id);
                input.setAttribute('data-key', field.getAttribute('data-key'));

                field.style.display = "none";
                parent.appendChild(input);
            });
        });

        btnCancelUpdates.addEventListener('click', () => {
            revertFieldsToLabels();
            const fallbackPhoto = initialStudentDataBackup?.basic_info?.photo;
            document.getElementById('imgStudentPhoto').src = fallbackPhoto || defaultAvatarPlaceholder;
        });

        function revertFieldsToLabels() {
            btnEditProfile.style.display = "block";
            editActionButtons.style.display = "none";
            updateStatusMsg.innerText = "";
            editPhotoBase64 = "";

            const editPhotoInput = document.getElementById('editStudentPhoto');
            if (editPhotoInput) {
                editPhotoInput.remove();
            }

            const inputs = document.querySelectorAll('.inline-edit');
            inputs.forEach(input => {
                const targetId = input.getAttribute('data-target-id');
                const field = document.getElementById(targetId);
                if (field) field.style.display = "inline";
                input.remove();
            });
        }

        btnSaveProfileUpdates.addEventListener('click', async () => {
            if (!activeStudentId) return;

            updateStatusMsg.className = "status-message";
            updateStatusMsg.innerText = "Committing inline data-mutation instructions to target doc cluster...";

            const inputs = document.querySelectorAll('.inline-edit');
            const updatePayload = {};

            inputs.forEach(input => {
                const pathKey = input.getAttribute('data-key');
                const val = input.value.trim() || "N/A";
                updatePayload[pathKey] = val;
            });

            if (editPhotoBase64) {
                updatePayload['basic_info.photo'] = editPhotoBase64;
            }

            try {
                await db.collection('students').doc(activeStudentId).update(updatePayload);

                inputs.forEach(input => {
                    const targetId = input.getAttribute('data-target-id');
                    const field = document.getElementById(targetId);
                    if (field) field.innerText = input.value.trim() || "-";
                });

                if (editPhotoBase64) {
                    if (!initialStudentDataBackup.basic_info) initialStudentDataBackup.basic_info = {};
                    initialStudentDataBackup.basic_info.photo = editPhotoBase64;
                }

                updateStatusMsg.className = "status-message success";
                updateStatusMsg.innerText = "Cloud record values synchronized and merged cleanly.";
                setTimeout(() => { revertFieldsToLabels(); }, 1000);
            } catch (err) {
                console.error(err);
                updateStatusMsg.className = "status-message error";
                updateStatusMsg.innerText = "Security Interception Rule Violation: Cloud authorization rejected modification schema fields.";
            }
        });

        async function loadObservationsTimeline(studentDocRef) {
            timelineContainer.innerHTML = "";
            const observationsSnapshot = await studentDocRef.collection('observations')
                .orderBy('date_added', 'desc')
                .get();

            if (observationsSnapshot.empty) {
                timelineContainer.innerHTML = '<p class="subtitle">No historical logs compiled for this student.</p>';
            } else {
                observationsSnapshot.forEach(logDoc => {
                    const log = logDoc.data();

                    let formattedDate = "N/A";
                    if (log.date_added && typeof log.date_added.toDate === 'function') {
                        formattedDate = log.date_added.toDate().toLocaleString();
                    }

                    const parentNoticeBadge = log.sent_to_parents ?
                        `<span class="badge" style="background-color: var(--success); color: white; margin-left: 5px;">✉️ Sent to Parents</span>` :
                        '';

                    const logElement = document.createElement('div');
                    logElement.className = "observation-item";
                    logElement.innerHTML = `
                            <div class="observation-meta">
                                <span class="badge">AY: ${log.academic_year || "N/A"}</span> 
                                <span class="badge">Term: ${log.term || "N/A"}</span> 
                                — Logged by: <strong>${log.logged_by || "Unknown"}</strong>
                                <span class="badge" style="background-color: #f39c12; color: white; margin-left: 5px;">📅 ${formattedDate}</span>
                                ${parentNoticeBadge}
                            </div>
                            <div class="observation-text">${log.observation_text || "Empty text record."}</div>
                        `;
                    timelineContainer.appendChild(logElement);
                });
            }
        }

        // 📋 Función CORREGIDA - Usa ID del documento, NO el term
        async function evaluateConferenceCompliance(studentDocRef) {
            try {
                const conferencesSnapshot = await studentDocRef.collection('conferences').get();

                const trackerContainer = document.querySelector('.compliance-tracker');
                const complianceBanner = document.getElementById('htComplianceTracker');

                if (conferencesSnapshot.empty) {
                    complianceBanner.style.display = 'none';
                    return;
                }

                trackerContainer.innerHTML = '';

                let conferenceCount = 0;

                conferencesSnapshot.forEach((doc) => {
                    const confData = doc.data();
                    const conferenceId = doc.id;
                    conferenceCount++;

                    const dot = document.createElement('div');
                    dot.className = 'tracker-dot';
                    dot.setAttribute('data-conference-id', conferenceId);
                    dot.setAttribute('data-index', conferenceCount);
                    dot.textContent = conferenceCount;

                    dot.addEventListener('click', async (event) => {
                        event.stopPropagation();
                        const conferenceId = dot.getAttribute('data-conference-id');
                        await triggerInstantConferencePDFById(conferenceId);
                    });

                    trackerContainer.appendChild(dot);
                });

                complianceBanner.style.display = 'flex';

                const complianceTitle = document.querySelector('.compliance-title');
                if (complianceTitle) {
                    complianceTitle.textContent = '📋 Parent Conferences Record';
                }

                const subtitle = complianceBanner.querySelector('.subtitle');
                if (subtitle) {
                    subtitle.textContent =
                        `Click on any badge to export the certified PDF document. (${conferenceCount} conference${conferenceCount > 1 ? 's' : ''} registered)`;
                }

                console.log(`✅ ${conferenceCount} conferencias encontradas`);

            } catch (err) {
                console.error("Error evaluando conferencias:", err);
                document.getElementById('htComplianceTracker').style.display = 'none';
            }
        }

        // 🚀 FUNCIÓN DE FIRMA - NO TOCAR, ESTÁ INTACTA
        async function triggerInstantConferencePDFById(conferenceId) {
            if (!activeStudentId || !initialStudentDataBackup) {
                statusMsg.className = "status-message error";
                statusMsg.innerText = "❌ Error: No hay estudiante seleccionado.";
                return;
            }

            const previousStatus = statusMsg.innerText;
            statusMsg.className = "status-message";
            statusMsg.innerText = `⏳ Generando PDF para conferencia: ${conferenceId}...`;

            try {
                const conferenceDoc = await db.collection('students')
                    .doc(activeStudentId)
                    .collection('conferences')
                    .doc(conferenceId)
                    .get();

                if (!conferenceDoc.exists) {
                    statusMsg.className = "status-message error";
                    statusMsg.innerText = "❌ Conferencia no encontrada.";
                    return;
                }

                const conferenceRecord = conferenceDoc.data();

                console.log("📄 ID de conferencia:", conferenceId);
                console.log("📝 Notas de la conferencia:", conferenceRecord.notes);
                console.log("👤 Padre:", conferenceRecord.parent_name);
                console.log("✍️ Firma presente:", conferenceRecord.parent_signature ? "SÍ" : "NO");

                const studentName = initialStudentDataBackup.basic_info?.name || "Estudiante";
                const currentGrade = initialStudentDataBackup.basic_info?.grade || "N/A";
                const academicYear = conferenceRecord.academic_year || "2025-2026";
                const parentName = conferenceRecord.parent_name || "N/A";
                const homeroomTeacher = conferenceRecord.logged_by || "Docente";
                const minutesNotes = conferenceRecord.notes || "Sin notas adicionales.";

                let fechaCreacion = "N/A";
                if (conferenceRecord.date_logged && typeof conferenceRecord.date_logged.toDate === 'function') {
                    const date = conferenceRecord.date_logged.toDate();
                    fechaCreacion = date.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                const now = new Date();
                const fechaDescarga = now.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // --- OBTENER LA FIRMA COMO IMAGEN ---
                let signatureData = conferenceRecord.parent_signature || "";
                let signatureSrc = '';

                if (signatureData && !signatureData.startsWith('data:image')) {
                    signatureData = 'data:image/png;base64,' + signatureData;
                }

                if (signatureData && signatureData.length > 100) {
                    try {
                        const img = new Image();
                        img.crossOrigin = "anonymous";

                        await new Promise((resolve) => {
                            let resolved = false;
                            const timeout = setTimeout(() => {
                                if (!resolved) {
                                    const svgPlaceholder = `
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100">
                                                <rect width="400" height="100" fill="#ffffff" rx="5" stroke="#dee2e6" stroke-width="1"/>
                                                <text x="200" y="55" font-family="Arial" font-size="18" fill="#2c3e50" text-anchor="middle">✍️ ${parentName}</text>
                                                <text x="200" y="75" font-family="Arial" font-size="12" fill="#7f8c8d" text-anchor="middle">Firma Digital</text>
                                            </svg>
                                        `;
                                    signatureSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                                    svgPlaceholder);
                                    resolved = true;
                                    resolve();
                                }
                            }, 5000);

                            img.onload = () => {
                                clearTimeout(timeout);
                                signatureSrc = signatureData;
                                console.log("✅ Firma cargada correctamente");
                                if (!resolved) { resolved = true;
                                    resolve(); }
                            };
                            img.onerror = () => {
                                clearTimeout(timeout);
                                console.warn("⚠️ Error cargando firma, usando placeholder");
                                const svgPlaceholder = `
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100">
                                            <rect width="400" height="100" fill="#ffffff" rx="5" stroke="#dee2e6" stroke-width="1"/>
                                            <text x="200" y="55" font-family="Arial" font-size="18" fill="#2c3e50" text-anchor="middle">✍️ ${parentName}</text>
                                            <text x="200" y="75" font-family="Arial" font-size="12" fill="#7f8c8d" text-anchor="middle">Firma Digital</text>
                                        </svg>
                                    `;
                                signatureSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                                svgPlaceholder);
                                if (!resolved) { resolved = true;
                                    resolve(); }
                            };
                            img.src = signatureData;
                        });
                    } catch (e) {
                        console.warn("Error cargando firma:", e);
                        const svgPlaceholder = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100">
                                    <rect width="400" height="100" fill="#ffffff" rx="5" stroke="#dee2e6" stroke-width="1"/>
                                    <text x="200" y="55" font-family="Arial" font-size="18" fill="#2c3e50" text-anchor="middle">✍️ ${parentName}</text>
                                    <text x="200" y="75" font-family="Arial" font-size="12" fill="#7f8c8d" text-anchor="middle">Firma Digital</text>
                                </svg>
                            `;
                        signatureSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgPlaceholder);
                    }
                } else {
                    const svgPlaceholder = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="400" height="100">
                                <rect width="400" height="100" fill="#ffffff" rx="5" stroke="#dee2e6" stroke-width="1"/>
                                <text x="200" y="55" font-family="Arial" font-size="18" fill="#2c3e50" text-anchor="middle">📝 ${parentName}</text>
                                <text x="200" y="75" font-family="Arial" font-size="12" fill="#7f8c8d" text-anchor="middle">Firma Digital</text>
                            </svg>
                        `;
                    signatureSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgPlaceholder);
                }

                // --- OVERLAY DE CARGA ---
                const overlay = document.createElement('div');
                overlay.className = 'pdf-loading-overlay';
                overlay.innerHTML = `
                        <div class="spinner"></div>
                        <div>Generando documento PDF...</div>
                        <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">Por favor espere</div>
                    `;
                document.body.appendChild(overlay);

                // --- CONTENEDOR TEMPORAL ---
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                        position: fixed;
                        top: -9999px;
                        left: -9999px;
                        width: 800px;
                        background: white;
                        padding: 40px;
                        z-index: -1;
                    `;
                document.body.appendChild(tempContainer);

                // --- CONSTRUIR HTML DEL PDF ---
                const dateStr = now.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                tempContainer.innerHTML = `
                        <div style="max-width: 800px; width: 100%; margin: 0 auto; background: white; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: #2c3e50;">
                            <div style="border-bottom: 3px solid #2b4c7e; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
                                <div>
                                    <h1 style="color: #2b4c7e; font-size: 22px; text-transform: uppercase; margin: 0; letter-spacing: 0.5px;">Greenwood Academy</h1>
                                    <p style="color: #7f8c8d; font-size: 13px; font-style: italic; margin: 5px 0 0 0;">Acta Oficial de Reunión Padre-Maestro</p>
                                </div>
                                <div style="color: #7f8c8d; font-size: 13px; text-align: right;">Fecha de descarga: ${fechaDescarga}</div>
                            </div>

                            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px 20px; margin-bottom: 25px;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600; width: 30%;">Año Académico:</td>
                                        <td style="padding: 5px 8px 5px 0; width: 20%;">${academicYear}</td>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600; width: 30%;">Fecha de creación:</td>
                                        <td style="padding: 5px 8px 5px 0; width: 20%;">${fechaCreacion}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600;">Estudiante:</td>
                                        <td style="padding: 5px 8px 5px 0;">${studentName}</td>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600;">Grado:</td>
                                        <td style="padding: 5px 8px 5px 0;">${currentGrade}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600;">Docente Titular:</td>
                                        <td style="padding: 5px 8px 5px 0;">${homeroomTeacher}</td>
                                        <td style="padding: 5px 8px 5px 0; font-weight: 600;">Padre/Madre:</td>
                                        <td style="padding: 5px 8px 5px 0;">${parentName}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="margin-bottom: 30px;">
                                <h2 style="color: #2b4c7e; font-size: 16px; border-left: 4px solid #e67e22; padding-left: 10px; margin-bottom: 12px; text-transform: uppercase; font-weight: 700;">📋 Minuta de la Reunión</h2>
                                <div style="font-size: 14px; line-height: 1.7; text-align: justify; white-space: pre-wrap; color: #34495e; background: #fafbfc; padding: 15px; border-radius: 4px; border: 1px solid #f1f3f5; min-height: 80px;">${minutesNotes}</div>
                            </div>

                            <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e9ecef;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="width: 100%; text-align: center; vertical-align: bottom; padding: 10px 15px;">
                                            <div style="height: 120px; margin-bottom: 10px; display: flex; justify-content: center; align-items: center; border: 1.5px dashed #dee2e6; background: #f8f9fa; padding: 8px; border-radius: 4px; min-height: 120px; overflow: hidden;">
                                                <img src="${signatureSrc}" style="max-height: 110px; max-width: 100%; object-fit: contain;" alt="Firma" />
                                            </div>
                                            <div style="border-top: 2px solid #2b4c7e; padding-top: 8px; font-size: 14px; font-weight: 700; color: #2c3e50;">Firmas</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #adb5bd; border-top: 1px solid #e9ecef; padding-top: 15px;">
                                Documento generado automáticamente por el Sistema de Observación Estudiantil<br>
                                Greenwood Academy - ${new Date().getFullYear()}
                            </div>
                        </div>
                    `;

                await new Promise(resolve => setTimeout(resolve, 800));

                const pdfOptions = {
                    margin: [8, 8, 8, 8],
                    filename: `Acta_${studentName.replace(/\s+/g, '_')}_${fechaCreacion.replace(/\s+/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: function(doc) {
                            const images = doc.querySelectorAll('img');
                            images.forEach(img => {
                                if (img.src && img.src.startsWith('data:')) {
                                    img.crossOrigin = "anonymous";
                                }
                            });
                        }
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait',
                        compress: true
                    }
                };

                const pdfElement = tempContainer.firstElementChild;
                await window.html2pdf()
                    .set(pdfOptions)
                    .from(pdfElement)
                    .save();

                document.body.removeChild(tempContainer);
                document.body.removeChild(overlay);

                statusMsg.className = "status-message success";
                statusMsg.innerText = "✅ PDF generado y descargado exitosamente.";
                setTimeout(() => {
                    if (statusMsg) statusMsg.innerText = previousStatus;
                }, 4000);

            } catch (error) {
                console.error("❌ Error generando PDF:", error);
                statusMsg.className = "status-message error";
                statusMsg.innerText = `❌ Error: ${error.message || 'No se pudo generar el PDF'}`;

                document.querySelectorAll('.pdf-loading-overlay, div[style*="top: -9999px"]').forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el);
                });
            }
        }

        // Event listener para búsqueda de estudiantes
        searchBtn.addEventListener('click', async () => {
            const studentId = studentIdInput.value.trim().toUpperCase();
            statusMsg.className = "status-message";
            statusMsg.innerText = "";
            formStatusMsg.innerText = "";
            confStatusMsg.innerText = "";
            profileLayout.style.display = "none";
            timelineContainer.innerHTML = "";
            activeStudentId = null;
            newObservationForm.reset();
            newConferenceForm.reset();
            ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
            revertFieldsToLabels();

            if (!studentId) {
                statusMsg.className = "status-message error";
                statusMsg.innerText = "Por favor ingrese un ID de estudiante válido.";
                return;
            }

            statusMsg.innerText = "Buscando registros...";

            try {
                const studentDocRef = db.collection('students').doc(studentId);
                const docSnapshot = await studentDocRef.get();

                if (!docSnapshot.exists) {
                    statusMsg.className = "status-message error";
                    statusMsg.innerText = `No se encontraron registros para el ID: ${studentId}`;
                    return;
                }

                const studentData = docSnapshot.data();
                initialStudentDataBackup = studentData;
                const targetGrade = studentData.basic_info?.grade;
                const homeroomTeacherId = studentData.governance?.homeroom_teacher_id || "";

                console.log("👨‍🏫 Homeroom Teacher ID del estudiante:", homeroomTeacherId);
                console.log("👩‍🏫 Profesor logueado:", currentTeacherProfile?.name);
                console.log("🎯 Rol del profesor:", currentTeacherProfile?.role);

                const role = currentTeacherProfile?.role;

                if (role !== 'admin' && role !== 'coordinator') {
                    const allowedClasses = currentTeacherProfile?.assigned_classes || [];
                    const explicitHomeroomClass = currentTeacherProfile?.assigned_group;

                    const hasHomeroomAccess = (role === 'homeroom' && targetGrade === explicitHomeroomClass);
                    const hasSubjectAccess = allowedClasses.includes(targetGrade);

                    console.log("📚 Clases permitidas:", allowedClasses);
                    console.log("🏫 Clase homeroom:", explicitHomeroomClass);
                    console.log("✅ Acceso homeroom:", hasHomeroomAccess);
                    console.log("✅ Acceso por materia:", hasSubjectAccess);

                    if (!hasHomeroomAccess && !hasSubjectAccess) {
                        statusMsg.className = "status-message error";
                        statusMsg.innerText =
                            `Acceso Denegado: Este estudiante está en '${targetGrade || 'Sin asignar'}'.`;
                        return;
                    }
                }

                activeStudentId = studentId;

                document.getElementById('lblStudentName').innerText = studentData.basic_info?.name || "-";
                document.getElementById('lblStudentGrade').innerText = targetGrade || "-";
                document.getElementById('lblStudentDOB').innerText = studentData.basic_info?.date_of_birth || "-";
                document.getElementById('lblStudentAge').innerText = studentData.basic_info?.age || "-";
                document.getElementById('lblStudentStartYear').innerText = studentData.basic_info?.starting_year || "-";

                document.getElementById('lblStudentInclusion').innerText = studentData.inclusion_and_support?.inclusion ||
                    "No";
                document.getElementById('lblStudentDiagnostic').innerText = studentData.inclusion_and_support?.diagnostic ||
                    "None Assigned";
                document.getElementById('lblStudentTherapy').innerText = studentData.inclusion_and_support
                    ?.therapeutic_process || "None";
                document.getElementById('lblStudentAllergies').innerText = studentData.medical_record?.allergies ||
                    "No Restrictions";
                document.getElementById('lblStudentTeacher').innerText = homeroomTeacherId || "-";

                document.getElementById('lblFatherName').innerText = studentData.family_and_contact?.father_name || "-";
                document.getElementById('lblFatherContact').innerText = studentData.family_and_contact?.father_contact ||
                    "-";
                document.getElementById('lblFatherJob').innerText = studentData.family_and_contact?.father_occupation ||
                    "-";
                document.getElementById('lblFatherEmail').innerText = studentData.family_and_contact?.father_email || "-";

                document.getElementById('lblMotherName').innerText = studentData.family_and_contact?.mother_name || "-";
                document.getElementById('lblMotherContact').innerText = studentData.family_and_contact?.mother_contact ||
                    "-";
                document.getElementById('lblMotherJob').innerText = studentData.family_and_contact?.mother_occupation ||
                    "-";
                document.getElementById('lblMotherEmail').innerText = studentData.family_and_contact?.mother_email || "-";

                document.getElementById('lblStudentSiblings').innerText = studentData.family_and_contact?.siblings || "0";

                document.getElementById('lblStudentIllness').innerText = studentData.medical_record?.illnesses ||
                    "None Reported";
                document.getElementById('lblStudentMedicine').innerText = studentData.medical_record?.medicine || "None";
                document.getElementById('lblStudentPrescription').innerText = studentData.medical_record?.prescription ||
                    "None";
                document.getElementById('lblAcademicPerformance').innerText = studentData.academic_metrics
                    ?.academic_performance || "-";
                document.getElementById('lblAcademicPercentage').innerText = studentData.academic_metrics?.perf || "-%";

                await loadObservationsTimeline(studentDocRef);

                statusMsg.className = "status-message success";
                statusMsg.innerText = "Registros del estudiante sincronizados correctamente.";

                profileLayout.style.display = "block";

                const isAdmin = currentTeacherProfile && currentTeacherProfile.role === 'admin';
                const isCoordinator = currentTeacherProfile && currentTeacherProfile.role === 'coordinator';
                const isHomeroomMatch = currentTeacherProfile &&
                    currentTeacherProfile.role === 'homeroom' &&
                    currentTeacherProfile.name === homeroomTeacherId;

                const isTeacher = currentTeacherProfile && currentTeacherProfile.role === 'teacher';

                if (isAdmin || isCoordinator || isHomeroomMatch) {
                    htComplianceTracker.style.display = 'flex';
                    conferenceSection.style.display = 'block';
                    setupSignatureCanvas();
                    await evaluateConferenceCompliance(studentDocRef);
                } else {
                    htComplianceTracker.style.display = 'none';
                    conferenceSection.style.display = 'none';
                    if (isTeacher) {
                        console.log("ℹ️ Teacher no tiene acceso a conferencias.");
                    } else {
                        console.log("ℹ️ No se muestran conferencias: el profesor no coincide con el homeroom_teacher_id del estudiante.");
                    }
                }

                const photoStringData = studentData.basic_info?.photo;
                document.getElementById('imgStudentPhoto').src = photoStringData || defaultAvatarPlaceholder;

            } catch (error) {
                console.error("Error de sincronización:", error);
                statusMsg.className = "status-message error";
                statusMsg.innerText = "Ocurrió un error al acceder a la base de datos. Revise la consola.";
            }
        });

        // Envío de email
        async function sendEmailNotification(fatherEmail, motherEmail, studentName, logText, termLabel) {
            const recipients = [];
            if (fatherEmail && fatherEmail !== 'N/A' && fatherEmail.includes('@')) recipients.push(fatherEmail);
            if (motherEmail && motherEmail !== 'N/A' && motherEmail.includes('@')) recipients.push(motherEmail);

            if (recipients.length === 0) {
                console.warn("No hay emails válidos para notificar.");
                return "No hay emails de padres registrados.";
            }

            const templateParams = {
                to_emails: recipients.join(', '),
                student_name: studentName,
                academic_term: termLabel,
                observation_details: logText,
                teacher_signature: currentTeacherProfile.name || "Administración"
            };

            try {
                await emailjs.send('service_kopy422', 'template_mbk58k4', templateParams);
                return "Notificación enviada exitosamente.";
            } catch (mailError) {
                console.error("Error en EmailJS:", mailError);
                throw new Error(`Error al enviar correo: ${mailError.text || mailError.message}`);
            }
        }

        newObservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formStatusMsg.className = "status-message";
            formStatusMsg.innerText = "Guardando observación...";

            if (!activeStudentId || !currentTeacherProfile || !initialStudentDataBackup) {
                formStatusMsg.className = "status-message error";
                formStatusMsg.innerText = "Error: Sesión no válida.";
                return;
            }

            const academicYear = document.getElementById('logAcademicYear').value;
            const term = document.getElementById('logTerm').value;
            const observationText = document.getElementById('logText').value.trim();
            const triggerNotification = document.getElementById('chkSendEmail') ? document.getElementById('chkSendEmail')
                .checked : false;

            try {
                const studentDocRef = db.collection('students').doc(activeStudentId);

                const newLogPayload = {
                    academic_year: academicYear,
                    term: term,
                    observation_text: observationText,
                    logged_by: currentTeacherProfile.name || "Personal",
                    author_uid: currentTeacherProfile.uid,
                    date_added: firebase.firestore.FieldValue.serverTimestamp(),
                    sent_to_parents: triggerNotification
                };

                await studentDocRef.collection('observations').add(newLogPayload);

                let emailStatusNotice = "";

                if (triggerNotification) {
                    formStatusMsg.innerText = "Enviando notificación por correo...";

                    const fatherEmail = initialStudentDataBackup.family_and_contact?.father_email;
                    const motherEmail = initialStudentDataBackup.family_and_contact?.mother_email;
                    const studentName = initialStudentDataBackup.basic_info?.name || "Estudiante";

                    try {
                        const mailResult = await sendEmailNotification(fatherEmail, motherEmail, studentName,
                            observationText, term);
                        emailStatusNotice = ` (${mailResult})`;
                    } catch (emailErr) {
                        emailStatusNotice = ` (Error de correo: ${emailErr.message})`;
                    }
                }

                formStatusMsg.className = "status-message success";
                formStatusMsg.innerText = `Observación guardada exitosamente.${emailStatusNotice}`;

                document.getElementById('logText').value = "";
                if (document.getElementById('chkSendEmail')) {
                    document.getElementById('chkSendEmail').checked = false;
                }
                await loadObservationsTimeline(studentDocRef);

            } catch (err) {
                console.error("Error al guardar:", err);
                formStatusMsg.className = "status-message error";
                formStatusMsg.innerText = "Error al guardar la observación.";
            }
        });

        newConferenceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            confStatusMsg.className = "status-message";
            confStatusMsg.innerText = "Guardando conferencia...";

            if (!activeStudentId || !currentTeacherProfile) {
                confStatusMsg.className = "status-message error";
                confStatusMsg.innerText = "Error: Sesión no válida.";
                return;
            }

            const signatureBase64 = signaturePad.toDataURL();
            const emptyCanvas = document.createElement('canvas');
            emptyCanvas.width = signaturePad.width;
            emptyCanvas.height = signaturePad.height;
            if (signatureBase64 === emptyCanvas.toDataURL()) {
                confStatusMsg.className = "status-message error";
                confStatusMsg.innerText = "❌ Se requiere la firma digital del padre para guardar la conferencia.";
                return;
            }

            const academicYear = document.getElementById('confAcademicYear').value;
            const parentName = document.getElementById('confParentName').value.trim();
            const conferenceNotes = document.getElementById('confNotes').value.trim();

            try {
                const studentDocRef = db.collection('students').doc(activeStudentId);

                const conferencePayload = {
                    academic_year: academicYear,
                    parent_name: parentName,
                    notes: conferenceNotes,
                    logged_by: currentTeacherProfile.name || "Docente",
                    author_uid: currentTeacherProfile.uid,
                    date_logged: firebase.firestore.FieldValue.serverTimestamp(),
                    parent_signature: signatureBase64
                };

                await studentDocRef.collection('conferences').add(conferencePayload);

                confStatusMsg.className = "status-message success";
                confStatusMsg.innerText = "✅ Conferencia guardada exitosamente.";

                newConferenceForm.reset();
                ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);

                if (currentTeacherProfile.role === 'admin' || currentTeacherProfile.role === 'coordinator') {
                    const selectedTeacher = teacherSelect.value;
                    if (selectedTeacher) {
                        await loadTeacherReport(selectedTeacher);
                    }
                    await loadTeacherList();
                }

                await evaluateConferenceCompliance(studentDocRef);

            } catch (err) {
                console.error("Error al guardar conferencia:", err);
                confStatusMsg.className = "status-message error";
                confStatusMsg.innerText = "Error al guardar la conferencia.";
            }
        });

        console.log("Sistema de Observación Estudiantil iniciado.");
        console.log("Versión con reporte consolidado y firma intacta.");