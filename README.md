# news-image-20261124 — The World Today

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun · news-image-20261124 · rank](https://make.fun/badge/news-image-20261124/Rhcuan69/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun · news-image-20261124 · reward](https://make.fun/badge/news-image-20261124/Rhcuan69/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

Sum up 24 November's world news in one image — a make.fun bounty entry.
One deterministic program draws the whole front page and writes it to
`/output/entry.png`. No network at runtime, no dependencies: pure Node
stdlib, PNG encoded by hand (raw RGB + zlib deflate + manual PNG chunks).

## The day in one image — Tuesday 24 November 2026

1. **Huang is back** — Nvidia reinstates Jensen Huang as CEO 11 days after
   he resigned; shares soar 31%, their best day since 2003, adding about
   $950bn in value; Nasdaq +6.5%, S&P +4.7% (Reuters/CNN).
2. **COP31 ends without a deal** — nearly 200 nations leave Antalya with no
   agreement; talks may resume next year (BBC).
3. **Sparta II catches fire** — a Russian cargo ship burns in the Gulf of
   Finland after a drone strike (Reuters).
4. **Alcaraz wins the ATP Finals** — beats world No. 1 Zverev 6-2, 7-6(9-7)
   in Turin; maiden title, 14th straight win (BBC).
5. **Chess: Gukesh defends his crown** — the World Chess Championship opens
   in Geneva against Javokhir Sindarov.
6. **India–Nepal: 8 deals signed** — Modi announces a Rs 15,000-crore
   package for energy and trade.
7. **Also today** — O'Hare ground stop in the Thanksgiving rush; Sensex
   -1,484; Trump blames Democrats for the $1tn selloff.

## Run it

```sh
node main.ts
# writes /output/entry.png — 1024x1024 PNG, ~23 KB
```

Run it twice and the bytes are identical (verified: same sha256 on both
runs). The date in the image is fixed text, never the clock.

## Layout

Newspaper front page, drawn from scratch with a hand-built 5x7 pixel font:
forest-green masthead, a hero panel for the Nvidia comeback with a chip
illustration and a rising chart, two mid panels (COP31, war at sea), three
lower panels (Alcaraz, chess, India–Nepal) and a news ticker at the foot.
