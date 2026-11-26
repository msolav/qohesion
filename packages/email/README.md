# @qohesion/email

Email transports for the application, behind one interface.

- **BrevoTransport:** raw text and HTML through Brevo's transactional API. No Brevo template is used.
- **ResendTransport:** standby for service emails.
- **FailoverTransport:** tries the primary, then the standby. The voting lane does not fail over by default.
- **DailyBudget and BudgetedTransport:** a daily limit shared by all messages, with part of it reserved for service emails.
- **Templates:** the verification email (voting lane) and the administrator sign-in email (service lane), in French and English, in the functional register of [docs/content-style.md](../../docs/content-style.md). The HTML part has no image, script or tracking, and each link shows its full address as its text. Names from users are cleaned and escaped; links must be https.
- **Message checks:** valid addresses, no line breaks in headers, one-click unsubscribe headers.

Keys are passed in by the caller and never stored or returned in a result.

```sh
npm ci
npm run typecheck
npm test
```
