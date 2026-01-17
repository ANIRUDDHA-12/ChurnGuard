/**
 * Email Service
 * ===============
 * Nodemailer-based email service for intervention notifications.
 * Uses Ethereal for demo/testing (no real emails sent).
 * 
 * In production, replace Ethereal with real SMTP credentials.
 */

const nodemailer = require('nodemailer');

// Create transporter (Ethereal for demo)
let transporter = null;
let testAccount = null;

/**
 * Initialize email service with Ethereal test account
 */
async function initEmailService() {
    try {
        // Create Ethereal test account (fake SMTP)
        testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        console.log('📧 Email service initialized (Ethereal test mode)');
        console.log(`   Preview emails at: https://ethereal.email/login`);
        console.log(`   User: ${testAccount.user}`);
        return true;
    } catch (err) {
        console.error('❌ Failed to initialize email service:', err.message);
        return false;
    }
}

/**
 * Email templates for different intervention types
 */
const emailTemplates = {
    nudge: {
        subject: "We miss you! Here's what you've been missing",
        html: (userName, data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #6366f1;">We miss you, ${userName || 'Valued Customer'}! 👋</h1>
                <p style="color: #475569; font-size: 16px;">
                    It's been a while since we've seen you, and we wanted to check in.
                </p>
                <p style="color: #475569; font-size: 16px;">
                    Here's what's new since your last visit:
                </p>
                <ul style="color: #475569;">
                    <li>New features to boost your productivity</li>
                    <li>Improved performance and reliability</li>
                    <li>Enhanced support options</li>
                </ul>
                <a href="#" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
                    Come Back & Explore
                </a>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                    This email was sent by ChurnGuard Intervention System
                </p>
            </div>
        `
    },
    support: {
        subject: "Need help? Our support team is here for you",
        html: (userName, data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #8b5cf6;">Hi ${userName || 'there'}! 🤝</h1>
                <p style="color: #475569; font-size: 16px;">
                    We noticed you might be having some challenges, and we're here to help!
                </p>
                <p style="color: #475569; font-size: 16px;">
                    Our dedicated support team has been alerted and will reach out within 24 hours.
                    In the meantime, here are some resources that might help:
                </p>
                <ul style="color: #475569;">
                    <li>📚 <a href="#" style="color: #6366f1;">Knowledge Base</a></li>
                    <li>💬 <a href="#" style="color: #6366f1;">Live Chat</a></li>
                    <li>📞 <a href="#" style="color: #6366f1;">Schedule a Call</a></li>
                </ul>
                <p style="color: #475569; font-size: 16px;">
                    You're not alone – we're committed to your success!
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                    Priority Support Ticket Created
                </p>
            </div>
        `
    },
    offer: {
        subject: "🎁 A special offer just for you!",
        html: (userName, data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #10b981;">Special Offer Inside! 🎉</h1>
                <p style="color: #475569; font-size: 16px;">
                    Hi ${userName || 'Valued Customer'},
                </p>
                <p style="color: #475569; font-size: 16px;">
                    As one of our valued customers, we want to offer you something special:
                </p>
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <h2 style="margin: 0; font-size: 32px;">20% OFF</h2>
                    <p style="margin: 10px 0 0 0;">Your next renewal</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Code: STAY20</p>
                </div>
                <p style="color: #475569; font-size: 16px;">
                    This offer expires in 7 days. Don't miss out!
                </p>
                <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px;">
                    Claim Your Offer
                </a>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                    Exclusive offer for ChurnGuard customers
                </p>
            </div>
        `
    }
};

/**
 * Send intervention email
 */
async function sendInterventionEmail(userId, actionType, userData = {}) {
    if (!transporter) {
        await initEmailService();
    }

    const template = emailTemplates[actionType];
    if (!template) {
        console.error(`❌ Unknown email template: ${actionType}`);
        return { success: false, error: 'Unknown template' };
    }

    const toEmail = userData.email || `${userId}@example.com`;
    const userName = userData.name || userId.split('-')[0];

    try {
        const info = await transporter.sendMail({
            from: '"ChurnGuard" <noreply@churnguard.io>',
            to: toEmail,
            subject: template.subject,
            html: template.html(userName, userData),
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`📧 Email sent: ${actionType} to ${toEmail}`);
        console.log(`   Preview: ${previewUrl}`);

        return {
            success: true,
            messageId: info.messageId,
            previewUrl,
        };
    } catch (err) {
        console.error(`❌ Email send failed:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get email preview HTML without sending
 */
function getEmailPreview(actionType, userData = {}) {
    const template = emailTemplates[actionType];
    if (!template) {
        return null;
    }

    return {
        subject: template.subject,
        html: template.html(userData.name || 'Customer', userData),
    };
}

module.exports = {
    initEmailService,
    sendInterventionEmail,
    getEmailPreview,
    emailTemplates,
};
