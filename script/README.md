# Script

This is where you can store all the scripts you want to use in your project.

## url-checker

Run `node script/url-checker.js --timeout 5` to check external HTTP(S) links in
the Markdown posts. The timeout is in seconds per URL. Use `--directory` to
check a directory other than `src/posts`. Broken or unreachable links fail the
check.