# Flagship test results

Live: https://loop-vliao.github.io/flagship-store/flagship-store-test/

## Password

The page asks for a password (`loopersonly`) before showing anything. The
password itself is not in the source; only its SHA-256 is, and the check runs
in the browser.

**This is a deterrent, not access control.** The site is served from a public
GitHub Pages URL, so anyone who knows the structure can still read the files
directly — for example `images/` or `prototype/product.html` — without ever
seeing the password prompt. It keeps casual visitors out of the dashboard; it
does not make the contents private.

For genuinely private hosting, the options are a private repo on a paid GitHub
plan with Pages restricted to organisation members, GitHub Enterprise Cloud's
private Pages, or a host that supports server-side password protection.

To change the password, replace the `HASH` constant near the bottom of
`index.html` with the SHA-256 of the new password.
