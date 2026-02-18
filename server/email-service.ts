import Mailjet from 'node-mailjet';
import { type Game, type Subscription } from "@shared/schema";
import { format } from "date-fns";

// Initialize Mailjet with API keys from environment
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@colchestersd.org';
const FROM_NAME = process.env.FROM_NAME || 'Colchester Lakers Athletics';
const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';

// Initialize Mailjet client
let mailjet: any = null;
if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
  mailjet = new Mailjet({
    apiKey: MAILJET_API_KEY,
    apiSecret: MAILJET_SECRET_KEY
  });
  console.log('[Email Service] Mailjet configured successfully with FROM_EMAIL:', FROM_EMAIL);
} else {
  console.warn('Warning: MAILJET_API_KEY or MAILJET_SECRET_KEY not set. Email notifications will not work.');
  console.log('[Email Service] MAILJET_API_KEY exists:', !!MAILJET_API_KEY);
  console.log('[Email Service] MAILJET_SECRET_KEY exists:', !!MAILJET_SECRET_KEY);
}

interface GameEmailData {
  game: Game;
  type: '24hour' | 'gameday';
}

/**
 * Send game notification email to a subscriber
 */
export async function sendGameNotification(
  subscription: Subscription,
  emailData: GameEmailData
): Promise<boolean> {
  if (!mailjet) {
    console.warn('Skipping email send - Mailjet not configured');
    return false;
  }

  const { game, type } = emailData;
  const gameDate = format(new Date(game.date), 'EEEE, MMMM d, yyyy');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${subscription.unsubscribeToken}`;
  
  // Determine subject and intro text based on notification type
  const subject = type === '24hour'
    ? `Reminder: ${game.sport} game tomorrow!`
    : `Game Day: ${game.sport} vs ${game.opponent}`;
  
  const introText = type === '24hour'
    ? 'This is your 24-hour reminder for an upcoming Lakers game!'
    : 'Game day is here! The Lakers take the field/court today.';
  
  const homeAwayText = game.isHome === 'home' ? 'vs' : '@';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f7f9;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(210, 85%, 35%) 0%, hsl(210, 85%, 25%) 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 20px -30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .game-card {
          background-color: #f8f9fa;
          border-left: 4px solid hsl(210, 85%, 35%);
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .sport-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 10px;
        }
        .sport-football { background-color: hsl(210, 85%, 35%); }
        .sport-soccer { background-color: hsl(150, 60%, 45%); }
        .sport-basketball { background-color: hsl(25, 75%, 50%); }
        .sport-volleyball { background-color: hsl(340, 70%, 55%); }
        .game-details {
          margin: 10px 0;
        }
        .game-details strong {
          color: hsl(215, 25%, 20%);
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .unsubscribe {
          margin-top: 10px;
        }
        .unsubscribe a {
          color: hsl(210, 85%, 35%);
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colchester Lakers Athletics</h1>
        </div>
        
        <p>${introText}</p>
        
        <div class="game-card">
          <span class="sport-badge sport-${game.sport.toLowerCase()}">${game.sport}</span>
          
          <div class="game-details">
            <strong>Matchup:</strong> Lakers ${homeAwayText} ${game.opponent}
          </div>
          
          <div class="game-details">
            <strong>Date:</strong> ${gameDate}
          </div>
          
          <div class="game-details">
            <strong>Time:</strong> ${game.time}
          </div>
          
          <div class="game-details">
            <strong>Location:</strong> ${game.location}
          </div>
        </div>
        
        <p style="margin-top: 20px;">
          ${game.isHome === 'home' 
            ? 'Come support the Lakers at home!' 
            : 'The Lakers are on the road. Let\'s go Lakers!'}
        </p>
        
        <div class="footer">
          <p>You're receiving this email because you subscribed to ${game.sport} game notifications for Colchester Lakers Athletics.</p>
          <div class="unsubscribe">
            <a href="${unsubscribeUrl}">Unsubscribe from all notifications</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        SandboxMode: false,
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: subscription.email,
                Name: subscription.email.split('@')[0]
              }
            ],
            Subject: subject,
            HTMLPart: htmlContent
          }
        ]
      });

    await request;
    console.log(`Email sent to ${subscription.email} for ${game.sport} game (${type})`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${subscription.email}:`, error);
    return false;
  }
}

