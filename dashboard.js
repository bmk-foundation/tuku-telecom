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

// আজকের তারিখ নেওয়া
const todayStr = new Date().toISOString().split('T')[0];
startDateInput.value = todayStr;
endDateInput.value = todayStr;

// তারিখ ফিল্টার সেট করার কুইক ফাংশন
window.setFilter = (type) => {
    const today = new Date();
    if (type === 'today') {
        startDateInput.value = todayStr;
        endDateInput.value = todayStr;
    } else if (type === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        startDateInput.value = firstDay;
        endDateInput.value = todayStr;
    }
    loadReportData();
};

// ফায়ারবেস থেকে তারিখের পরিসর অনুযায়ী ডাটা লোড করা
function loadReportData() {
    const start = startDateInput.value;
    const end = endDateInput.value;

    db.ref('daily_jobs').orderByChild('date').startAt(start).endAt(end).on('value', (snapshot) => {
        jobList.innerHTML = '';
        currentFilteredData = [];
        
        let androidCount = 0, androidTotal = 0;
        let buttonCount = 0, buttonTotal = 0;
        let jobIndex = 0;

        if (snapshot.exists()) {
            const data = snapshot.val();
            const keys = Object.keys(data).reverse();

            keys.forEach((key) => {
                const job = data[key];
                job.key = key;
                currentFilteredData.push(job);
                
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
                    <td>${job.date}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td><b>${job.model}</b></td>
                    <td>${job.issue}</td>
                    <td>৳${job.bill}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteJob('${key}')" title="ডিলিট করুন">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                jobList.appendChild(row);
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

    const newJob = {
        deviceType: document.getElementById('deviceType').value,
        model: document.getElementById('phoneModel').value.trim(),
        issue: document.getElementById('issue').value.trim(),
        bill: Number(document.getElementById('billAmount').value),
        date: todayStr,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('daily_jobs').push(newJob)
        .then(() => {
            jobForm.reset();
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> সেভ করুন';
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
        'তারিখ': job.date,
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
