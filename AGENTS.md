<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Tiger Mom speech generation and delivery behind authenticated server boundaries; browser code only receives the streamed audio response. This protects credentials and user messages.
- Weekly rewards are keyed by user, goal, and local week start. This prevents duplicate claims while respecting each user’s timezone.
- Daily reminders are permission-based browser notifications scheduled against the saved local timezone and only fire after confirming no activity for that local date. This avoids unwanted or mistimed nagging.
