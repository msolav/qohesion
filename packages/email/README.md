# @qohesion/email

Email transports for the application, behind one interface.

- **BrevoTransport:** raw text and HTML through Brevo's transactional API. No Brevo template is used.
- **ResendTransport:** standby for service emails.
- **FailoverTransport:** tries the primary, then the standby. The voting lane does not fail over by default.
- **DailyBudget and BudgetedTransport:** a daily limit shared by all messages, with part of it reserved for service emails.
- **Message checks:** valid addresses, no line breaks in headers, one-click unsubscribe headers.

Keys are passed in by the caller and never stored or returned in a result.

```sh
npm ci
npm run typecheck
npm test
```