/**
 * Send 24-hour reminder email
 */
export async function send24HourReminder(
  email: string,
  game: Game,
  unsubscribeToken: string
): Promise<boolean> {
  if (!mailjet) {
    console.warn('Skipping email send - Mailjet not configured');
    return false;
  }

  const gameDate = format(new Date(game.date), 'EEEE, MMMM d, yyyy');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const homeAwayText = game.isHome === 'home' ? 'vs' : '@';
  const subject = `Reminder: ${game.sport} game tomorrow!`;
  const introText = 'This is your 24-hour reminder for an upcoming Lakers game!';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f7f9;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(210, 85%, 35%) 0%, hsl(210, 85%, 25%) 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 20px -30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .game-card {
          background-color: #f8f9fa;
          border-left: 4px solid hsl(210, 85%, 35%);
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .sport-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 10px;
        }
        .sport-football { background-color: hsl(210, 85%, 35%); }
        .sport-soccer { background-color: hsl(150, 60%, 45%); }
        .sport-basketball { background-color: hsl(25, 75%, 50%); }
        .sport-volleyball { background-color: hsl(340, 70%, 55%); }
        .game-details {
          margin: 10px 0;
        }
        .game-details strong {
          color: hsl(215, 25%, 20%);
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .unsubscribe {
          margin-top: 10px;
        }
        .unsubscribe a {
          color: hsl(210, 85%, 35%);
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colchester Lakers Athletics</h1>
        </div>
        
        <p>${introText}</p>
        
        <div class="game-card">
          <span class="sport-badge sport-${game.sport.toLowerCase()}">${game.sport}</span>
          
          <div class="game-details">
            <strong>Matchup:</strong> Lakers ${homeAwayText} ${game.opponent}
          </div>
          
          <div class="game-details">
            <strong>Date:</strong> ${gameDate}
          </div>
          
          <div class="game-details">
            <strong>Time:</strong> ${game.time}
          </div>
          
          <div class="game-details">
            <strong>Location:</strong> ${game.location}
          </div>
        </div>
        
        <p style="margin-top: 20px;">
          ${game.isHome === 'home' 
            ? 'Come support the Lakers at home!' 
            : 'The Lakers are on the road. Let\'s go Lakers!'}
        </p>
        
        <div class="footer">
          <p>You're receiving this email because you subscribed to ${game.sport} game notifications for Colchester Lakers Athletics.</p>
          <div class="unsubscribe">
            <a href="${unsubscribeUrl}">Unsubscribe from all notifications</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        SandboxMode: false,
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: email,
                Name: email.split('@')[0]
              }
            ],
            Subject: subject,
            HTMLPart: htmlContent
          }
        ]
      });

    await request;
    console.log(`24-hour reminder email sent to ${email} for ${game.sport} game`);
    return true;
  } catch (error) {
    console.error(`Failed to send 24-hour reminder to ${email}:`, error);
    return false;
  }
}

/**
 * Send game day reminder email
 */
