export const ERC721Error = {
  NON_EXISTENT_TOKEN: 'ERC721: owner query for nonexistent token',
};

export const AvatarError = {
  NOT_AUTHORIZED: 'Avatar: Not authorized to control this avatar',
  UNREGISTERED_CONTRACT: 'Avatar: Unregistered contract',
  ALREADY_REGISTERED_CONTRACT: 'Avatar: Already registered contract',
  EXCEEDS_MAX_SUPPLY: 'Avatar: Exceeds max supply',
  CHILD_TOKEN_NOT_OWNED_BY_AVATAR: 'Avatar: Child token not owned by avatar.',
  CHILD_TOKEN_NOT_OWNED_BY_USER: 'Avatar: Child token not owned by user.',
  NEITHER_OWNER_NOR_OPERATOR:
    'Avatar: message sender is neither an owner nor approved operator',
  NO_EMPTY_DATA:
    'Avatar: _data must contain the uint256 tokenId to transfer the child token to.',
  NON_EXISTENT_AVATAR: 'Avatar: Avatar does not exist',
  ALREADY_RECEIVED_CHILD_TOKEN: 'Avatar: Already received child token',
  NO_EMPTY_RECEIVER: 'Avatar: receiver should not be a zero address',
  NO_EMPTY_ADDRESS: 'Avatar: Address should not be empty',
  LARGER_THAN_PREVIOUS:
    'Avatar: new maxAmount should be larger than previous one',
  EXCEEDS_MINTABLE_AMOUNT: 'Avatar: Exceeds mintable amount',
};

export const AssetError = {
  NON_EXISTENT_INDEX: 'Asset: index does not exist',
  NON_EXISTENT_TOKEN: 'Asset: token does not exist',
  NON_EXISTENT_ASSET: 'Asset: Asset does not exist',
  NO_EMPTY_ADDRESS: 'Asset: address should not be empty',
  UNREGISTERED_ASSET: 'Asset: Unregistered asset',
  NO_DECREASE_SUPPLY: 'Asset: Can not decrease supply',
  ONLY_POS_NUMBER: 'Asset: max supply should be greater than 0',
  ALREADY_REGISTERED_ASSET: 'Asset: asset is already registered',
  EXCEEDS_TOKEN_MAX_SUPPLY: 'Asset: token supply is full',
  EXCEEDS_ASSET_MAX_SUPPLY: 'Asset: Asset supply is full',
  INVALID_LAYER: 'Asset: Invalid layer',
  EXCEEDS_MAX_ASSET_SUPPLY_LIMIT:
    'Asset: Can not register asset amount more than maxAssetSupply',
};

export const AssetHouseError = {
  NON_EMPTY_ASSET_LINK: 'AssetHouse: asset link can not be empty',
  NON_EMPTY_TITLE: 'AssetHouse: title can not be empty',
  NON_EXISTENT_ASSET: 'AssetHouse: Non existent assetData',
  NON_EMPTY_CREATOR: 'AssetHouse: Non empty creator address',
};

export const LayerHouseError = {
  NON_EMPTY_ADDRESS: 'LayerHouse: address should not be empty',
  NON_EXISTENT_ASSET: 'LayerHouse: Asset does not exist',
  NOT_OWN_THIS_LAYER: 'LayerHouse: address does not hold this layer',
  NON_EXISTENT_LAYER: 'LayerHouse: Non existent layer',
  INVALID_Z_INDEX: 'LayerHouse: Invalid zIndex',
  Z_INDEX_SHOULD_BE_DIFFERENT:
    'LayerHouse: zIndexA and zIndexB should be different',
  LAYER_ALREADY_REGISTERED: 'LayerHouse: layers are already registered',
};

export const RandomBoxError = {
  ONLY_POS_NUMBER: 'RandomBox: maxNumber should be greater than 0',
};

export const OperableError = {
  NON_OPERATOR: 'Operable: caller is not the operator',
  NO_ZERO_ADDRESS: 'Operable: new operator is the zero address',
  ALREADY_REGISTERED: 'Operable: operator already registered',
  NON_REGISTERED: 'Operable: operator is not registered',
};

export const OwnableError = {
  NON_OWNER: 'Ownable: caller is not the owner',
};
