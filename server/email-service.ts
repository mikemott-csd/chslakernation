import sgMail from '@sendgrid/mail';
import { type Game, type Subscription } from "@shared/schema";
import { format } from "date-fns";

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@colchesterlakers.com';
const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('Warning: SENDGRID_API_KEY not set. Email notifications will not work.');
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
  if (!SENDGRID_API_KEY) {
    console.warn('Skipping email send - SENDGRID_API_KEY not configured');
    return false;
  }

  const { game, type } = emailData;
  const gameDate = format(new Date(game.date), 'EEEE, MMMM d, yyyy');
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${subscription.unsubscribeToken}`;
  
  // Determine subject and intro text based on notification type
  const subject = type === '24hour'
    ? `🏀 Reminder: ${game.sport} game tomorrow!`
    : `🏀 Game Day: ${game.sport} vs ${game.opponent}`;
  
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
            ? 'Come support the Lakers at home! 🏠' 
            : 'The Lakers are on the road. Let\'s go Lakers! ✈️'}
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
  
  const msg = {
    to: subscription.email,
    from: FROM_EMAIL,
    subject: subject,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${subscription.email} for ${game.sport} game (${type})`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${subscription.email}:`, error);
    return false;
  }
}

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(subscription: Subscription): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('Skipping welcome email - SENDGRID_API_KEY not configured');
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
  
  const msg = {
    to: subscription.email,
    from: FROM_EMAIL,
    subject: '🎉 You\'re subscribed to Lakers game notifications!',
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${subscription.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome email to ${subscription.email}:`, error);
    return false;
  }
}
