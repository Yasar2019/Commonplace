# Immediate publishing

The owner chose immediate publication with moderation afterward on October 26, 2026. New valid anonymous submissions become published after all existing security checks. Existing pending entries remain pending; hidden and rejected entries remain private. No database migration or automatic bulk publication.

## Approaches
- Pre-publication approval: existing behavior; delays every writer and requires owner action.
- Immediate publication with reporting and owner removal: selected by the owner to preserve spontaneous sharing.
- Automatic suspicious-content review: deferred until abuse evidence supports reliable rules.

## Behavior
Preserve Turnstile, atomic quotas, cooldown, duplicate detection, honeypot, origin validation, report verification, receipt deletion, owner authentication, audited hiding/restoration, and posting pause. Keep owner configuration mandatory so moderation is available. Remove the pending-queue capacity restriction from public submissions. New entries appear immediately in the current browser and public projections. Refresh the first public page after posting to keep ordering and pagination consistent, including when posting from an older page. Retain the receipt and clear the draft only after successful publication.

Update composer, success notice, about/privacy/guidelines, API documentation and README. Default the owner dashboard to reported entries; preserve legacy pending review. No dependencies or credential changes. Cloudflare GitHub builds deploy main automatically; verify remote commit and inspect any available deployment status without claiming unobserved live success.
