# Phase 24 Manual Checklist

1. Install the PWA on a physical iPhone home screen.
   Open the site in Safari on the iPhone, use Share -> `Add to Home Screen`, and launch the installed app from the home screen instead of from Safari tabs.

2. Open a real list page and confirm no location prompt appears before interaction.
   Navigate to any existing shopping list and verify the app does not show the iOS location prompt on page load, app launch, or route entry.

3. Tap `Slå på automatisk butikkvalg`, confirm the explanation appears, then tap `Fortsett`.
   Verify the first tap only reveals the explanation step and that the second explicit tap is the action that triggers the permission request.

4. Verify the iOS location prompt appears.
   Confirm the native iOS prompt is displayed from the installed PWA after the `Fortsett` tap and that the app does not silently fail behind the standalone shell.

5. Deny once, verify inline retry state appears and manual picker is still usable.
   After denying the prompt, confirm the list page shows the inline retry/recovery state and that `Velg butikk manuelt` still works for choosing a store.

6. Retry and verify Settings guidance appears if Safari no longer re-prompts.
   Tap the retry affordance. If iOS no longer shows the native prompt, verify the UI explains that location access may need to be re-enabled in Settings before automatic store selection can continue.

7. Re-enable location, background the app for at least 30 seconds, reopen, and confirm an immediate refresh occurs.
   Grant location access again, send the installed PWA to the background for at least 30 seconds, return to the app, and verify an immediate foreground refresh happens before the normal polling cadence resumes.

8. Turn off Location Services temporarily and verify the unavailable message still leaves manual selection usable.
   Disable Location Services or otherwise force a position-unavailable state, then verify the inline unavailable message appears while manual selection usable remains intact through `Velg butikk manuelt`.

Note: The smallest Phase 24 smoke path is `npx playwright test tests/location-detection.spec.ts --list` from this Wave 0 plan. The broader wave-level contract from `24-VALIDATION.md` remains `npx playwright test tests/location-detection.spec.ts`.
