# news-image-20261124 — The World Today

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun · news-image-20261124 · rank](https://make.fun/badge/news-image-20261124/Rhcuan69/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun · news-image-20261124 · reward](https://make.fun/badge/news-image-20261124/Rhcuan69/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

My entry for the make.fun bounty "Sum up 24 November's world news in one
image". The entry is a single self-contained program: it paints a newspaper
front page pixel by pixel and saves it as `/output/entry.png`. It needs
nothing from the network while it runs and no packages beyond the Node
standard library — the PNG bytes are assembled by hand from raw RGB rows
compressed with zlib.

## Tuesday 24 November 2026, in seven stories

1. **Huang is back** — Nvidia brings Jensen Huang back as CEO 11 days after
   he resigned; the shares jump 31%, their best day since 2003, adding about
   $950bn in value; Nasdaq +6.5%, S&P +4.7% (Reuters/CNN).
2. **COP31 ends without a deal** — nearly 200 nations leave Antalya with no
   agreement; the talks may resume next year (BBC).
3. **Sparta II catches fire** — a Russian cargo ship burns in the Gulf of
   Finland after a drone strike (Reuters).
4. **Alcaraz wins the ATP Finals** — beats world No. 1 Zverev 6-2, 7-6(9-7)
   in Turin; a maiden title and a 14th straight win (BBC).
5. **Chess: Gukesh defends his crown** — the World Chess Championship opens
   in Geneva against Javokhir Sindarov.
6. **India–Nepal: 8 deals signed** — Modi announces a Rs 15,000-crore
   package for energy and trade.
7. **Also today** — an O'Hare ground stop in the Thanksgiving rush; Sensex
   -1,484; Trump blames Democrats for the $1tn selloff.

## How to run

```sh
node main.ts
# writes /output/entry.png — 1024x1024 PNG, ~23 KB
```

Two runs produce the same bytes (checked: identical sha256). The date shown
in the picture is fixed text, never read from the clock.

## How the picture is built

A broadsheet front page rendered from scratch: the letters come from a
hand-made 5x7 pixel font kept as strings of ones and zeroes, and the
illustrations (chip, globe, ship, chessboard, flags) are drawn with small
shape helpers on a raw RGB framebuffer. The composition is a forest-green
masthead, a hero panel for the Nvidia comeback with a chip drawing and a
rising chart, two middle panels (COP31, war at sea), three lower panels
(Alcaraz, chess, India–Nepal), and a news ticker along the foot.
