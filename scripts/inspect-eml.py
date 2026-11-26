"""Reads a downloaded email (.eml) and reports what matters for sending: the authentication results recorded by
the receiving server, the DKIM signing domain, and whether the provider added tracking to the body.

    python3 -I scripts/inspect-eml.py path/to/message.eml

Treat the file as untrusted data: the script only parses it and prints text. It exits with 1 when it finds
a tracking image, a wrapped link, or a failed authentication check, so it can be used in a release check.
"""
import re
import sys
from email import policy
from email.parser import BytesParser

if len(sys.argv) != 2:
    print(__doc__)
    sys.exit(2)

msg = BytesParser(policy=policy.default).parse(open(sys.argv[1], "rb"))
one = lambda v, n=400: re.sub(r"\s+", " ", str(v))[:n]
problems = []


def show(name, limit=400):
    for v in msg.get_all(name, []):
        print(f"{name}: {one(v, limit)}")


print("== Identity")
for h in ("From", "Return-Path", "Message-ID", "Date", "Subject"):
    show(h, 160)

print("\n== Authentication results recorded by the receiving server")
results = " ".join(str(v) for v in msg.get_all("Authentication-Results", []))
show("Authentication-Results", 700)
for check in ("dkim", "spf", "dmarc"):
    m = re.search(rf"\b{check}=(\w+)", results)
    status = m.group(1) if m else "missing"
    print(f"  {check.upper()}: {status}")
    if check in ("dkim", "dmarc") and status != "pass":
        problems.append(f"{check.upper()} is {status}")

print("\n== DKIM signatures")
for sig in msg.get_all("DKIM-Signature", []):
    s = re.sub(r"\s+", "", str(sig))
    g = lambda k: (re.search(rf"(?:^|;){k}=([^;]+)", s) or [None, "?"])[1]
    print(f"  signing domain d={g('d')}  selector s={g('s')}")

print("\n== Unsubscribe headers")
show("List-Unsubscribe", 300)
show("List-Unsubscribe-Post", 100)

print("\n== Body")
for part in msg.walk():
    if part.get_content_type() not in ("text/plain", "text/html"):
        continue
    body = part.get_content()
    kind = part.get_content_type()
    print(f"  {kind}: {len(body)} characters")
    if re.search(r"sent with brevo", body, re.I):
        problems.append(f"{kind}: provider footer present")
    if re.search(r"<img[^>]*(width=.?1.?[ >][^>]*height=.?1.?[ >]|height=.?1.?[ >][^>]*width=.?1.?[ >])", body, re.I):
        problems.append(f"{kind}: 1x1 tracking image present")
    links = sorted(set(re.findall(r"https?://[^\s\"<>)]+", body)))
    for link in links:
        host = re.sub(r"^https?://([^/]+).*", r"\1", link)
        wrapped = bool(re.search(r"/tr/|sendibt|sibautomation|brevo", link, re.I))
        print(f"    link: {host}{'  <-- provider redirect' if wrapped else ''}")
        if wrapped:
            problems.append(f"{kind}: link goes through a provider redirect ({host})")

print()
if problems:
    print("PROBLEMS:")
    for p in problems:
        print(f"  - {p}")
    sys.exit(1)
print("OK: authentication passes, no tracking image, no wrapped links.")
