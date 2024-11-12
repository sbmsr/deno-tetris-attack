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
- [ ] fix bug where x x a x => x x x doesnt collapse and score points
- [ ] fix bug where {\"activeArea\":[\"undefined\",\"z\",\"z\",\"z\",null,\"a\"] is a possible key
- [ ] reward when gap is increased between tallest row and top of board (i.e. move tiles into empty slots)
- [ ] what if instead of raw grid, you took every 2 horizontally adj. cells, and tracked if === or not. 
  - ex x a x a       false false
  -    x a x x  ->   false true
  -    a x a x       false false

# bugs

- [ ] don't render stacked tiles that should collapse (e.x. a\na\na...)
- [ ] sometimes tiles are put in configuration that should score, but they dont
      (aaba => aaab, instead of ___b )

# ???

- [ ] win state
