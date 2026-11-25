# Asset queue

Shared between Claude (builds the 3D assets) and ChatGPT (draws concept and reference images).
Illustrative example for the talk, modelled on the speaker's workflow. Not the real file.

## Rules
- Claude adds requests at the bottom with status OPEN.
- ChatGPT takes the oldest OPEN request, sets IN PROGRESS, draws exactly what is listed, saves to `deliver_to`, sets DONE.
- Claude builds from DONE requests and adds new ones when the queue runs low.
- Both append one line to LOG for every change.

---

## REQ-014 · Medieval household items · DONE
items: bucket, butter churn, stool, bench, chest, spinning wheel
per item: front, side, 3/4, joint detail, material callouts, scale next to a 180 cm figure
style: neutral grey background, no text in the image
deliver_to: refs/medieval/household/

## REQ-015 · Carts and wagons · IN PROGRESS (chatgpt)
items: handcart, wheelbarrow, sack barrow, two-wheel cart, wagon, covered wagon
per item: front, side, top, wheel hub and axle close-up
notes: show grain direction on every plank. It decides where the wood splits.
deliver_to: refs/medieval/carts/

## REQ-016 · Cart loads · OPEN
items: barrels, crates, logs, sacks, hay
notes: loads must sit on the REQ-015 cart beds; match bed sizes
deliver_to: refs/medieval/loads/

---

## LOG
08:42  claude   added REQ-016 (queue had 1 open)
08:51  chatgpt  REQ-014 DONE, 36 images in refs/medieval/household/
08:52  claude   building REQ-014 (6 props)
08:53  chatgpt  REQ-015 IN PROGRESS
09:37  claude   REQ-014 built, 6 props, fracture tested
09:38  claude   waiting for REQ-015
