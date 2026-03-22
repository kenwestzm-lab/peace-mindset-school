// ── Auto-expiry cron jobs for Zambian school terms ────────────────────
// Add this to your server.js, replacing the existing cron section

const { getCurrentTerm, getTerm, ZAMBIAN_TERMS } = require("./utils/zambia-calendar");

module.exports = (io) => {

  // ── Every hour: expire payments past their expiry date ───────────────
  require("node-cron").schedule("0 * * * *", async () => {
    try {
      const Payment = require("./models/Payment");
      const now = new Date();

      const expired = await Payment.updateMany(
        {
          status: "approved",
          isExpired: false,
          expiresAt: { $lt: now },
        },
        { isExpired: true }
      );

      if (expired.modifiedCount > 0) {
        console.log(`✅ Cron: expired ${expired.modifiedCount} payments`);

        // Notify each affected parent
        const affectedPayments = await Payment.find({
          status: "approved",
          isExpired: true,
          expiresAt: { $lt: now, $gt: new Date(now - 2 * 60 * 60 * 1000) }, // last 2 hours
        }).populate("child", "name");

        for (const p of affectedPayments) {
          io.to(`user:${p.parent}`).emit("payment_expired", {
            childId: p.child?._id,
            childName: p.child?.name,
            paymentType: p.paymentType,
            message: `⚠️ Your ${p.paymentType.replace(/_/g," ")} for ${p.child?.name} has expired. Please renew.`,
          });

          try {
            const { sendPushToUser } = require("./routes/push");
            await sendPushToUser(p.parent.toString(), {
              title: "Payment Expired ⚠️",
              body: `Your school fees for ${p.child?.name} have expired. Please renew.`,
              url: "/parent/payments",
              icon: "/logo.webp",
            });
          } catch {}
        }
      }
    } catch (err) { console.error("Cron expire error:", err); }
  });

  // ── Daily at 8 AM: send reminders 7 days before expiry ───────────────
  require("node-cron").schedule("0 8 * * *", async () => {
    try {
      const Payment = require("./models/Payment");
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find payments expiring in 7 days
      const expiringSoon = await Payment.find({
        status: "approved",
        isExpired: false,
        expiresAt: { $gte: now, $lte: in7Days },
      }).populate("child", "name grade");

      for (const p of expiringSoon) {
        const daysLeft = Math.ceil((new Date(p.expiresAt) - now) / (1000 * 60 * 60 * 24));
        const isUrgent = daysLeft <= 3;

        io.to(`user:${p.parent}`).emit("payment_reminder", {
          paymentId: p._id,
          childName: p.child?.name,
          daysLeft,
          message: `${isUrgent ? '🚨' : '⚠️'} ${p.child?.name}'s fees expire in ${daysLeft} day${daysLeft===1?'':'s'}. Please renew!`,
        });

        try {
          const { sendPushToUser } = require("./routes/push");
          await sendPushToUser(p.parent.toString(), {
            title: isUrgent ? `🚨 Fees expire in ${daysLeft} days!` : `⚠️ Fees expiring soon`,
            body: `${p.child?.name}'s school fees expire in ${daysLeft} day${daysLeft===1?'':'s'}. Renew now to keep access.`,
            url: "/parent/payments",
          });
        } catch {}
      }

      console.log(`✅ Cron: sent ${expiringSoon.length} payment reminders`);
    } catch (err) { console.error("Cron reminder error:", err); }
  });

  // ── Monthly: check if monthly subscriptions need renewal ─────────────
  require("node-cron").schedule("0 0 1 * *", async () => {
    try {
      const Payment = require("./models/Payment");
      const now = new Date();

      // Find monthly payments where it's a new month
      const monthlyExpired = await Payment.find({
        paymentType: "school_fee_monthly",
        status: "approved",
        isExpired: false,
        expiresAt: { $lt: now },
      }).populate("child", "name");

      for (const p of monthlyExpired) {
        p.isExpired = true;
        await p.save();
        io.to(`user:${p.parent}`).emit("payment_expired", {
          childId: p.child?._id,
          message: `📅 Monthly school fee for ${p.child?.name} has expired. Please pay for this month.`,
        });
      }

      console.log(`✅ Cron: reset ${monthlyExpired.length} monthly subscriptions`);
    } catch (err) { console.error("Cron monthly error:", err); }
  });

  // ── Term-end check: lock access 3 days after term closes ─────────────
  require("node-cron").schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const terms = ZAMBIAN_TERMS[year] || [];

      for (const t of terms) {
        const expiry = new Date(new Date(t.close).setDate(new Date(t.close).getDate() + 3));

        // If today is the expiry day, send term-end notifications
        if (
          now.toDateString() === expiry.toDateString() ||
          (now > new Date(t.close) && now < expiry)
        ) {
          const Payment = require("./models/Payment");
          const termPayments = await Payment.find({
            termYear: year,
            termNumber: t.term,
            status: "approved",
            isExpired: false,
          }).populate("child", "name").populate("parent", "_id");

          console.log(`✅ Term ${t.term} ${year} ending — notifying ${termPayments.length} parents`);

          for (const p of termPayments) {
            try {
              const { sendPushToUser } = require("./routes/push");
              await sendPushToUser(p.parent._id.toString(), {
                title: `📚 ${t.name} ${year} Ending`,
                body: `School fees for ${p.child?.name} expire today. Please pay ${t.term < 3 ? 'for next term' : 'next year'}.`,
                url: "/parent/payments",
              });
            } catch {}
          }
        }
      }
    } catch (err) { console.error("Cron term-end error:", err); }
  });

};
