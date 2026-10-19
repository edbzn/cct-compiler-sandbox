`oxc` was re-run (`all` pass, 3 cold runs) at the end of the second session. That session benchmarked
`angular-build`, `angular-build-jit` and `swc` and started about 20 minutes after the first one ended. Before both
sessions about 40 GB of memory was available, and the load average before the second was about 1.

Session 2 came out 1–5% slower on the timing metrics. Compare session-2 setups (`angular-build*`, `swc`) with session-1
setups with that margin in mind. Differences of 10% or more are real.
