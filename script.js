// Global variables for the balance and reward process
let userBalance = 0.000; // User's initial balance
let referralEarnings = 0.000; // Referral earnings
let claimAmounts = 0.005; // Reward for each claim

// API URL (replace with actual backend URLs)
const apiUrl = "telegram-ser.vercel.app";

// Show the section when clicked
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    document.getElementById(sectionId).style.display = 'block';
}

// Show the loading screen and navigate to the home section after loading
window.onload = function () {
    setTimeout(() => {
        document.getElementById("loading-screen").style.display = "none"; // Hide loading screen
        showSection('home-section'); // Show home section
    }, 2000); // Simulate loading for 2 seconds
};

// Function to update the balance displayed in the UI
function updateBalance() {
    document.getElementById("balance").textContent = userBalance.toFixed(3);
}

// Fetch the user's balance from the backend
function fetchUserBalance() {
    fetch(`${apiUrl}/balance`)
        .then(response => response.json())
        .then(data => {
            userBalance = data.balance;
            updateBalance();
        })
        .catch(error => {
            console.error("Error fetching balance:", error);
        });
}

// Function to handle the ad-watching process for each button
function watchAds(adIndex) {
    const adButton = document.querySelectorAll('.claim-btn')[adIndex];
    const timerElement = document.getElementById(`timer-${adIndex}`);
    
    if (adButton.dataset.claimInProgress === 'true') return;

    // Change button to show "Claim" after watching the ad
    adButton.textContent = "Claim";
    adButton.style.backgroundColor = "green"; 

    startClaimTimer(adIndex);

    adButton.dataset.claimInProgress = 'true';

    adButton.onclick = function () {
        claimReward(adIndex);
    };
}

// Function to handle the claiming process
function claimReward(adIndex) {
    const adButton = document.querySelectorAll('.claim-btn')[adIndex];

    if (adButton.dataset.claimInProgress !== 'true') return;

    // Call the backend to claim the reward
    fetch(`${apiUrl}/claim-reward`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: claimAmounts })
    })
    .then(response => response.json())
    .then(data => {
        userBalance += claimAmounts;
        updateBalance();

        adButton.textContent = "Claimed";
        adButton.style.backgroundColor = "orange";
        adButton.disabled = true;

        startCooldownTimer(adIndex);
    })
    .catch(error => {
        console.error("Error claiming reward:", error);
    });
}

// Function to start the 2-hour cooldown timer after claiming
function startCooldownTimer(adIndex) {
    const adButton = document.querySelectorAll('.claim-btn')[adIndex];
    const timerElement = document.getElementById(`timer-${adIndex}`);
    let remainingTime = 2 * 60 * 60; // 2 hours in seconds

    function updateTimer() {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        timerElement.textContent = `Next claim in: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        remainingTime--;

        if (remainingTime < 0) {
            clearInterval(adButton.timer); 
            adButton.textContent = "Start";
            adButton.style.backgroundColor = "gold"; 
            adButton.disabled = false;

            adButton.dataset.claimInProgress = 'false';
            timerElement.textContent = "Next claim in: 00:00:00";
        }
    }

    adButton.timer = setInterval(updateTimer, 1000);
}

// Function to start the short cooldown timer before claiming
function startClaimTimer(adIndex) {
    const timerElement = document.getElementById(`timer-${adIndex}`);
    let remainingTime = 5; 

    function updateClaimTimer() {
        const seconds = remainingTime;
        timerElement.textContent = `Next claim in: 00:00:0${seconds}`;
        remainingTime--;

        if (remainingTime < 0) {
            clearInterval(timerElement.timer);
            timerElement.textContent = "Ready to claim!";
        }
    }

    timerElement.timer = setInterval(updateClaimTimer, 1000);
}

// Handle withdrawal process
function handleWithdrawal(event) {
    event.preventDefault();

    const withdrawalAmount = parseFloat(document.getElementById('withdraw-amount').value);
    const withdrawalAddress = document.getElementById('withdraw-address').value;

    if (isNaN(withdrawalAmount) || withdrawalAmount < 3) {
        alert("Minimum withdrawal is $3.");
        return;
    }

    if (withdrawalAddress === "") {
        alert("Please enter a valid address.");
        return;
    }

    if (withdrawalAmount > userBalance) {
        alert("Insufficient balance.");
        return;
    }

    // Call the backend to process the withdrawal
    fetch(`${apiUrl}/withdraw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: withdrawalAmount, address: withdrawalAddress })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            userBalance -= withdrawalAmount;
            document.getElementById('balance').innerText = userBalance.toFixed(3); 
            document.getElementById('withdraw-status').innerText = `Withdrawal of $${withdrawalAmount} to ${withdrawalAddress} is pending.`;
        } else {
            alert(data.message || "Withdrawal failed");
        }
    })
    .catch(error => {
        console.error("Error during withdrawal:", error);
    });
}

