// ফায়ারবেস কনফিগারেশন
const firebaseConfig = { 
    databaseURL: "https://bamandanga-voter-default-rtdb.asia-southeast1.firebasedatabase.app/" 
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// DOM Elements
const jobForm = document.getElementById('jobForm');
const jobList = document.getElementById('jobList');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const btnFilter = document.getElementById('btnFilter');

const androidCountEl = document.getElementById('androidCount');
const androidSumEl = document.getElementById('androidSum');
const buttonCountEl = document.getElementById('buttonCount');
const buttonSumEl = document.getElementById('buttonSum');
const totalIncomeEl = document.getElementById('totalIncome');
const totalCountEl = document.getElementById('totalCount');
const btnSubmit = document.getElementById('btnSubmit');

let currentFilteredData = [];

// ফায়ারবেসের জন্য YYYY-MM-DD ফরম্যাট
function getDbDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ইনপুট ফিল্ড ও টেবিলে প্রদর্শনের জন্য DD/MM/YYYY ফরম্যাট
function getDisplayDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

// YYYY-MM-DD ডাটাকে DD/MM/YYYY-তে রূপান্তর
function formatDbToDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// DD/MM/YYYY ডাটাকে YYYY-MM-DD (ফায়ারবেস কুয়েরির জন্য)-তে রূপান্তর
function formatDisplayToDb(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

// টোস্ট নোটিফিকেশন কাস্টম ফাংশন
function showToast(message, type = "success") {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top", 
        position: "center", 
        stopOnFocus: true, 
        style: {
            background: type === "success" ? "#00897b" : "#d32f2f",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600"
        }
    }).showToast();
}

// ইনপুট বক্সে DD/MM/YYYY ফরম্যাটে আজকের তারিখ সেট করা
startDateInput.value = getDisplayDateString();
endDateInput.value = getDisplayDateString();

// তারিখ ফিল্টার সেট করার কুইক ফাংশন
window.setFilter = (type) => {
    const today = new Date();
    if (type === 'today') {
        startDateInput.value = getDisplayDateString(today);
        endDateInput.value = getDisplayDateString(today);
    } else if (type === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDateInput.value = getDisplayDateString(firstDay);
        endDateInput.value = getDisplayDateString(today);
    }
    loadReportData();
};

