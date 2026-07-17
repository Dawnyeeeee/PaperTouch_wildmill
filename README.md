# PaperTouch Wildmill Widget

An interactive page for [PaperTouch](https://doi.org/10.1145/3613904.3642571)
paper mechanisms: a blow-driven paper windmill, a rotary knob, and two paper
buttons control a dandelion particle effect.

## Live page

**https://dawnyeeeee.github.io/PaperTouch_wildmill/**

Scan to open on a tablet or phone:

<img src="Wilmill_widget.png" alt="QR code for the wildmill widget page" width="240">

## Zones

- **Middle (60%)** — place the paper windmill on the marked circle. While the
  windmill closes the switch, dandelion seeds float up from the top of the
  circle.
- **Right (20%)** — rotary knob. One rotation direction hits the upper pad
  (+1 level), the other hits the lower pad (-1 level). Level range is 0–20
  (default 10): at 20 the seeds fill the screen, at 0 they barely leave the
  circle.
- **Left (20%)** — two buttons. Upper circle resets the level to 10 and the
  color to gray-white. Lower circle picks a random soft color for the seeds.

Placement circle positions and sizes are constants at the top of `sketch.js`
(commented) so they can be matched to the physical widgets.

## Local development

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

Built with [p5.js](https://p5js.org/) (bundled locally as `p5.min.js`).