// Add event listeners for "Start" button clicks in all ad containers
document.querySelectorAll('.claim-btn').forEach((button, index) => {
    button.dataset.claimInProgress = 'false';
    button.onclick = function () {
        if (button.dataset.claimInProgress === 'false') {
            watchAds(index); 
        }
    };
});

// Add event listeners for daily claim, withdrawal, etc.
document.getElementById('claim-daily-reward').addEventListener('click', claimDailyReward);
document.getElementById('withdraw-form').addEventListener('submit', handleWithdrawal);

// Daily claim reward functionality
let dailyClaimTimer = null;
let dailyClaimTimeRemaining = 0;

function updateDailyClaimTimer() {
    const timerElement = document.getElementById('timer-daily-reward');
    
    if (dailyClaimTimeRemaining > 0) {
        dailyClaimTimeRemaining--;
        const hours = Math.floor(dailyClaimTimeRemaining / 3600);
        const minutes = Math.floor((dailyClaimTimeRemaining % 3600) / 60);
        const seconds = dailyClaimTimeRemaining % 60;
        timerElement.innerText = `Next claim in: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        timerElement.innerText = "You can claim now!";
    }
}

function claimDailyReward() {
    if (dailyClaimTimeRemaining > 0) return; 

    userBalance += 0.003; 
    document.getElementById('balance').innerText = userBalance.toFixed(3); 
    dailyClaimTimeRemaining = 86400; 
    dailyClaimTimer = setInterval(updateDailyClaimTimer, 1000); 
    document.getElementById('claim-daily-reward').innerText = 'Claimed'; 
    document.getElementById('claim-daily-reward').disabled = true; 
}

// Referral commission claim functionality
function claimReferralCommission() {
    if (referralEarnings > 0) {
        userBalance += referralEarnings;
        updateBalance(); 
        referralEarnings = 0;
        alert('Referral commission claimed successfully!');
    } else {
        alert('No referral commission available.');
    }
}

// Generate referral link
function generateReferralLink() {
    let referralLink = "https://t.me/yourbot?start=" + generateRandomReferralCode();
    document.getElementById('referral-link').innerText = referralLink;
    return referralLink;
}

// Generate a random referral code
function generateRandomReferralCode() {
    return Math.random().toString(36).substring(2, 10); 
}

// Copy referral link to clipboard
function copyReferralLink() {
    let referralLink = document.getElementById('referral-link').innerText;
    navigator.clipboard.writeText(referralLink).then(() => {
        alert('Referral link copied to clipboard!');
    });
}

// Handle referral list display
function updateReferralList(referrals) {
    const referralList = document.getElementById('referral-list');
    if (referrals.length > 0) {
        referralList.innerHTML = referrals.join('<br>');
    } else {
        referralList.innerHTML = 'No referrals yet.';
    }
}

// Claim referral earnings
function claimReferralEarnings() {
    userBalance += referralEarnings;
    document.getElementById('balance').innerText = userBalance.toFixed(3);
    document.getElementById('referral-earnings').innerText = '$0.00'; 
    alert('Referral earnings claimed successfully!');
}

// Fetch user balance when the page loads
fetchUserBalance();
