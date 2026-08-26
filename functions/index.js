const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

/**
 * Send FCM Notification to all active Admin devices
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} payload.type - 'gmail' | 'withdrawal' | 'new_user' | 'report'
 * @param {string} payload.target - 'submissions' | 'withdrawals' | 'users' | 'chat'
 * @param {string} payload.id - Document/Record ID
 * @param {string} payload.preferenceKey - 'pref_gmail' | 'pref_withdrawal' | 'pref_new_user' | 'pref_report'
 */
async function dispatchAdminNotification({ title, body, type, target, id, preferenceKey }) {
  try {
    const tokensSnapshot = await db.ref("admin_tokens").once("value");
    if (!tokensSnapshot.exists()) {
      console.log("No registered Admin FCM tokens found.");
      return;
    }

    const tokensData = tokensSnapshot.val();
    const targetTokens = [];
    const tokenKeysToDelete = [];

    // Filter tokens based on admin preferences and validity
    Object.keys(tokensData).forEach((deviceId) => {
      const item = tokensData[deviceId];
      if (!item || !item.token) return;

      // Master switch check
      if (item.enabled === false) return;

      // Category specific check
      if (preferenceKey && item[preferenceKey] === false) return;

      targetTokens.push({
        deviceId,
        token: item.token
      });
    });

    if (targetTokens.length === 0) {
      console.log(`No tokens subscribed to notification category: ${preferenceKey || type}`);
      return;
    }

    // Deduplicate tokens
    const uniqueTokensMap = new Map();
    targetTokens.forEach(t => uniqueTokensMap.set(t.token, t.deviceId));
    const tokenList = Array.from(uniqueTokensMap.keys());

    const message = {
      tokens: tokenList,
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: String(type || "general"),
        target: String(target || "dashboard"),
        id: String(id || ""),
        title: String(title),
        body: String(body),
        click_action: "FLUTTER_NOTIFICATION_CLICK", // for cross-platform compatibility
      },
      android: {
        priority: "high",
        notification: {
          title: title,
          body: body,
          icon: "ic_notification",
          color: "#4F46E5",
          sound: "default",
          channelId: getChannelId(type),
          clickAction: "com.mailfactory.admin.MAIN_ACTIVITY",
          notificationPriority: "PRIORITY_MAX",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };

    console.log(`Sending FCM notification [${type}] to ${tokenList.length} devices...`);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent: ${response.successCount}, Failed: ${response.failureCount}`);

    // Cleanup stale/unregistered tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const failedToken = tokenList[idx];
          const error = resp.error;
          console.error(`Token failed: ${failedToken}`, error?.code);
          if (
            error?.code === "messaging/invalid-registration-token" ||
            error?.code === "messaging/registration-token-not-registered"
          ) {
            const deviceId = uniqueTokensMap.get(failedToken);
            if (deviceId) {
              tokenKeysToDelete.push(db.ref(`admin_tokens/${deviceId}`).remove());
            }
          }
        }
      });
      if (tokenKeysToDelete.length > 0) {
        await Promise.all(tokenKeysToDelete);
        console.log(`Pruned ${tokenKeysToDelete.length} obsolete tokens.`);
      }
    }
  } catch (error) {
    console.error("Error dispatching Admin push notification:", error);
  }
}

function getChannelId(type) {
  switch (type?.toLowerCase()) {
    case "gmail":
      return "channel_gmail";
    case "withdrawal":
    case "withdraw":
      return "channel_withdrawal";
    case "new_user":
    case "user":
      return "channel_user";
    case "report":
    case "support":
      return "channel_report";
    default:
      return "channel_general";
  }
}

/**
 * 1. Trigger on New Gmail Submission
 */
exports.onNewGmailSubmission = functions.database
  .ref("/submissions/{submissionId}")
  .onCreate(async (snapshot, context) => {
    const submissionId = context.params.submissionId;
    const data = snapshot.val() || {};

    await dispatchAdminNotification({
      title: "📧 নতুন Gmail এসেছে",
      body: `নতুন Gmail এসেছে (${data.email || "Sub ID: " + submissionId.slice(0, 6)})। Admin Panel থেকে ইনবক্স চেক করুন।`,
      type: "gmail",
      target: "submissions",
      id: submissionId,
      preferenceKey: "pref_gmail"
    });
  });

/**
 * 2. Trigger on New Withdrawal Request
 */
exports.onNewWithdrawalRequest = functions.database
  .ref("/withdraw_requests/{withdrawId}")
  .onCreate(async (snapshot, context) => {
    const withdrawId = context.params.withdrawId;
    const data = snapshot.val() || {};
    const amount = data.amount ? `৳${data.amount}` : "টাকা";

    await dispatchAdminNotification({
      title: "💰 নতুন উত্তোলন রিকোয়েস্ট",
      body: `একজন ইউজার ${amount} উত্তোলন রিকোয়েস্ট করেছে। বিস্তারিত দেখতে Admin Panel খুলুন।`,
      type: "withdrawal",
      target: "withdrawals",
      id: withdrawId,
      preferenceKey: "pref_withdrawal"
    });
  });

/**
 * 2b. Backup trigger for /withdraws/ path if used
 */
exports.onNewWithdrawBackup = functions.database
  .ref("/withdraws/{withdrawId}")
  .onCreate(async (snapshot, context) => {
    const withdrawId = context.params.withdrawId;
    const data = snapshot.val() || {};
    const amount = data.amount ? `৳${data.amount}` : "টাকা";

    await dispatchAdminNotification({
      title: "💰 নতুন উত্তোলন রিকোয়েস্ট",
      body: `একজন ইউজার ${amount} উত্তোলন রিকোয়েস্ট করেছে। বিস্তারিত দেখতে Admin Panel খুলুন।`,
      type: "withdrawal",
      target: "withdrawals",
      id: withdrawId,
      preferenceKey: "pref_withdrawal"
    });
  });

/**
 * 3. Trigger on New User Registration
 */
exports.onNewUserRegistered = functions.database
  .ref("/users/{userId}")
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const data = snapshot.val() || {};
    const name = data.name || data.email || "সদস্য";

    await dispatchAdminNotification({
      title: "👤 নতুন সদস্য রেজিস্ট্রেশন",
      body: `নতুন একজন সদস্য (${name}) রেজিস্ট্রেশন করেছে।`,
      type: "new_user",
      target: "users",
      id: userId,
      preferenceKey: "pref_new_user"
    });
  });

/**
 * 4. Trigger on New Report / Dispute
 */
exports.onNewReport = functions.database
  .ref("/reports/{reportId}")
  .onCreate(async (snapshot, context) => {
    const reportId = context.params.reportId;
    const data = snapshot.val() || {};

    await dispatchAdminNotification({
      title: "⚠️ নতুন রিপোর্ট",
      body: `একজন ইউজার নতুন রিপোর্ট জমা দিয়েছে: ${data.subject || data.reason || "বিস্তারিত চেক করুন"}`,
      type: "report",
      target: "chat",
      id: reportId,
      preferenceKey: "pref_report"
    });
  });

/**
 * 5. Manual Admin Dispatch Callable Function (Secure Admin-Only)
 */
exports.sendManualAdminPush = functions.https.onCall(async (data, context) => {
  // Verify that requester is an authorized Admin
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }

  const { title, body, type, target, id } = data;
  if (!title || !body) {
    throw new functions.https.HttpsError("invalid-argument", "Title and body are required.");
  }

  await dispatchAdminNotification({
    title,
    body,
    type: type || "general",
    target: target || "dashboard",
    id: id || "",
    preferenceKey: null
  });

  return { success: true, message: "Push notification dispatched successfully." };
});

/**
 * 6. Trigger on New Global Notification (All Users)
 */
exports.onGlobalNotification = functions.database
  .ref("/admin_notifications/{notifId}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val() || {};
    if (!data.sendPush) return; // Only process intended pushes

    try {
      const usersSnap = await db.ref("users").once("value");
      if (!usersSnap.exists()) return;

      const users = usersSnap.val();
      const tokens = [];
      Object.keys(users).forEach(uid => {
        const u = users[uid];
        if (u.fcmToken) tokens.push(u.fcmToken);
        if (u.token) tokens.push(u.token);
      });

      if (tokens.length === 0) return;

      // Deduplicate tokens
      const uniqueTokens = [...new Set(tokens)];

      let message = {
        notification: {
          title: data.title || "New Announcement",
          body: data.message || "",
        },
        data: {
          type: "global_notice",
          id: context.params.notifId,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        },
        android: {
          priority: "high"
        }
      };

      if (data.customPayload) {
        message = { ...data.customPayload };
      }

      // Send in batches of 500 (FCM limit)
      const batchSize = 500;
      for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const tokenBatch = uniqueTokens.slice(i, i + batchSize);
        await admin.messaging().sendEachForMulticast({
          ...message,
          tokens: tokenBatch
        });
      }
      
      console.log(`Global notification sent to ${uniqueTokens.length} devices.`);
    } catch (error) {
      console.error("Error sending global user push notification:", error);
    }
  });

/**
 * 7. Trigger on Specific User Notification
 */
exports.onUserNotification = functions.database
  .ref("/users/{uid}/notifications/{notifId}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val() || {};
    if (!data.sendPush) return; // Only process intended pushes

    const uid = context.params.uid;
    try {
      const userSnap = await db.ref(`users/${uid}`).once("value");
      if (!userSnap.exists()) return;

      const u = userSnap.val();
      const token = u.fcmToken || u.token;
      
      if (!token) {
        console.log(`No FCM token for user ${uid}`);
        return;
      }

      let message = {
        token: token,
        notification: {
          title: data.title || "New Notification",
          body: data.message || "",
        },
        data: {
          type: "user_notice",
          id: context.params.notifId,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        },
        android: {
          priority: "high"
        }
      };

      if (data.customPayload) {
        message = { ...data.customPayload, token: token }; // Ensure token is preserved
      }

      await admin.messaging().send(message);
      console.log(`Notification sent to user ${uid}`);
    } catch (error) {
      console.error(`Error sending user push notification to ${uid}:`, error);
    }
  });

/**
 * 8. Scheduled Task: Remind Admin every 3 hours
 */
const adminReminderMessages = [
  "ডেয়ার এডমিন, জিমেইল ইনবক্স চেক করুন। অনেক পেন্ডিং সাবমিশন জমা হয়েছে!",
  "প্রিয় এডমিন, মেম্বাররা জিমেইল জমা দিয়েছে। দ্রুত রিভিউ করে পেমেন্ট নিশ্চিত করুন।",
  "অ্যাকশন টাইম! এডমিন জিমেইল চেক করুন এবং ইউজারের কাজগুলো অ্যাপ্রুভ করুন।",
  "এডমিন সাহেব, আপনার ড্যাশবোর্ড চেক করুন। নতুন কাজের আপডেট চলে এসেছে।"
];

exports.scheduledAdminReminder = functions.pubsub
  .schedule('0 */3 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async (context) => {
    const randomIndex = Math.floor(Math.random() * adminReminderMessages.length);
    const bodyText = adminReminderMessages[randomIndex];

    await dispatchAdminNotification({
      title: "🛡️ এডমিন রিমাইন্ডার",
      body: bodyText,
      type: "general",
      target: "submissions",
      id: "scheduled",
      preferenceKey: "pref_gmail"
    });
    
    console.log(`Scheduled admin reminder sent: ${bodyText}`);
    return null;
  });

/**
 * 9. Scheduled Task: User Reminder every 3 hours
 */
const userReminderMessages = [
  "জিমেইল এক্সচেঞ্জ অফার! এখনই নতুন জিমেইল সাবমিট করুন এবং ব্যালেন্স বাড়িয়ে নিন।",
  "প্রিয় মেম্বার, আপনার কাছে কি নতুন জিমেইল আছে? দ্রুত সাবমিট করে টাকা ইনকাম করুন!",
  "শিফট চলছে! আপনার পেন্ডিং জিমেইলগুলো এখনই জমা দিন।",
  "আজকের রেট আপডেট করা হয়েছে। জিমেইল সাবমিট করে দ্রুত পেমেন্ট বুঝে নিন।"
];

exports.scheduledUserReminder = functions.pubsub
  .schedule('0 */3 * * *')
  .timeZone('Asia/Dhaka')
  .onRun(async (context) => {
    const message = userReminderMessages[Math.floor(Math.random() * userReminderMessages.length)];

    try {
      const usersSnap = await db.ref("users").once("value");
      if (!usersSnap.exists()) return null;

      const users = usersSnap.val();
      const tokens = [];
      Object.keys(users).forEach(uid => {
        const u = users[uid];
        if (u.fcmToken) tokens.push(u.fcmToken);
        if (u.token) tokens.push(u.token);
      });

      if (tokens.length === 0) return null;
      const uniqueTokens = [...new Set(tokens)];

      const payload = {
        notification: {
          title: "📥 নতুন জিমেইল জমা দিন",
          body: message,
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          target: "submission_form"
        },
        android: {
          priority: "high"
        }
      };

      const batchSize = 500;
      for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const tokenBatch = uniqueTokens.slice(i, i + batchSize);
        await admin.messaging().sendEachForMulticast({
          ...payload,
          tokens: tokenBatch
        });
      }
      
      console.log(`Scheduled user reminder sent to ${uniqueTokens.length} devices.`);
    } catch (error) {
      console.error("Error sending scheduled user push:", error);
    }
    return null;
  });

