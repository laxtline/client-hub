// Configures the Razorpay client (test mode) used to create payment orders.
// Returns null if keys are absent so the app can run without payments configured.
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

export const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

// Lets routes answer "payments are off" with a clear 503 instead of failing
// deep inside the service with an opaque 500.
export const paymentsEnabled = Boolean(razorpay);
