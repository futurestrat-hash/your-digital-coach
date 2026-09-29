# Add voice, cousin benchmark, reminders, and sliced-fruit rewards

## What will change

1. **Mom’s voice**
   - Add a speaker control to each current Mom message.
   - Generate speech only when the user taps it, using a warm, mature, firm parental delivery with a subtle, natural accent. Avoid exaggerated pronunciation, stereotypes, or caricature.
   - On one or two of the user’s earliest Mom messages, show a brief invitation to tap and listen; afterward, leave the speaker control discoverable without repeating the prompt.
   - Add play, loading, stop, and clear error states.

2. **“Your cousin” benchmark**
   - Let Mom occasionally compare recent effort with a playful fictional “your cousin” benchmark.
   - Never assign the cousin a name, and keep comparisons silly, encouraging, and within the existing safety rules.

3. **Daily reminder**
   - Add an opt-in reminder setting with a local time, defaulting to 8:00 PM.
   - Send a browser notification only when no activity has been logged that local day.
   - Provide permission, enabled, disabled, and unsupported states; users can change the time or turn reminders off.

4. **Sliced-fruit reward**
   - Show a celebratory plate of sliced fruit when the user reaches a goal’s weekly target.
   - Add a clickable information control explaining: “The ultimate unspoken Asian parent apology and love language.”
   - Record claimed rewards so the same weekly achievement is not repeatedly awarded.

## Technical details

- Extend the existing secure user data with reminder preferences, notification subscriptions, and weekly reward claims, including access policies and grants.
- Add an authenticated speech endpoint using the Lovable AI Gateway’s default speech model and streaming playback.
- Add a service worker and a signed scheduled reminder endpoint; schedule the backend check at regular intervals and respect each profile’s timezone.
- Keep all Mom-generated wording under the existing health, identity, and anti-shaming safeguards.
- Add the new controls to Home and Settings, then verify the complete signed-in flow in desktop and mobile-sized views.
