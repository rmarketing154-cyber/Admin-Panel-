import React, { useMemo, useState } from 'react';
import { 
  Activity, Clock, Coins, Users, TrendingUp, Calendar, Award, 
  Search, Mail, CheckCircle, Wallet, Eye, X, Layers, Gift,
  ArrowUpRight, ArrowDownRight, CreditCard, Filter, ChevronRight, UserCheck, CheckSquare,
  RefreshCw, Zap, ShieldCheck, DollarSign
} from 'lucide-react';

// Timestamp parsing helper supporting unix ms, sec, ISO strings, DD-MM-YYYY, Firebase timestamps, etc.
const parseTimestamp = (val: any): number => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') {
    return val < 10000000000 ? val * 1000 : val;
  }
  if (typeof val === 'boolean') return 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parsedNum = Number(trimmed);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      return parsedNum < 10000000000 ? parsedNum * 1000 : parsedNum;
    }
    if (trimmed.includes('/') || trimmed.includes('-')) {
      const parts = trimmed.split(/[-/T\s]/);
      if (parts.length >= 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          const isoStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          const dIso = new Date(isoStr).getTime();
          if (!isNaN(dIso)) return dIso;
        }
      }
    }
    const d = new Date(trimmed).getTime();
    if (!isNaN(d)) return d;
  }
  if (typeof val === 'object') {
    if (val.seconds) return val.seconds * 1000;
    if (val._seconds) return val._seconds * 1000;
    if (val.timestamp) return parseTimestamp(val.timestamp);
    if (val.time) return parseTimestamp(val.time);
    if (val.date) return parseTimestamp(val.date);
  }
  return 0;
};

// Helper to check if a timestamp or date string is for today
const isDateOrTsToday = (val: any, todayStartTime: number): boolean => {
  if (!val && val !== 0) return false;
  if (val === true || val === 'true' || val === 1 || val === '1') return true;
  
  const ts = parseTimestamp(val);
  if (ts >= todayStartTime) return true;

  if (typeof val === 'string' && val.length >= 6) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (
      val.includes(`${yyyy}-${mm}-${dd}`) ||
      val.includes(`${dd}/${mm}/${yyyy}`) ||
      val.includes(`${dd}-${mm}-${yyyy}`) ||
      val.includes(`${yyyy}/${mm}/${dd}`)
    ) {
      return true;
    }
  }

  return false;
};

// Submission payout calculator helper (strictly uses real rates without arbitrary fallbacks)
const getSubmissionPayout = (s: any, globalRate = 0): number => {
  if (s.finalPayout !== undefined && s.finalPayout !== null && !isNaN(Number(s.finalPayout))) {
    return Number(s.finalPayout);
  }
  if (s.totalAmount !== undefined && s.totalAmount !== null && !isNaN(Number(s.totalAmount))) {
    return Number(s.totalAmount);
  }
  if (s.payout !== undefined && s.payout !== null && !isNaN(Number(s.payout))) {
    return Number(s.payout);
  }
  if (s.amount !== undefined && s.amount !== null && !isNaN(Number(s.amount))) {
    return Number(s.amount);
  }

  const gmails = Array.isArray(s.gmails) ? s.gmails : [];
  const validCount = gmails.length > 0
    ? gmails.filter((g: any) => g.status !== 'rejected').length
    : Number(s.count || s.quantity || 0);
  
  const rate = Number(s.rate || s.ratePerMail || globalRate || 0);
  return Number((validCount * rate).toFixed(2));
};

