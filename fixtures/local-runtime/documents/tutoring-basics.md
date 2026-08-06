# Offline Tutoring Pack (Approved Fixture)

source_id: fixtures/local-runtime/documents/tutoring-basics.md
approved: true
pack: offline-tutoring-v1

## Binary Search Intuition

Binary search finds a target in a sorted list by repeatedly checking the middle element and discarding half of the remaining search space. Each step halves the problem size, so the worst-case cost is logarithmic in the number of elements.

## Study Tip

Explain the invariant out loud: “the target, if present, is always inside the current low–high window.” Practice with a short sorted array before coding.