// ফায়ারবেস থেকে তারিখের পরিসর অনুযায়ী ডাটা লোড ও তারিখ অনুযায়ী গ্রুপ করা
function loadReportData() {
    const start = formatDisplayToDb(startDateInput.value);
    const end = formatDisplayToDb(endDateInput.value);

    db.ref('daily_jobs').orderByChild('date').startAt(start).endAt(end).on('value', (snapshot) => {
        jobList.innerHTML = '';
        currentFilteredData = [];
        
        let androidCount = 0, androidTotal = 0;
        let buttonCount = 0, buttonTotal = 0;
        let jobIndex = 0;

        if (snapshot.exists()) {
            const data = snapshot.val();
            const keys = Object.keys(data).reverse();

            // ১. তারিখ অনুযায়ী অবজেক্টে ডাটা গ্রুপ করা
            const groupedData = {};

            keys.forEach((key) => {
                const job = data[key];
                job.key = key;
                currentFilteredData.push(job);

                const dateKey = job.date; // YYYY-MM-DD
                if (!groupedData[dateKey]) {
                    groupedData[dateKey] = [];
                }
                groupedData[dateKey].push(job);
            });

            // ২. গ্রুপ করা ডাটাগুলো টেবিলে আলাদা তারিখের সেকশন তৈরি করে রেন্ডার করা
            Object.keys(groupedData).forEach((dateKey) => {
                const jobsInDate = groupedData[dateKey];

                // প্রতিটি নতুন তারিখের জন্য হেডার রো (Header Row)
                const dateHeaderRow = document.createElement('tr');
                dateHeaderRow.style.backgroundColor = '#e0f2f1';
                dateHeaderRow.innerHTML = `
                    <td colspan="7" style="text-align: left; font-weight: bold; color: #004d40; padding: 10px 12px; border-top: 2px solid #b2dfdb;">
                        📅 তারিখ: ${formatDbToDisplay(dateKey)} (${jobsInDate.length} টি কাজ)
                    </td>
                `;
                jobList.appendChild(dateHeaderRow);

                // ওই দিনের কাজগুলো রেন্ডার করা
                jobsInDate.forEach((job) => {
                    const bill = Number(job.bill || 0);
                    jobIndex++;

                    if (job.deviceType === 'android') {
                        androidCount++;
                        androidTotal += bill;
                    } else {
                        buttonCount++;
                        buttonTotal += bill;
                    }

                    const badgeClass = job.deviceType === 'android' ? 'badge-android' : 'badge-button';
                    const badgeText = job.deviceType === 'android' ? 'অ্যান্ড্রয়েড' : 'বাটন';

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${jobIndex}</td>
                        <td>${formatDbToDisplay(job.date)}</td>
                        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                        <td><b>${job.model}</b></td>
                        <td>${job.issue}</td>
                        <td>৳${job.bill}</td>
                        <td>
                            <button class="btn-delete" onclick="deleteJob('${job.key}')" title="ডিলিট করুন">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    `;
                    jobList.appendChild(row);
                });
            });

            // কার্ডের তথ্য আপডেট
            androidCountEl.innerText = `${androidCount} টি`;
            androidSumEl.innerText = `৳ ${androidTotal}`;
            buttonCountEl.innerText = `${buttonCount} টি`;
            buttonSumEl.innerText = `৳ ${buttonTotal}`;
            totalIncomeEl.innerText = `৳ ${androidTotal + buttonTotal}`;
            totalCountEl.innerText = `মোট: ${androidCount + buttonCount} টি`;

        } else {
            jobList.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">নির্বাচিত তারিখে কোনো কাজ পাওয়া যায়নি।</td></tr>';
            androidCountEl.innerText = '০ টি';
            androidSumEl.innerText = '৳ ০';
            buttonCountEl.innerText = '০ টি';
            buttonSumEl.innerText = '৳ ০';
            totalIncomeEl.innerText = '৳ ০';
            totalCountEl.innerText = 'মোট: ০ টি';
        }
    });
}

btnFilter.addEventListener('click', loadReportData);

// নতুন কাজ সেভ
jobForm.addEventListener('submit', (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সেভ হচ্ছে...';

    const saveDbDate = getDbDateString();

    const newJob = {
        deviceType: document.getElementById('deviceType').value,
        model: document.getElementById('phoneModel').value.trim(),
        issue: document.getElementById('issue').value.trim(),
        bill: Number(document.getElementById('billAmount').value),
        date: saveDbDate,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('daily_jobs').push(newJob)
        .then(() => {
            jobForm.reset();
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> সেভ করুন';
            
            // রিয়েলটাইম ইনপুট ডেট রিফ্রেশ (DD/MM/YYYY)
            startDateInput.value = getDisplayDateString();
            endDateInput.value = getDisplayDateString();
            
            showToast('নতুন কাজ সফলভাবে সেভ হয়েছে!');
            loadReportData();
        })
        .catch((error) => {
            showToast('ডাটা সেভ করতে সমস্যা হয়েছে: ' + error.message, 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> সেভ করুন';
        });
});

// ডিলিট কনফার্মেশন (SweetAlert2)
window.deleteJob = (key) => {
    Swal.fire({
        title: 'আপনি কি নিশ্চিত?',
        text: "এই এন্ট্রিটি স্থায়ীভাবে মুছে ফেলা হবে!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'হ্যাঁ, মুছে ফেলুন!',
        cancelButtonText: 'বাতিল'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref('daily_jobs/' + key).remove()
                .then(() => {
                    showToast('এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে');
                })
                .catch((error) => {
                    showToast('মুছে ফেলতে সমস্যা হয়েছে: ' + error.message, 'error');
                });
        }
    });
};

// --- Excel এ ডাউনলোড করার লজিক ---
document.getElementById('btnExcel').addEventListener('click', () => {
    if (currentFilteredData.length === 0) {
        showToast('ডাউনলোড করার জন্য কোনো ডাটা নেই!', 'error');
        return;
    }

    const excelData = currentFilteredData.map((job, index) => ({
        'ক্রমিক': index + 1,
        'তারিখ': formatDbToDisplay(job.date),
        'ধরন': job.deviceType === 'android' ? 'অ্যান্ড্রয়েড' : 'বাটন',
        'মোবাইল মডেল': job.model,
        'কাজের বিবরণ': job.issue,
        'বিল (টাকা)': job.bill
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "কাজের রিপোর্ট");
    XLSX.writeFile(workbook, `Mobile_Care_Clinic_Report_${startDateInput.value}_to_${endDateInput.value}.xlsx`);
});

// --- PDF জেনারেট করার লজিক ---
document.getElementById('btnPDF').addEventListener('click', () => {
    if (currentFilteredData.length === 0) {
        showToast('ডাউনলোড করার জন্য কোনো ডাটা নেই!', 'error');
        return;
    }
    window.print();
});

// পেজ লোড হওয়ার সাথে সাথে রিপোর্ট লোড হবে
loadReportData();