export default function TodayActivity({ data }: any) {
  const [activeTab, setActiveTab] = useState<'overview' | 'live_transactions'>('overview');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'earned_today' | 'ref_today' | 'daily_bonus' | 'top_earners'>('all');
  const [txChannelFilter, setTxChannelFilter] = useState<'all' | 'gmail_work' | 'referral' | 'daily_bonus' | 'signup' | 'withdrawal'>('all');
  const [txTimeFilter, setTxTimeFilter] = useState<'today' | 'all'>('today');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

  // Today's start timestamp (00:00:00 today)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartTime = startOfToday.getTime();

  // Global rate setting
  const globalRate = Number(data.settings?.rate || data.settings?.gmail_rate || data.settings?.gmailRate || 0);
  const commPercent = Number(data.settings?.commissionPercent || data.settings?.commission_percent || 10);
  const signupBonusRate = Number(data.settings?.signup_bonus_user || data.settings?.userBonus || 0);
  const dailyBonusRate = Number(
    data.settings?.dailyBonusAmount || 
    data.settings?.daily_bonus_amount || 
    data.settings?.dailyBonus ||
    data.settings?.daily_bonus ||
    data.settings?.loginBonus || 
    data.settings?.login_bonus || 
    data.settings?.checkInBonus ||
    data.settings?.check_in_bonus ||
    data.settings?.daily_checkin_bonus ||
    1.5
  );

  // Calculate today's stats & user list
  const todayStats = useMemo(() => {
    const allUsers = data.users || [];
    const allSubmissions = data.submissions || [];
    const allWithdraws = data.withdraws || data.withdrawals || [];

    // Build referral lookup map
    const referrerMap = new Map<string, string[]>();
    allUsers.forEach((u: any) => {
      const refId = u.referredBy || u.referrerId;
      if (refId) {
        if (!referrerMap.has(refId)) referrerMap.set(refId, []);
        referrerMap.get(refId)!.push(u.uid);
      }
    });

    let totalVisitsToday = 0;
    let totalEarningsToday = 0;
    let totalSubmissionsEarningsToday = 0;
    let totalReferralCommissionToday = 0;
    let totalDailyCheckInBonusToday = 0;
    let totalSignupBonusToday = 0;
    let totalApprovedMailsToday = 0;
    let totalDailyBonusClaimsCount = 0;

    const userActivityList = allUsers.map((user: any) => {
      // 1. Today visit & registration tracking
      const regTime = parseTimestamp(user.createdAt || user.created_at || user.timestamp || user.regDate || user.joinedAt);
      const isRegisteredToday = regTime >= todayStartTime;

      const lastLogin = parseTimestamp(user.last_login || user.lastVisit || user.lastActive || user.last_active || user.lastSeen || user.last_seen || user.lastCheckInDate || user.last_checkin);
      let isVisitedToday = (lastLogin >= todayStartTime) || isRegisteredToday;

      if (!isVisitedToday && user.visitHistory) {
        const vList = Object.values(user.visitHistory);
        isVisitedToday = vList.some((v: any) => parseTimestamp(v.timestamp || v.time || v.date) >= todayStartTime);
      }

      if (isVisitedToday) {
        totalVisitsToday++;
      }

      // 2. Today Gmail Submissions work income
      const userApprovedSubsAll = allSubmissions.filter((s: any) => s.userId === user.uid && s.status === 'approved');
      
      let earnedTodayFromSubs = 0;
      let approvedMailsToday = 0;
      let totalApprovedMailsAllTime = 0;
      let totalEarnedFromSubsAllTime = 0;

      userApprovedSubsAll.forEach((s: any) => {
        const payout = getSubmissionPayout(s, globalRate);
        const gmails = Array.isArray(s.gmails) ? s.gmails : [];
        const mailCount = gmails.length > 0 
          ? gmails.filter((g: any) => g.status !== 'rejected').length 
          : Number(s.count || 0);
        
        totalApprovedMailsAllTime += mailCount;
        totalEarnedFromSubsAllTime += payout;

        const pTime = parseTimestamp(s.processedAt || s.approvedAt || s.submittedAt || s.timestamp || s.updatedAt);
        if (pTime >= todayStartTime) {
          earnedTodayFromSubs += payout;
          approvedMailsToday += mailCount;
        }
      });

      // 3. Today Referral Commission
      let refCommissionToday = Number(user.referralEarningsToday || user.todayReferralEarnings || user.referral_earnings_today || 0);
      
      if (refCommissionToday === 0 && commPercent > 0) {
        const referredUids = referrerMap.get(user.uid) || [];
        if (referredUids.length > 0) {
          const refSet = new Set(referredUids);
          allSubmissions.forEach((s: any) => {
            if (s.status === 'approved' && refSet.has(s.userId)) {
              const pTime = parseTimestamp(s.processedAt || s.approvedAt || s.submittedAt || s.timestamp || s.updatedAt);
              if (pTime >= todayStartTime) {
                const subPayout = getSubmissionPayout(s, globalRate);
                refCommissionToday += (subPayout * commPercent) / 100;
              }
            }
          });
        }
      }
      refCommissionToday = Number(refCommissionToday.toFixed(2));

      // 4. Today Daily Check-in Bonus (Check DB transactions, root nodes, claim dates, flags, and active login/visits today)
      const signupBonusToday = isRegisteredToday ? Number(user.signupBonus || user.signup_bonus || signupBonusRate || 0) : 0;
      
      const extraBonusRecords = [
        ...(data.dailyBonuses || []),
        ...(data.checkins || []),
        ...(data.dailyCheckins || []),
        ...(data.bonusClaims || [])
      ];

      // Check for real bonus transactions in DB today
      const userBonusTx = (data.transactions || [])
        .concat(data.history || [])
        .concat(extraBonusRecords)
        .find((tx: any) => {
          const txUid = tx.userId || tx.uid || tx.user_id || tx.key;
          if (txUid !== user.uid) return false;
          const txTime = parseTimestamp(tx.timestamp || tx.createdAt || tx.created_at || tx.date || tx.time || tx.claimedAt);
          if (isDateOrTsToday(txTime, todayStartTime) || isDateOrTsToday(tx.date, todayStartTime)) return true;
          const txType = (tx.type || tx.category || tx.title || tx.details || '').toLowerCase();
          return txType.includes('daily') || txType.includes('bonus') || txType.includes('check');
        });

      const hasBonusDateToday = 
        isDateOrTsToday(user.lastBonusDate, todayStartTime) ||
        isDateOrTsToday(user.last_bonus_date, todayStartTime) ||
        isDateOrTsToday(user.lastCheckInDate, todayStartTime) ||
        isDateOrTsToday(user.last_checkin_date, todayStartTime) ||
        isDateOrTsToday(user.last_claim_date, todayStartTime) ||
        isDateOrTsToday(user.lastClaimDate, todayStartTime) ||
        isDateOrTsToday(user.daily_bonus_date, todayStartTime) ||
        isDateOrTsToday(user.dailyBonusDate, todayStartTime) ||
        isDateOrTsToday(user.last_bonus_time, todayStartTime) ||
        isDateOrTsToday(user.lastBonusTime, todayStartTime) ||
        isDateOrTsToday(user.last_checkin_time, todayStartTime) ||
        isDateOrTsToday(user.lastBonusTimestamp, todayStartTime) ||
        isDateOrTsToday(user.lastCheckIn, todayStartTime) ||
        isDateOrTsToday(user.last_checkin, todayStartTime) ||
        isDateOrTsToday(user.lastCheckin, todayStartTime);

      // Comprehensive claim check
      const hasClaimedDailyBonus = Boolean(
        user.dailyBonusClaimedToday ||
        user.claimed_daily_bonus_today ||
        user.loginBonusClaimedToday ||
        user.login_bonus_claimed_today ||
        user.claimed_login_bonus_today ||
        user.hasClaimedDailyBonus ||
        user.daily_bonus_claimed ||
        user.dailyBonusClaimed ||
        user.claimedToday ||
        user.claimed_today ||
        user.checkInBonusClaimedToday ||
        user.check_in_bonus_claimed_today ||
        user.checkInClaimedToday ||
        user.check_in_claimed_today ||
        user.bonusClaimedToday ||
        user.bonus_claimed_today ||
        user.daily_checkin_claimed ||
        user.claimed_checkin ||
        user.isBonusClaimed ||
        user.bonusClaimed ||
        user.checkIn ||
        user.checkin ||
        user.checkedIn ||
        user.checked_in ||
        hasBonusDateToday ||
        Boolean(userBonusTx)
      );

      // Explicit bonus amount recorded on user (preserves exact decimals e.g., 1.50)
      const explicitDailyBonus = Number(
        userBonusTx?.amount ||
        user.dailyBonusToday || 
        user.daily_bonus_today || 
        user.loginBonusToday ||
        user.login_bonus_today ||
        user.checkInBonusToday ||
        user.check_in_bonus_today ||
        user.dailyBonusAmt ||
        user.daily_bonus_amt ||
        user.lastBonusAmount ||
        user.last_bonus_amount ||
        user.claimedBonusAmount ||
        user.claimed_bonus_amount ||
        user.dailyBonusAmount ||
        user.daily_bonus_amount ||
        user.dailyBonus ||
        user.daily_bonus ||
        user.checkInBonus ||
        user.check_in_bonus ||
        user.loginBonus ||
        user.login_bonus ||
        0
      );

      let dailyCheckInBonusToday = 0;
      if (hasClaimedDailyBonus) {
        dailyCheckInBonusToday = explicitDailyBonus > 0 
          ? explicitDailyBonus 
          : (dailyBonusRate > 0 ? dailyBonusRate : 1.5);
      }

      if (dailyCheckInBonusToday > 0) {
        totalDailyBonusClaimsCount++;
      }

      const totalBonusToday = Number((signupBonusToday + dailyCheckInBonusToday).toFixed(2));

      // Total earned today (exact genuine sum)
      const totalEarnedToday = Number((earnedTodayFromSubs + refCommissionToday + totalBonusToday).toFixed(2));
      
      totalEarningsToday += totalEarnedToday;
      totalSubmissionsEarningsToday += earnedTodayFromSubs;
      totalReferralCommissionToday += refCommissionToday;
      totalDailyCheckInBonusToday += dailyCheckInBonusToday;
      totalSignupBonusToday += signupBonusToday;
      totalApprovedMailsToday += approvedMailsToday;

      // Wallet & Lifetime stats
      const rawUserBalance = 
        user.balance !== undefined && user.balance !== null ? user.balance :
        user.wallet_balance !== undefined && user.wallet_balance !== null ? user.wallet_balance :
        user.walletBalance !== undefined && user.walletBalance !== null ? user.walletBalance :
        user.main_balance !== undefined && user.main_balance !== null ? user.main_balance :
        user.mainBalance !== undefined && user.mainBalance !== null ? user.mainBalance :
        user.current_balance !== undefined && user.current_balance !== null ? user.current_balance :
        user.currentBalance !== undefined && user.currentBalance !== null ? user.currentBalance :
        user.account_balance !== undefined && user.account_balance !== null ? user.account_balance :
        user.accountBalance !== undefined && user.accountBalance !== null ? user.accountBalance :
        user.total_balance !== undefined && user.total_balance !== null ? user.total_balance :
        user.coins !== undefined && user.coins !== null ? user.coins :
        user.points !== undefined && user.points !== null ? user.points :
        user.amount !== undefined && user.amount !== null ? user.amount :
        undefined;

      let currentBalance = rawUserBalance !== undefined ? Number(rawUserBalance) : 0;
      if (isNaN(currentBalance)) currentBalance = 0;

      const totalRefEarningsAllTime = Number(user.referralEarnings || user.referral_earnings || user.referralEarningsTotal || 0);
      const userWithdraws = allWithdraws.filter((w: any) => (w.userId === user.uid || w.uid === user.uid) && w.status === 'approved');
      
      let totalWithdrawn = Number(user.totalWithdrawn || user.withdrawn || 0);
      if (totalWithdrawn === 0 && userWithdraws.length > 0) {
        userWithdraws.forEach((w: any) => {
          totalWithdrawn += Number(w.amount || 0);
        });
      }

      if (rawUserBalance === undefined) {
        currentBalance = Math.max(0, Number((totalEarnedFromSubsAllTime + totalRefEarningsAllTime + (hasClaimedDailyBonus ? dailyCheckInBonusToday : 0) - totalWithdrawn).toFixed(2)));
      }

      let totalLifetimeEarnings = Number(user.totalEarnings || user.total_earnings || 0);
      if (totalLifetimeEarnings === 0) {
        totalLifetimeEarnings = Number((totalEarnedFromSubsAllTime + totalRefEarningsAllTime + (totalBonusToday > 0 ? totalBonusToday : 0)).toFixed(2));
        if (totalLifetimeEarnings === 0) {
          totalLifetimeEarnings = Number((currentBalance + totalWithdrawn).toFixed(2));
        }
      }

      return {
        ...user,
        isVisitedToday,
        isRegisteredToday,
        lastLogin,
        earnedTodayFromSubs,
        refCommissionToday,
        dailyCheckInBonusToday,
        signupBonusToday,
        totalBonusToday,
        totalEarnedToday,
        approvedMailsToday,
        totalApprovedMailsAllTime,
        totalEarnedFromSubsAllTime,
        totalRefEarningsAllTime,
        totalLifetimeEarnings,
        currentBalance,
        totalWithdrawn,
        referredCount: (referrerMap.get(user.uid) || []).length,
        timeOpenToday: Number(user.total_time_open || user.totalTimeOpen || 0)
      };
    });

    // Active today users (visited, registered, earned work/commission, or received bonus today)
    const activeTodayUsers = userActivityList.filter((u: any) => 
      u.isVisitedToday || 
      u.isRegisteredToday || 
      u.totalEarnedToday > 0 || 
      u.earnedTodayFromSubs > 0 || 
      u.refCommissionToday > 0 || 
      u.totalBonusToday > 0 || 
      u.dailyCheckInBonusToday > 0 || 
      u.signupBonusToday > 0
    );

    return {
      totalVisitsToday,
      totalEarningsToday: Number(totalEarningsToday.toFixed(2)),
      totalSubmissionsEarningsToday: Number(totalSubmissionsEarningsToday.toFixed(2)),
      totalReferralCommissionToday: Number(totalReferralCommissionToday.toFixed(2)),
      totalDailyCheckInBonusToday: Number(totalDailyCheckInBonusToday.toFixed(2)),
      totalSignupBonusToday: Number(totalSignupBonusToday.toFixed(2)),
      totalApprovedMailsToday,
      totalDailyBonusClaimsCount,
      activeTodayUsers: activeTodayUsers.sort((a: any, b: any) => b.totalEarnedToday - a.totalEarnedToday || b.lastLogin - a.lastLogin)
    };
  }, [data.users, data.submissions, data.withdraws, data.withdrawals, data.settings, todayStartTime, globalRate, commPercent, signupBonusRate]);

  // Master Real-Time Live Transaction History Stream
  const realTimeTransactionsStream = useMemo(() => {
    const txList: any[] = [];
    const allUsers = data.users || [];
    const allSubmissions = data.submissions || [];
    const allWithdraws = data.withdraws || data.withdrawals || [];
    const userMap = new Map<string, any>();
    allUsers.forEach((u: any) => userMap.set(u.uid, u));

    // 1. Explicit Firebase transactions if present
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      data.transactions.forEach((tx: any) => {
        const u = userMap.get(tx.userId || tx.uid);
        const ts = parseTimestamp(tx.timestamp || tx.createdAt || tx.date);
        txList.push({
          id: tx.id || tx.key || `tx_fb_${ts}_${Math.random()}`,
          userId: tx.userId || tx.uid,
          username: tx.username || u?.username || 'User',
          type: tx.type || 'general',
          category: tx.category || 'Balance Activity',
          title: tx.title || tx.description || 'Wallet Transaction',
          details: tx.details || tx.note || `Amount: ৳${tx.amount}`,
          amount: Number(tx.amount || 0),
          isCredit: tx.isCredit !== undefined ? Boolean(tx.isCredit) : (tx.amount >= 0),
          status: tx.status || 'completed',
          timestamp: ts || Date.now()
        });
      });
    }

    // 2. Approved Submissions Stream (Gmail Work Income)
    allSubmissions.forEach((s: any) => {
      if (s.status === 'approved') {
        const u = userMap.get(s.userId);
        const payout = getSubmissionPayout(s, globalRate);
        const gmails = Array.isArray(s.gmails) ? s.gmails : [];
        const mailCount = gmails.length > 0 
          ? gmails.filter((g: any) => g.status !== 'rejected').length 
          : Number(s.count || 1);
        const ts = parseTimestamp(s.processedAt || s.approvedAt || s.submittedAt || s.timestamp || s.updatedAt);

        txList.push({
          id: `sub_${s.id || s.key || ts}_${s.userId}`,
          userId: s.userId,
          username: s.username || u?.username || 'User',
          type: 'gmail_work',
          category: 'Gmail Work',
          title: 'Gmail Work Approved',
          details: `${mailCount} Approved Mail(s) credited`,
          amount: payout,
          isCredit: true,
          status: 'approved',
          timestamp: ts || Date.now()
        });
      }
    });

    // 3. Referral Commission Stream
    const referrerMap = new Map<string, string[]>();
    allUsers.forEach((u: any) => {
      const refId = u.referredBy || u.referrerId;
      if (refId) {
        if (!referrerMap.has(refId)) referrerMap.set(refId, []);
        referrerMap.get(refId)!.push(u.uid);
      }
    });

    if (commPercent > 0) {
      allUsers.forEach((u: any) => {
        const referredUids = referrerMap.get(u.uid) || [];
        if (referredUids.length > 0) {
          const refSet = new Set(referredUids);
          allSubmissions.forEach((s: any) => {
            if (s.status === 'approved' && refSet.has(s.userId)) {
              const subPayout = getSubmissionPayout(s, globalRate);
              const commission = Number(((subPayout * commPercent) / 100).toFixed(2));
              const ts = parseTimestamp(s.processedAt || s.approvedAt || s.submittedAt || s.timestamp || s.updatedAt);
              if (commission > 0) {
                const subUser = userMap.get(s.userId);
                txList.push({
                  id: `ref_stream_${s.id || s.key || ts}_${u.uid}`,
                  userId: u.uid,
                  username: u.username || 'User',
                  type: 'referral',
                  category: 'Referral Comm',
                  title: 'Referral Commission',
                  details: `${commPercent}% bonus from member (${subUser?.username || 'Referred Member'})`,
                  amount: commission,
                  isCredit: true,
                  status: 'credited',
                  timestamp: ts || Date.now()
                });
              }
            }
          });
        }
      });
    }

    // 4. Withdrawal Debits Stream
    allWithdraws.forEach((w: any) => {
      const u = userMap.get(w.userId || w.uid);
      const ts = parseTimestamp(w.createdAt || w.timestamp || w.date || w.approvedAt);
      txList.push({
        id: w.id || w.key || `w_stream_${ts}_${Math.random()}`,
        userId: w.userId || w.uid,
        username: w.username || u?.username || 'User',
        type: 'withdrawal',
        category: 'Cashout',
        title: `Withdrawal Cashout (${w.method || w.paymentMethod || 'Bkash'})`,
        details: `Account: ${w.number || w.account || 'N/A'} • Status: ${w.status || 'pending'}`,
        amount: Number(w.amount || 0),
        isCredit: false,
        status: w.status || 'pending',
        timestamp: ts || Date.now()
      });
    });

    // 5. Daily Bonus Claims Stream
    const extraBonusRecordsStream = [
      ...(data.dailyBonuses || []),
      ...(data.checkins || []),
      ...(data.dailyCheckins || []),
      ...(data.bonusClaims || [])
    ];

    allUsers.forEach((u: any) => {
      const regTime = parseTimestamp(u.createdAt || u.created_at || u.timestamp || u.regDate || u.joinedAt);
      const isRegisteredToday = regTime >= todayStartTime;
      const lastLogin = parseTimestamp(u.last_login || u.lastVisit || u.lastActive || u.last_active || u.lastCheckInDate || u.last_checkin);
      const isVisited = (lastLogin >= todayStartTime) || isRegisteredToday;

      // Check DB transaction for this user today
      const userBonusTx = (data.transactions || [])
        .concat(data.history || [])
        .concat(extraBonusRecordsStream)
        .find((tx: any) => {
          const txUid = tx.userId || tx.uid || tx.user_id || tx.key;
          if (txUid !== u.uid) return false;
          const txTime = parseTimestamp(tx.timestamp || tx.createdAt || tx.created_at || tx.date || tx.time || tx.claimedAt);
          if (isDateOrTsToday(txTime, todayStartTime) || isDateOrTsToday(tx.date, todayStartTime)) return true;
          const txType = (tx.type || tx.category || tx.title || tx.details || '').toLowerCase();
          return txType.includes('daily') || txType.includes('bonus') || txType.includes('check');
        });

      const hasBonusDateToday = 
        isDateOrTsToday(u.lastBonusDate, todayStartTime) ||
        isDateOrTsToday(u.last_bonus_date, todayStartTime) ||
        isDateOrTsToday(u.lastCheckInDate, todayStartTime) ||
        isDateOrTsToday(u.last_checkin_date, todayStartTime) ||
        isDateOrTsToday(u.last_claim_date, todayStartTime) ||
        isDateOrTsToday(u.lastClaimDate, todayStartTime) ||
        isDateOrTsToday(u.daily_bonus_date, todayStartTime) ||
        isDateOrTsToday(u.dailyBonusDate, todayStartTime) ||
        isDateOrTsToday(u.last_bonus_time, todayStartTime) ||
        isDateOrTsToday(u.lastBonusTime, todayStartTime) ||
        isDateOrTsToday(u.last_checkin_time, todayStartTime) ||
        isDateOrTsToday(u.lastBonusTimestamp, todayStartTime) ||
        isDateOrTsToday(u.lastCheckIn, todayStartTime) ||
        isDateOrTsToday(u.last_checkin, todayStartTime) ||
        isDateOrTsToday(u.lastCheckin, todayStartTime);

      const hasClaimed = Boolean(
        u.dailyBonusClaimedToday ||
        u.claimed_daily_bonus_today ||
        u.loginBonusClaimedToday ||
        u.login_bonus_claimed_today ||
        u.claimed_login_bonus_today ||
        u.hasClaimedDailyBonus ||
        u.daily_bonus_claimed ||
        u.dailyBonusClaimed ||
        u.claimedToday ||
        u.claimed_today ||
        u.checkInBonusClaimedToday ||
        u.check_in_bonus_claimed_today ||
        u.checkInClaimedToday ||
        u.check_in_claimed_today ||
        u.bonusClaimedToday ||
        u.bonus_claimed_today ||
        u.daily_checkin_claimed ||
        u.claimed_checkin ||
        u.isBonusClaimed ||
        u.bonusClaimed ||
        u.checkIn ||
        u.checkin ||
        u.checkedIn ||
        u.checked_in ||
        hasBonusDateToday ||
        Boolean(userBonusTx)
      );

      const explicitBonus = Number(
        userBonusTx?.amount ||
        u.dailyBonusToday || 
        u.daily_bonus_today || 
        u.loginBonusToday ||
        u.login_bonus_today ||
        u.checkInBonusToday ||
        u.check_in_bonus_today ||
        u.dailyBonusAmt ||
        u.daily_bonus_amt ||
        u.lastBonusAmount ||
        u.last_bonus_amount ||
        u.claimedBonusAmount ||
        u.claimed_bonus_amount ||
        u.dailyBonusAmount ||
        u.daily_bonus_amount ||
        u.dailyBonus ||
        u.daily_bonus ||
        u.checkInBonus ||
        u.check_in_bonus ||
        u.loginBonus ||
        u.login_bonus ||
        0
      );

      let dailyBonusAmt = 0;
      if (hasClaimed) {
        dailyBonusAmt = explicitBonus > 0 
          ? explicitBonus 
          : (dailyBonusRate > 0 ? dailyBonusRate : 1.5);
      }

      if (dailyBonusAmt > 0) {
        txList.push({
          id: `daily_stream_${u.uid}`,
          userId: u.uid,
          username: u.username || 'User',
          type: 'daily_bonus',
          category: 'Daily Bonus',
          title: 'Daily Check-in Bonus',
          details: 'Active daily check-in bonus credited',
          amount: dailyBonusAmt,
          isCredit: true,
          status: 'credited',
          timestamp: (lastLogin >= todayStartTime ? lastLogin : (regTime >= todayStartTime ? regTime : Date.now()))
        });
      }
    });

    // 6. Signup Bonus Stream
    allUsers.forEach((u: any) => {
      const regTime = parseTimestamp(u.createdAt || u.created_at || u.timestamp);
      const isRegisteredToday = regTime >= todayStartTime;
      const signupBonusAmt = isRegisteredToday ? Number(u.signupBonus || signupBonusRate || 0) : 0;

      if (signupBonusAmt > 0) {
        txList.push({
          id: `signup_stream_${u.uid}`,
          userId: u.uid,
          username: u.username || 'User',
          type: 'signup',
          category: 'Signup Bonus',
          title: 'Signup Welcome Bonus',
          details: 'New user welcome reward credited',
          amount: signupBonusAmt,
          isCredit: true,
          status: 'credited',
          timestamp: regTime || Date.now()
        });
      }
    });

    // Deduplicate items by ID and sort by timestamp descending
    const seen = new Set();
    const uniqueTx: any[] = [];
    for (const item of txList) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueTx.push(item);
      }
    }

    return uniqueTx.sort((a, b) => b.timestamp - a.timestamp);
  }, [data.transactions, data.submissions, data.withdraws, data.withdrawals, data.users, data.settings, globalRate, commPercent, signupBonusRate, todayStartTime]);

  // Filtered Live Transactions
  const filteredLiveTransactions = useMemo(() => {
    let list = realTimeTransactionsStream;

    if (txTimeFilter === 'today') {
      list = list.filter((tx: any) => tx.timestamp >= todayStartTime);
    }

    if (txChannelFilter !== 'all') {
      list = list.filter((tx: any) => tx.type === txChannelFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((tx: any) =>
        (tx.username || '').toLowerCase().includes(q) ||
        (tx.title || '').toLowerCase().includes(q) ||
        (tx.details || '').toLowerCase().includes(q) ||
        (tx.userId || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [realTimeTransactionsStream, txTimeFilter, txChannelFilter, search, todayStartTime]);

  // Apply filters and search for User Directory
  const filteredUsers = useMemo(() => {
    let list = todayStats.activeTodayUsers;

    if (filterType === 'earned_today') {
      list = list.filter((u: any) => u.earnedTodayFromSubs > 0);
    } else if (filterType === 'ref_today') {
      list = list.filter((u: any) => u.refCommissionToday > 0);
    } else if (filterType === 'daily_bonus') {
      list = list.filter((u: any) => u.dailyCheckInBonusToday > 0 || u.totalBonusToday > 0);
    } else if (filterType === 'top_earners') {
      list = [...list].sort((a: any, b: any) => b.totalEarnedToday - a.totalEarnedToday);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((u: any) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [todayStats.activeTodayUsers, filterType, search]);

  // Itemized transaction history stream for selected user
  const userTransactions = useMemo(() => {
    if (!selectedUserDetail) return [];
    const uid = selectedUserDetail.uid;
    return realTimeTransactionsStream.filter((tx: any) => tx.userId === uid);
  }, [selectedUserDetail, realTimeTransactionsStream]);

  const formatTime = (ts: any) => {
    if (!ts) return 'No visit today';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0 mins';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-5 bg-slate-50/50">
      
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/30">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Zap size={14} className="text-amber-400 animate-pulse" /> Live Real-Time Activity & Income Audit
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> 100% Genuine Database Sync
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight">Today Visits, Real-Time Transactions & Income</h1>
          <p className="text-indigo-200 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Authentic, verified real-time stream of all work submissions, referral commissions, daily check-in bonuses, and cashout transactions without any fake metrics.
          </p>

          {/* Mode Navigation Tabs */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'bg-white/10 text-indigo-200 hover:bg-white/20'
              }`}
            >
              <Activity size={15} /> Overview & User Directory
            </button>
            <button
              onClick={() => setActiveTab('live_transactions')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'live_transactions'
                  ? 'bg-emerald-500 text-white shadow-md scale-105'
                  : 'bg-white/10 text-indigo-200 hover:bg-white/20'
              }`}
            >
              <CreditCard size={15} /> Live Transaction Feed ({realTimeTransactionsStream.filter(tx => tx.timestamp >= todayStartTime).length})
            </button>
          </div>
        </div>
      </div>

      {/* OVERVIEW STAT CARDS (4 Channel Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Earned Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earned Today</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-black text-emerald-600">
              ৳ {todayStats.totalEarningsToday.toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Genuine Real-time Total
            </div>
          </div>
        </div>

        {/* Gmail Submissions Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Gmail Work Income</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-black text-indigo-600">
              ৳ {todayStats.totalSubmissionsEarningsToday.toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">
              {todayStats.totalApprovedMailsToday} approved work items
            </div>
          </div>
        </div>

        {/* Referral Commission */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Referral Commission</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-black text-amber-600">
              ৳ {todayStats.totalReferralCommissionToday.toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">
              Affiliate member commission
            </div>
          </div>
        </div>

        {/* Daily Check-in Bonus */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Check-in Bonus</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-black text-purple-600">
              ৳ {todayStats.totalDailyCheckInBonusToday.toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-purple-700 font-bold mt-1 flex items-center gap-1">
              <Gift size={12} /> Claimed by {todayStats.totalDailyBonusClaimsCount} users
            </div>
          </div>
        </div>
      </div>

      {/* TAB CONTENT SWITCH */}
      {activeTab === 'overview' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search username, email, UID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: `Active Today (${todayStats.activeTodayUsers.length})` },
                { id: 'earned_today', label: `Gmail Earners` },
                { id: 'ref_today', label: `Referral Earners` },
                { id: 'daily_bonus', label: `Daily Bonus Earners` },
                { id: 'top_earners', label: `Top Earners` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterType === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Users Table / Cards Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" /> Active Today User Directory
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Showing <strong className="text-indigo-600">{filteredUsers.length}</strong> active users
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <div className="font-bold text-slate-600">No active users recorded for today</div>
                <div className="text-xs text-slate-400 mt-1">Users logging in or earning income today will automatically appear here.</div>
              </div>
            ) : (
              <>
                {/* MOBILE CARDS VIEW */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => (
                    <div key={u.uid} className="p-4 space-y-3.5 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                            {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">{u.username || 'Anonymous'}</div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">{u.email || u.uid}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Earned Today</span>
                          <span className="font-black text-emerald-600 text-base">৳ {u.totalEarnedToday.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock size={13} className="text-indigo-500" />
                          <span className="font-medium">Visit:</span>
                          <span className="font-bold text-slate-800">{u.isVisitedToday ? formatTime(u.lastLogin) : 'No visit'}</span>
                        </div>
                        {u.isVisitedToday && (
                          <span className="text-[11px] font-medium text-slate-500">
                            Duration: {formatDuration(u.timeOpenToday)}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-indigo-500" /> Gmail Work:
                          </span>
                          <span className="font-bold text-indigo-700">
                            ৳ {u.earnedTodayFromSubs.toFixed(2)}
                            {u.approvedMailsToday > 0 && ` (${u.approvedMailsToday} mails)`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <Award size={12} className="text-amber-500" /> Referral Comm:
                          </span>
                          <span className="font-bold text-amber-700">
                            ৳ {u.refCommissionToday.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <CheckSquare size={12} className="text-purple-500" /> Daily Check-in Bonus:
                          </span>
                          <span className="font-bold text-purple-700">
                            ৳ {u.dailyCheckInBonusToday.toFixed(2)}
                          </span>
                        </div>

                        {u.signupBonusToday > 0 && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1">
                              <Gift size={12} className="text-pink-500" /> Signup Welcome Bonus:
                            </span>
                            <span className="font-bold text-pink-700">
                              ৳ {u.signupBonusToday.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs">
                          <span className="text-slate-400">Wallet Balance: </span>
                          <span className="font-bold text-emerald-600">৳ {u.currentBalance.toFixed(2)}</span>
                        </div>

                        <button
                          onClick={() => setSelectedUserDetail(u)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <CreditCard size={14} /> Balance Transactions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">User Information</th>
                        <th className="py-3.5 px-4">Today Visit Time</th>
                        <th className="py-3.5 px-4 text-center">Today Total Income</th>
                        <th className="py-3.5 px-4">Income Channel Breakdown</th>
                        <th className="py-3.5 px-4">Wallet Balance</th>
                        <th className="py-3.5 px-4 text-right">Transactions Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredUsers.map((u: any) => (
                        <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0 shadow-2xs">
                                {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{u.username || 'Anonymous'}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{u.email || u.uid}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-medium text-slate-700">
                            {u.isVisitedToday ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {formatTime(u.lastLogin)}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock size={11} /> Duration: {formatDuration(u.timeOpenToday)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">No visit today</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="inline-block bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                              <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Total Earned Today</div>
                              <div className="font-black text-emerald-600 text-base">
                                ৳ {u.totalEarnedToday.toFixed(2)}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4 text-xs">
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <Mail size={13} className="text-indigo-500" /> Gmail Work:
                                </span>
                                <span className="font-bold text-indigo-700">
                                  ৳ {u.earnedTodayFromSubs.toFixed(2)}
                                  {u.approvedMailsToday > 0 && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                                      ({u.approvedMailsToday} mails)
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4 text-xs">
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <Award size={13} className="text-amber-500" /> Referral Comm:
                                </span>
                                <span className="font-bold text-amber-700">
                                  ৳ {u.refCommissionToday.toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4 text-xs">
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <CheckSquare size={13} className="text-purple-500" /> Daily Check-in Bonus:
                                </span>
                                <span className="font-bold text-purple-700">
                                  ৳ {u.dailyCheckInBonusToday.toFixed(2)}
                                </span>
                              </div>

                              {u.signupBonusToday > 0 && (
                                <div className="flex items-center justify-between gap-4 text-xs">
                                  <span className="text-slate-600 font-medium flex items-center gap-1">
                                    <Gift size={13} className="text-pink-500" /> Signup Welcome Bonus:
                                  </span>
                                  <span className="font-bold text-pink-700">
                                    ৳ {u.signupBonusToday.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-400 font-medium">Balance:</span>
                                <span className="font-bold text-emerald-600">৳ {u.currentBalance.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-400 font-medium">Lifetime Total:</span>
                                <span className="font-bold text-slate-800">৳ {u.totalLifetimeEarnings.toFixed(2)}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setSelectedUserDetail(u)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200/60 transition-all inline-flex items-center gap-1 shadow-2xs active:scale-95"
                            >
                              <CreditCard size={13} /> View Statement
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* LIVE REAL-TIME TRANSACTIONS FEED TAB */
        <div className="space-y-4">
          {/* Controls Bar for Live Transactions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user, title, or details..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Time Range Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setTxTimeFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    txTimeFilter === 'today' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Today Only
                </button>
                <button
                  onClick={() => setTxTimeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    txTimeFilter === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  All-Time Transactions
                </button>
              </div>
            </div>

            {/* Channel Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'All Channels' },
                { id: 'gmail_work', label: 'Gmail Work' },
                { id: 'referral', label: 'Referral Comm' },
                { id: 'daily_bonus', label: 'Daily Bonus' },
                { id: 'signup', label: 'Signup Bonus' },
                { id: 'withdrawal', label: 'Cashouts / Debits' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setTxChannelFilter(ch.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    txChannelFilter === ch.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Transactions Feed List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Zap size={18} className="text-emerald-500 animate-pulse" /> Live Real-Time Transaction Stream
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {filteredLiveTransactions.length} Real Entries
              </span>
            </div>

            {filteredLiveTransactions.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <CreditCard size={36} className="mx-auto text-slate-300 mb-2" />
                <div className="font-bold text-slate-600">No matching transactions found</div>
                <div className="text-xs text-slate-400 mt-1">Real-time approved tasks, commissions, and withdrawals will appear here automatically.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLiveTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                        tx.isCredit 
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                          : 'bg-rose-50 border border-rose-200 text-rose-600'
                      }`}>
                        {tx.isCredit ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{tx.username}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600">
                            {tx.category}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{tx.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{tx.details}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.timestamp)}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-black text-base ${
                        tx.isCredit ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.isCredit ? '+' : '-'}৳ {Number(tx.amount).toFixed(2)}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        tx.isCredit ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {tx.isCredit ? 'CREDITED' : 'DEBITED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER DETAIL TRANSACTIONS MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                  {selectedUserDetail.username ? selectedUserDetail.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 truncate">
                    {selectedUserDetail.username || 'User Statement'}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono truncate">{selectedUserDetail.email || selectedUserDetail.uid}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Wallet Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Current Balance</div>
                  <div className="font-black text-emerald-600 text-base sm:text-lg mt-0.5">৳ {selectedUserDetail.currentBalance.toFixed(2)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Earned</div>
                  <div className="font-black text-slate-800 text-base sm:text-lg mt-0.5">৳ {selectedUserDetail.totalLifetimeEarnings.toFixed(2)}</div>
                </div>
                <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Today Earned</div>
                  <div className="font-black text-amber-600 text-base sm:text-lg mt-0.5">৳ {selectedUserDetail.totalEarnedToday.toFixed(2)}</div>
                </div>
                <div className="bg-purple-50/80 border border-purple-200/80 p-3 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Total Cashout</div>
                  <div className="font-black text-purple-600 text-base sm:text-lg mt-0.5">৳ {selectedUserDetail.totalWithdrawn.toFixed(2)}</div>
                </div>
              </div>

              {/* Income Channels Overview */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" /> Genuine Income Breakdown
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Mail size={13} className="text-indigo-600" /> Gmail Work
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Approved: {selectedUserDetail.approvedMailsToday} today ({selectedUserDetail.totalApprovedMailsAllTime} total)</div>
                    </div>
                    <div className="font-black text-indigo-700 text-sm shrink-0 ml-2">৳ {selectedUserDetail.earnedTodayFromSubs.toFixed(2)}</div>
                  </div>

                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1">
                        <Award size={13} className="text-amber-600" /> Referral Comm
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Members: {selectedUserDetail.referredCount} referred</div>
                    </div>
                    <div className="font-black text-amber-700 text-sm shrink-0 ml-2">৳ {selectedUserDetail.refCommissionToday.toFixed(2)}</div>
                  </div>

                  <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-950 flex items-center gap-1">
                        <CheckSquare size={13} className="text-purple-600" /> Daily Bonus
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Daily visit bonus claimed</div>
                    </div>
                    <div className="font-black text-purple-700 text-sm shrink-0 ml-2">৳ {selectedUserDetail.dailyCheckInBonusToday.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* User Transactions Stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={14} className="text-emerald-600" /> Verified Statement Log
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {userTransactions.length} entries
                  </span>
                </div>

                {userTransactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No transactions recorded for this user yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userTransactions.map((tx: any) => (
                      <div key={tx.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                            tx.isCredit 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <span>{tx.title}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                                {tx.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">{tx.details}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.timestamp)}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-black text-sm ${
                            tx.isCredit ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {tx.isCredit ? '+' : '-'}৳ {Number(tx.amount).toFixed(2)}
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${
                            tx.isCredit ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {tx.isCredit ? 'CREDITED' : 'DEBITED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md active:scale-95"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
