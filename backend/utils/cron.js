
const { ZAMBIAN_TERMS } = require("./zambia-calendar");

module.exports = (io) => {

  // Every hour: expire payments
  require("node-cron").schedule("0 * * * *", async () => {
    try {
      const Payment = require("../models/Payment");
      const now = new Date();
      const expired = await Payment.updateMany(
        { status:"approved", isExpired:false, expiresAt:{ $lt:now } },
        { isExpired:true }
      );
      if (expired.modifiedCount > 0) {
        const affected = await Payment.find({
          status:"approved", isExpired:true,
          expiresAt:{ $lt:now, $gt:new Date(now-2*60*60*1000) }
        }).populate("child","name");
        for (const p of affected) {
          io.to(`user:${p.parent}`).emit("payment_expired", {
            childId: p.child?._id, childName: p.child?.name,
            paymentType: p.paymentType,
            message: `⚠️ Your ${p.paymentType.replace(/_/g," ")} for ${p.child?.name} has expired.`,
          });
          try {
            const { sendPushToUser } = require("../routes/push");
            await sendPushToUser(p.parent.toString(), {
              title:"Payment Expired ⚠️",
              body:`School fees for ${p.child?.name} expired. Please renew.`,
              url:"/parent/payments",
            });
          } catch {}
        }
        console.log(`✅ Expired ${expired.modifiedCount} payments`);
      }
    } catch(e){ console.error("Cron expire:",e.message); }
  });

  // Every 3 days at 8 AM: payment reminders (7-day window)
  require("node-cron").schedule("0 8 */3 * *", async () => {
    try {
      const Payment = require("../models/Payment");
      const now = new Date();
      const in7 = new Date(now.getTime() + 7*24*60*60*1000);
      const expiring = await Payment.find({
        status:"approved", isExpired:false,
        expiresAt:{ $gte:now, $lte:in7 },
      }).populate("child","name grade");
      for (const p of expiring) {
        const days = Math.ceil((new Date(p.expiresAt)-now)/(1000*60*60*24));
        const urgent = days <= 3;
        io.to(`user:${p.parent}`).emit("payment_reminder",{
          paymentId:p._id, childName:p.child?.name, daysLeft:days,
          message:`${urgent?'🚨':'⚠️'} ${p.child?.name}'s fees expire in ${days} day${days===1?'':'s'}!`,
        });
        try {
          const { sendPushToUser } = require("../routes/push");
          await sendPushToUser(p.parent.toString(),{
            title: urgent?`🚨 Fees expire in ${days} days!`:`⚠️ Fees expiring soon`,
            body:`${p.child?.name}'s school fees expire in ${days} day${days===1?'':'s'}. Renew now!`,
            url:"/parent/payments",
          });
        } catch {}
      }
      // 3-day reminder for partial payments
      const partial = await Payment.find({
        isPartial:true, status:"pending",
        lastReminderSent:{ $lt:new Date(now-3*24*60*60*1000) }
      }).populate("child","name");
      for (const p of partial) {
        const bal = p.remainingBalance || 0;
        if (bal <= 0) continue;
        io.to(`user:${p.parent}`).emit("balance_reminder",{
          paymentId:p._id, childName:p.child?.name, balance:bal,
          message:`💳 Remaining balance: ZMW ${bal.toFixed(2)} for ${p.child?.name}. Pay now to activate.`,
        });
        try {
          const { sendPushToUser } = require("../routes/push");
          await sendPushToUser(p.parent.toString(),{
            title:"💳 Balance Reminder",
            body:`ZMW ${bal.toFixed(2)} remaining for ${p.child?.name}. Please complete your payment.`,
            url:"/parent/payments",
          });
        } catch {}
        await Payment.findByIdAndUpdate(p._id,{ lastReminderSent:now });
      }
      console.log(`✅ Sent ${expiring.length} expiry + ${partial.length} balance reminders`);
    } catch(e){ console.error("Cron reminder:",e.message); }
  });

  // Daily midnight: term-end check
  require("node-cron").schedule("0 0 * * *", async () => {
    try {
      const Payment = require("../models/Payment");
      const now = new Date();
      const year = now.getFullYear();
      const terms = ZAMBIAN_TERMS[year] || [];
      for (const t of terms) {
        const close = new Date(t.close);
        const expiry = new Date(close); expiry.setDate(expiry.getDate()+3);
        if (now >= close && now <= expiry) {
          const tPayments = await Payment.find({
            termYear:year, termNumber:t.term,
            status:"approved", isExpired:false,
          }).populate("child","name");
          for (const p of tPayments) {
            try {
              const { sendPushToUser } = require("../routes/push");
              await sendPushToUser(p.parent.toString(),{
                title:`📚 Term ${t.term} ${year} Ending`,
                body:`Fees for ${p.child?.name} expire in ${Math.ceil((expiry-now)/86400000)} days. Renew now!`,
                url:"/parent/payments",
              });
            } catch {}
          }
        }
      }
    } catch(e){ console.error("Cron term-end:",e.message); }
  });
};