export async function sendGameDayReminder(
  email: string,
  game: Game,
  unsubscribeToken: string
): Promise<boolean> {
  if (!mailjet) {
    console.warn('Skipping email send - Mailjet not configured');
    return false;
  }

  const gameDate = format(new Date(game.date), 'EEEE, MMMM d, yyyy');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const homeAwayText = game.isHome === 'home' ? 'vs' : '@';
  const subject = `Game Day: ${game.sport} vs ${game.opponent}`;
  const introText = 'Game day is here! The Lakers take the field/court today.';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f7f9;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(210, 85%, 35%) 0%, hsl(210, 85%, 25%) 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 20px -30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .game-card {
          background-color: #f8f9fa;
          border-left: 4px solid hsl(210, 85%, 35%);
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .sport-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 10px;
        }
        .sport-football { background-color: hsl(210, 85%, 35%); }
        .sport-soccer { background-color: hsl(150, 60%, 45%); }
        .sport-basketball { background-color: hsl(25, 75%, 50%); }
        .sport-volleyball { background-color: hsl(340, 70%, 55%); }
        .game-details {
          margin: 10px 0;
        }
        .game-details strong {
          color: hsl(215, 25%, 20%);
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .unsubscribe {
          margin-top: 10px;
        }
        .unsubscribe a {
          color: hsl(210, 85%, 35%);
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colchester Lakers Athletics</h1>
        </div>
        
        <p>${introText}</p>
        
        <div class="game-card">
          <span class="sport-badge sport-${game.sport.toLowerCase()}">${game.sport}</span>
          
          <div class="game-details">
            <strong>Matchup:</strong> Lakers ${homeAwayText} ${game.opponent}
          </div>
          
          <div class="game-details">
            <strong>Date:</strong> ${gameDate}
          </div>
          
          <div class="game-details">
            <strong>Time:</strong> ${game.time}
          </div>
          
          <div class="game-details">
            <strong>Location:</strong> ${game.location}
          </div>
        </div>
        
        <p style="margin-top: 20px;">
          ${game.isHome === 'home' 
            ? 'Come support the Lakers at home!' 
            : 'The Lakers are on the road. Let\'s go Lakers!'}
        </p>
        
        <div class="footer">
          <p>You're receiving this email because you subscribed to ${game.sport} game notifications for Colchester Lakers Athletics.</p>
          <div class="unsubscribe">
            <a href="${unsubscribeUrl}">Unsubscribe from all notifications</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        SandboxMode: false,
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: email,
                Name: email.split('@')[0]
              }
            ],
            Subject: subject,
            HTMLPart: htmlContent
          }
        ]
      });

    await request;
    console.log(`Game day reminder email sent to ${email} for ${game.sport} game`);
    return true;
  } catch (error) {
    console.error(`Failed to send game day reminder to ${email}:`, error);
    return false;
  }
}

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(subscription: Subscription): Promise<boolean> {
  if (!mailjet) {
    console.warn('Skipping welcome email - Mailjet not configured');
    return false;
  }

  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${subscription.unsubscribeToken}`;
  const sportsText = subscription.sports.join(', ');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Lakers Notifications</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f7f9;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(210, 85%, 35%) 0%, hsl(210, 85%, 25%) 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 20px -30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .highlight {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .unsubscribe a {
          color: hsl(210, 85%, 35%);
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Lakers Notifications!</h1>
        </div>
        
        <p>Thank you for subscribing to Colchester Lakers Athletics game notifications!</p>
        
        <div class="highlight">
          <strong>You'll receive notifications for:</strong> ${sportsText}
          <br><br>
          <strong>When:</strong> 24 hours before each game AND on game day morning
        </div>
        
        <p>Never miss a Lakers game! You'll get timely reminders before every ${sportsText} match.</p>
        
        <div class="footer">
          <p>You can manage your subscription or unsubscribe at any time.</p>
          <div class="unsubscribe">
            <a href="${unsubscribeUrl}">Unsubscribe</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log(`[Email Service] Attempting to send welcome email to ${subscription.email}`);
    console.log(`[Email Service] Using FROM_EMAIL: ${FROM_EMAIL}, FROM_NAME: ${FROM_NAME}`);
    
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        SandboxMode: false,
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: subscription.email,
                Name: subscription.email.split('@')[0]
              }
            ],
            Subject: 'You\'re subscribed to Lakers game notifications!',
            TextPart: `Welcome to Lakers Notifications!\n\nThank you for subscribing to Colchester Lakers Athletics game notifications!\n\nYou'll receive notifications for: ${sportsText}\nWhen: 24 hours before each game AND on game day morning\n\nNever miss a Lakers game!\n\nTo unsubscribe: ${unsubscribeUrl}`,
            HTMLPart: htmlContent
          }
        ]
      });

    const response = await request;
    console.log(`[Email Service] Welcome email sent to ${subscription.email}`, JSON.stringify(response.body, null, 2));
    
    // Query the message status using the Message API for debugging
    if (response.body?.Messages?.[0]?.To?.[0]?.MessageID) {
      const messageId = response.body.Messages[0].To[0].MessageID;
      try {
        const messageStatus = await mailjet
          .get('message', { version: 'v3' })
          .id(messageId)
          .request();
        console.log(`[Email Service] Message status for ${messageId}:`, JSON.stringify(messageStatus.body, null, 2));
      } catch (statusError: any) {
        console.log(`[Email Service] Could not fetch message status:`, statusError?.message);
      }
    }
    
    return true;
  } catch (error: any) {
    console.error(`[Email Service] Failed to send welcome email to ${subscription.email}:`);
    console.error(`[Email Service] Error message:`, error?.message);
    console.error(`[Email Service] Error response:`, JSON.stringify(error?.response?.data || error?.response?.body || error, null, 2));
    return false;
  }
}

