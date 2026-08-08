# Binary search (local tutoring note)

Binary search finds a target in a sorted array by repeatedly halving the search interval.

Steps:
1. Compare the target to the middle element.
2. Discard the half that cannot contain the target.
3. Repeat until found or the interval is empty.

Complexity claim (local): O(log n) comparisons on a sorted array of length n.
Caveat: requires a total order and random-access (or equivalent) sorted structure.
