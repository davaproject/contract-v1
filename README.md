# Asset Layers

1. Empty background
2. Frame background
3. Background
4. Suit addon
5. Empty body
6. Frame body
7. Suit
8. Empty head
9. Frame head
10. Emotion
11. Helmet
12. Helmet addon
13. Signature

## Layer Order

- Background: 3, 5, 8, 13
- Suit Addon: 1, 4, 5, 8, 13
- Suit: 1, 5, 7, 8, 13
- Emotion: 1, 5, 8, 10, 13
- Helmet: 1, 5, 8, 11, 13
- Helmet Addon: 1, 5, 8, 12, 13
- Avatar: 2, 3, 4, 6, 7, 9, 10, 11, 12, 13

## Contract Structure

1. Background
2. Suit addon
3. Suit
4. Emotion
5. Helmet
6. Helmet addon

- Empty, Frame, Signature parts are just stored in assetHouse. No need to deploy 721 contract.
