# todo

- [x] display a grid
- [x] load tiles bottom up
- [x] refactor to group game state + timing
- [x] lose state
- [x] display cursor
- [x] move cursor
- [x] speed up cursor rendering
- [x] render unique tiles
- [x] on button press, swap tiles
- [x] don't render tiles on the same row that should collapse (e.x. - aaa...)
- [x] score tiles
- [x] restart button
- [x] expose methods to play programmatically
  - [x] restart
  - [x] controls (arrows, space)
  - [x] get game state
  - [x] get score
- [x] show the score
- [ ] determine most important aspects of state
- [ ] model this state in a dimensionally efficient way

# bugs

- [ ] don't render stacked tiles that should collapse (e.x. a\na\na...)
- [ ] sometimes tiles are put in configuration that should score, but they dont
      (aaba => aaab, instead of ___b )

# ???

- [ ] win state