/**
 * Send unsubscribe confirmation email
 */
export async function sendUnsubscribeConfirmation(
  email: string,
  unsubscribedSports: string[],
  remainingSports: string[],
  fullyUnsubscribed: boolean
): Promise<boolean> {
  if (!mailjet) {
    console.warn('Skipping unsubscribe confirmation email - Mailjet not configured');
    return false;
  }

  const subscribeUrl = `${APP_URL}/subscribe`;
  
  const subject = fullyUnsubscribed 
    ? "You've been unsubscribed from Lakers notifications"
    : "Your Lakers notification preferences have been updated";
  
  const mainMessage = fullyUnsubscribed
    ? "You have been successfully unsubscribed from all Colchester Lakers Athletics game notifications."
    : `You have been unsubscribed from ${unsubscribedSports.join(", ")} notifications.`;
  
  const remainingMessage = !fullyUnsubscribed && remainingSports.length > 0
    ? `<p>You're still subscribed to: <strong>${remainingSports.join(", ")}</strong></p>`
    : "";
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f7f9;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(210, 85%, 35%) 0%, hsl(210, 85%, 25%) 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 20px -30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .highlight {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background-color: hsl(210, 85%, 35%);
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 15px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colchester Lakers Athletics</h1>
        </div>
        
        <p>${mainMessage}</p>
        
        ${remainingMessage}
        
        <div class="highlight">
          ${fullyUnsubscribed 
            ? "<p>We're sorry to see you go! If you change your mind, you can always subscribe again to receive game notifications.</p>"
            : "<p>Your notification preferences have been updated successfully.</p>"
          }
        </div>
        
        ${fullyUnsubscribed 
          ? `<p style="text-align: center;"><a href="${subscribeUrl}" class="btn">Subscribe Again</a></p>`
          : ""
        }
        
        <div class="footer">
          <p>Colchester Lakers Athletics</p>
          <p>Go Lakers!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        SandboxMode: false,
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: email,
                Name: email.split('@')[0]
              }
            ],
            Subject: subject,
            TextPart: `${mainMessage}\n\n${!fullyUnsubscribed && remainingSports.length > 0 ? `You're still subscribed to: ${remainingSports.join(", ")}\n\n` : ""}${fullyUnsubscribed ? `Subscribe again: ${subscribeUrl}` : ""}`,
            HTMLPart: htmlContent
          }
        ]
      });

    await request;
    console.log(`[Email Service] Unsubscribe confirmation email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Service] Failed to send unsubscribe confirmation to ${email}:`, error?.message);
    return false;
  }
}

/**
 * Debug function to check Mailjet account and sender status
 */
export async function checkMailjetStatus(): Promise<any> {
  if (!mailjet) {
    return { error: 'Mailjet not configured' };
  }

  try {
    // Check sender addresses
    const senderResult = await mailjet
      .get('sender', { version: 'v3' })
      .request();
    
    // Check API key info
    const apiKeyResult = await mailjet
      .get('apikey', { version: 'v3' })
      .request();
    
    return {
      senders: senderResult.body,
      apiKey: apiKeyResult.body
    };
  } catch (error: any) {
    return { 
      error: error?.message,
      statusCode: error?.statusCode,
      response: error?.response?.data || error?.response?.body
    };
  }
}

export const emailService = {
  sendGameNotification,
  send24HourReminder,
  sendGameDayReminder,
  sendWelcomeEmail,
  sendUnsubscribeConfirmation,
  checkMailjetStatus,
};
