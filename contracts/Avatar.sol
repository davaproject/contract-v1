//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./roles/Operable.sol";
import "./libs/LibBase64.sol";
import "./libs/LibAddress.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/ILayerHouse.sol";
import "./interfaces/IAssetHouse.sol";

// To improve code readability, 'avatarId' will be used instead of 'tokenId'
// Simple structure (Avatar can only holds Asset contract(Normal 721))
contract Avatar is ERC721Enumerable, ERC721Holder, Operable {
    string private constant NOT_AUTHORIZED =
        "Avatar: Not authorized to control this avatar";
    string private constant UNREGISTERED_CONTRACT =
        "Avatar: Unregistered contract";
    string private constant ALREADY_REGISTERED_CONTRACT =
        "Avatar: Already registered contract";
    string private constant EXCEEDS_MAX_SUPPLY = "Avatar: Exceeds max supply";
    string private constant CHILD_TOKEN_NOT_OWNED_BY_AVATAR =
        "Avatar: Child token not owned by avatar.";
    string private constant CHILD_TOKEN_NOT_OWNED_BY_USER =
        "Avatar: Child token not owned by user.";
    string private constant NEITHER_OWNER_NOR_OPERATOR =
        "Avatar: message sender is neither an owner nor approved operator";
    string private constant NO_EMPTY_DATA =
        "Avatar: _data must contain the uint256 tokenId to transfer the child token to.";
    string private constant NON_EXISTENT_AVATAR =
        "Avatar: Avatar does not exist";
    string private constant ALREADY_RECEIVED_CHILD_TOKEN =
        "Avatar: Already received child token";
    string private constant NO_EMPTY_RECEIVER =
        "Avatar: receiver should not be a zero address";
    string private constant NO_EMPTY_ADDRESS =
        "Avatar: Address should not be empty";

    using LibAddress for address;
    using Strings for uint256;
    using LibBase64 for bytes;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    string public constant NAME = "Avatar";
    string public constant SYMBOL = "DAVA";
    uint256 public MAX_SUPPLY = 10000; // TODO: Use this constant

    // avatarId => (child address => array of child tokens)
    mapping(uint256 => mapping(address => EnumerableSet.UintSet))
        private childTokens;

    // child address => child token id => avatarId
    mapping(address => mapping(uint256 => uint256)) private childTokenOwner;

    // avatarId => child contracts
    mapping(uint256 => EnumerableSet.AddressSet) private childContracts;

    event ReceiveChild(
        address indexed _from,
        uint256 indexed _toTokenId,
        address indexed _childContract,
        uint256 _childTokenId
    );
    event TransferChild(
        uint256 indexed _fromTokenId,
        address indexed _to,
        address indexed _childContract,
        uint256 _childTokenId
    );
    event GetChild(
        address indexed _from,
        uint256 indexed _avatarId,
        address indexed _childContract,
        uint256 _childTokenId
    );

    constructor(ILayerHouse _layerHouse, IAssetHouse _assetHouse)
        ERC721(NAME, SYMBOL)
    {
        layerHouse = _layerHouse;
        assetHouse = _assetHouse;
    }

    modifier onlyAuthorized(uint256 _avatarId) {
        address rootOwner = ownerOf(_avatarId);
        require(
            rootOwner == msg.sender ||
                getApproved(_avatarId) == msg.sender ||
                isApprovedForAll(rootOwner, msg.sender),
            NOT_AUTHORIZED
        );
        _;
    }

    function mint(address _receiver)
        external
        onlyOperator
        returns (uint256 avatarId)
    {
        uint256 totalSupply = totalSupply();
        require(totalSupply < MAX_SUPPLY, EXCEEDS_MAX_SUPPLY);

        avatarId = totalSupply;
        _mint(_receiver, avatarId);
    }

    function rootOwnerOfChild(address _childContract, uint256 _childTokenId)
        external
        view
        returns (address rootOwner)
    {
        if (_childContract != address(0)) {
            (rootOwner, _childTokenId) = _ownerOfChild(
                _childContract,
                _childTokenId
            );
        } else {
            rootOwner = ownerOf(_childTokenId);
        }
    }

    function _removeChild(
        uint256 _avatarId,
        address _childContract,
        uint256 _childTokenId
    ) internal {
        require(
            childTokens[_avatarId][_childContract].contains(_childTokenId),
            CHILD_TOKEN_NOT_OWNED_BY_AVATAR
        );

        // Remove child token
        childTokens[_avatarId][_childContract].remove(_childTokenId);
        delete childTokenOwner[_childContract][_childTokenId];

        // Remove contract
        if (childTokens[_avatarId][_childContract].length() == 0) {
            childContracts[_avatarId].remove(_childContract);
        }
    }

    function safeTransferChild(
        uint256 _fromAvatarId,
        address _to,
        address _childContract,
        uint256 _childTokenId
    ) external onlyAuthorized(_fromAvatarId) {
        _checkTransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
        _unEquipAsset(_fromAvatarId, _childContract);
        _removeChild(_fromAvatarId, _childContract, _childTokenId);

        ERC721(_childContract).safeTransferFrom(
            address(this),
            _to,
            _childTokenId
        );
        emit TransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
    }

    function safeTransferChild(
        uint256 _fromAvatarId,
        address _to,
        address _childContract,
        uint256 _childTokenId,
        bytes memory _data
    ) external onlyAuthorized(_fromAvatarId) {
        _checkTransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
        _unEquipAsset(_fromAvatarId, _childContract);
        _removeChild(_fromAvatarId, _childContract, _childTokenId);

        ERC721(_childContract).safeTransferFrom(
            address(this),
            _to,
            _childTokenId,
            _data
        );
        emit TransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
    }

    function transferChild(
        uint256 _fromAvatarId,
        address _to,
        address _childContract,
        uint256 _childTokenId
    ) external onlyAuthorized(_fromAvatarId) {
        _checkTransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
        _unEquipAsset(_fromAvatarId, _childContract);
        _removeChild(_fromAvatarId, _childContract, _childTokenId);

        ERC721(_childContract).transferFrom(address(this), _to, _childTokenId);
        emit TransferChild(_fromAvatarId, _to, _childContract, _childTokenId);
    }

    function getChild(
        address _from,
        uint256 _avatarId,
        address _childContract,
        uint256 _childTokenId
    ) public {
        _receiveChild(_from, _avatarId, _childContract, _childTokenId);
        require(
            _from == msg.sender ||
                ERC721(_childContract).isApprovedForAll(_from, msg.sender) ||
                ERC721(_childContract).getApproved(_childTokenId) == msg.sender,
            NEITHER_OWNER_NOR_OPERATOR
        );
        ERC721(_childContract).transferFrom(
            _from,
            address(this),
            _childTokenId
        );

        emit GetChild(_from, _avatarId, _childContract, _childTokenId);
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _childTokenId,
        bytes calldata _data
    ) public override(ERC721Holder) returns (bytes4) {
        require(_data.length > 0, NO_EMPTY_DATA);
        // convert up to 32 bytes of_data to uint256, owner nft tokenId passed as uint in bytes
        uint256 avatarId;
        assembly {
            avatarId := calldataload(164)
        }
        if (_data.length < 32) {
            avatarId = avatarId >> (256 - _data.length * 8);
        }
        _receiveChild(_from, avatarId, msg.sender, _childTokenId);
        require(
            ERC721(msg.sender).ownerOf(_childTokenId) != address(0),
            CHILD_TOKEN_NOT_OWNED_BY_USER
        );
        return
            ERC721Holder.onERC721Received(
                _operator,
                _from,
                _childTokenId,
                _data
            );
    }

    function _receiveChild(
        address _from,
        uint256 _avatarId,
        address _childContract,
        uint256 _childTokenId
    ) internal {
        require(_exists(_avatarId), NON_EXISTENT_AVATAR);
        require(
            !childTokens[_avatarId][_childContract].contains(_childTokenId),
            ALREADY_RECEIVED_CHILD_TOKEN
        );
        if (!childContracts[_avatarId].contains(_childContract)) {
            childContracts[_avatarId].add(_childContract);
        }
        childTokens[_avatarId][_childContract].add(_childTokenId);
        childTokenOwner[_childContract][_childTokenId] = _avatarId;
        emit ReceiveChild(_from, _avatarId, _childContract, _childTokenId);
    }

    function _ownerOfChild(address _childContract, uint256 _childTokenId)
        internal
        view
        returns (address parentAvatarOwner, uint256 parentAvatarId)
    {
        parentAvatarId = childTokenOwner[_childContract][_childTokenId];

        // If parentAvatarId is 0, we need to check whether parentAvatarId does not exist or tokenIndex is 0
        require(
            parentAvatarId > 0 ||
                childTokens[parentAvatarId][_childContract].contains(
                    _childTokenId
                ),
            CHILD_TOKEN_NOT_OWNED_BY_AVATAR
        );

        return (ownerOf(parentAvatarId), parentAvatarId);
    }

    function ownerOfChild(address _childContract, uint256 _childTokenId)
        external
        view
        returns (address parentAvatarOwner, uint256 parentAvatarId)
    {
        (parentAvatarOwner, parentAvatarId) = _ownerOfChild(
            _childContract,
            _childTokenId
        );
    }

    function totalChildContracts(uint256 _avatarId)
        external
        view
        returns (uint256)
    {
        return childContracts[_avatarId].length();
    }

    function childContractByIndex(uint256 _avatarId, uint256 _index)
        external
        view
        returns (address)
    {
        return childContracts[_avatarId].at(_index);
    }

    function totalChildTokens(uint256 _avatarId, address _childContract)
        external
        view
        returns (uint256)
    {
        return childTokens[_avatarId][_childContract].length();
    }

    function childTokenByIndex(
        uint256 _avatarId,
        address _childContract,
        uint256 _index
    ) external view returns (uint256) {
        return childTokens[_avatarId][_childContract].at(_index);
    }

    function _checkTransferChild(
        uint256 _avatarId,
        address _to,
        address _childContract,
        uint256 _childTokenId
    ) internal view {
        uint256 avatarId = childTokenOwner[_childContract][_childTokenId];
        require(
            avatarId == _avatarId &&
                childTokens[_avatarId][_childContract].contains(_childTokenId),
            CHILD_TOKEN_NOT_OWNED_BY_AVATAR
        );
        require(_to != address(0), NO_EMPTY_RECEIVER);
    }

    /**
        Assets
     */
    // avatarId => asset contract => assetId
    mapping(uint256 => mapping(address => uint256)) public equippedAsset;
    mapping(uint256 => mapping(address => bool)) public equipped;

    EnumerableSet.AddressSet registeredAssetContracts;

    ILayerHouse public layerHouse;
    IAssetHouse public assetHouse;

    event SetLayerHouse(ILayerHouse _layerHouse);
    event SetAssetHouse(IAssetHouse _layerHouse);
    event RegisterAssetContract(address indexed _assetContract);
    event EquipAsset(
        uint256 _avatarId,
        address indexed _assetContract,
        uint256 _assetId
    );
    event UnEquipAsset(
        uint256 _avatarId,
        address indexed _assetContract,
        uint256 _assetId
    );

    function setLayerHouse(ILayerHouse _layerHouse) external onlyOwner {
        require(address(_layerHouse) != address(0), NO_EMPTY_ADDRESS);
        layerHouse = _layerHouse;

        emit SetLayerHouse(_layerHouse);
    }

    function setAssetHouse(IAssetHouse _assetHouse) external onlyOwner {
        require(address(_assetHouse) != address(0), NO_EMPTY_ADDRESS);
        assetHouse = _assetHouse;

        emit SetAssetHouse(_assetHouse);
    }

    function isRegisteredContract(address _contractAddress)
        public
        view
        returns (bool)
    {
        return registeredAssetContracts.contains(_contractAddress);
    }

    function _registerAssetContract(address _assetContract) internal onlyOwner {
        require(
            !isRegisteredContract(_assetContract),
            ALREADY_REGISTERED_CONTRACT
        );
        registeredAssetContracts.add(_assetContract);

        emit RegisterAssetContract(_assetContract);
    }

    function registerAssetContracts(address[] calldata _assetContract)
        external
    {
        for (uint256 i = 0; i < _assetContract.length; i += 1) {
            _registerAssetContract(_assetContract[i]);
        }
    }

    struct AssetForEquip {
        address assetContract;
        uint256 tokenId;
    }

    function equipAssets(
        uint256 _avatarId,
        AssetForEquip[] calldata _assetsForEquip
    ) external onlyAuthorized(_avatarId) {
        for (uint256 i = 0; i < _assetsForEquip.length; i += 1) {
            equipAsset(
                _avatarId,
                _assetsForEquip[i].assetContract,
                _assetsForEquip[i].tokenId
            );
        }
    }

    function equipAssets(
        uint256 _avatarId,
        AssetForEquip[] calldata _assetsForEquip,
        address _unequippedAssetReceiver
    ) external onlyAuthorized(_avatarId) {
        for (uint256 i = 0; i < _assetsForEquip.length; i += 1) {
            address assetContract = _assetsForEquip[i].assetContract;
            if (equipped[_avatarId][assetContract]) {
                uint256 equippedTokenId = equippedAsset[_avatarId][
                    assetContract
                ];
                ERC721(assetContract).transferFrom(
                    address(this),
                    _unequippedAssetReceiver,
                    equippedTokenId
                );
                emit UnEquipAsset(_avatarId, assetContract, equippedTokenId);
                emit TransferChild(
                    _avatarId,
                    _unequippedAssetReceiver,
                    assetContract,
                    equippedTokenId
                );
            }

            equipAsset(_avatarId, assetContract, _assetsForEquip[i].tokenId);
        }
    }

    function equipAsset(
        uint256 _avatarId,
        address _assetContract,
        uint256 _tokenId
    ) private {
        require(isRegisteredContract(_assetContract), UNREGISTERED_CONTRACT);
        if (!childTokens[_avatarId][_assetContract].contains(_tokenId)) {
            require(
                msg.sender == IERC721(_assetContract).ownerOf(_tokenId),
                CHILD_TOKEN_NOT_OWNED_BY_USER
            );
            getChild(msg.sender, _avatarId, _assetContract, _tokenId);
        }

        equipped[_avatarId][_assetContract] = true;
        equippedAsset[_avatarId][_assetContract] = _tokenId;
        emit EquipAsset(_avatarId, _assetContract, _tokenId);
    }

    function unEquipAssets(
        uint256 _avatarId,
        address[] calldata _assetsForUnEquip
    ) external onlyAuthorized(_avatarId) {
        for (uint256 i = 0; i < _assetsForUnEquip.length; i += 1) {
            _unEquipAsset(_avatarId, _assetsForUnEquip[i]);
        }
    }

    function unEquipAssets(
        uint256 _avatarId,
        address[] calldata _assetsForUnEquip,
        address _receiver
    ) external onlyAuthorized(_avatarId) {
        for (uint256 i = 0; i < _assetsForUnEquip.length; i += 1) {
            address childContract = _assetsForUnEquip[i];
            _unEquipAsset(_avatarId, childContract);

            uint256 childTokenId = equippedAsset[_avatarId][childContract];
            ERC721(childContract).transferFrom(
                address(this),
                _receiver,
                childTokenId
            );
            emit TransferChild(
                _avatarId,
                _receiver,
                childContract,
                childTokenId
            );
        }
    }

    function _unEquipAsset(uint256 _avatarId, address _assetContract) private {
        if (!equipped[_avatarId][_assetContract]) {
            return;
        }

        uint256 equippedToken = equippedAsset[_avatarId][_assetContract];

        delete equippedAsset[_avatarId][_assetContract];
        delete equipped[_avatarId][_assetContract];

        emit UnEquipAsset(_avatarId, _assetContract, equippedToken);
    }

    function getImage(uint256 _avatarId) public view returns (string memory) {
        require(_exists(_avatarId), NON_EXISTENT_AVATAR);
        uint256 layerAmount = layerHouse.layerAmountOf(address(this));

        ILayerHouse.Layer[] memory layers = layerHouse.layersOf(address(this));
        string[] memory virtualChildSVGs = new string[](layerAmount);

        uint256 renderedLayerAmount = 0;
        for (uint256 i = 0; i < layerAmount; i += 1) {
            ILayerHouse.Layer memory layer = layers[i];

            if (equipped[_avatarId][layer.asset]) {
                uint256 tokenId = equippedAsset[_avatarId][layer.asset];

                virtualChildSVGs[renderedLayerAmount] = IAsset(layer.asset)
                    .getRawImage(tokenId);
                renderedLayerAmount += 1;
            } else if (layer.hasDefault) {
                string memory link = assetHouse
                    .getAssetDataById(layer.assetId)
                    .assetHttpLink;

                virtualChildSVGs[renderedLayerAmount] = assetHouse
                    .getImageFromLink(link);
                renderedLayerAmount += 1;
            }
        }

        string[] memory childSVGs = new string[](renderedLayerAmount);
        for (uint256 i = 0; i < renderedLayerAmount; i += 1) {
            childSVGs[i] = virtualChildSVGs[i];
        }

        return assetHouse.getSVGWithChildSVGs(childSVGs);
    }

    function tokenURI(uint256 _avatarId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(_avatarId), NON_EXISTENT_AVATAR);
        uint256 assetAmount = registeredAssetContracts.length();

        string memory metadata = string(
            abi.encodePacked(
                '{"name":"DAVA #',
                _avatarId.toString(),
                '","attributes":['
            )
        );

        uint256 equippedAmount = 0;
        uint256 tokenId;
        for (uint256 i = 0; i < assetAmount; i += 1) {
            address assetContract = registeredAssetContracts.at(i);
            if (equipped[_avatarId][assetContract]) {
                equippedAmount += 1;
                tokenId = equippedAsset[_avatarId][assetContract];

                metadata = string(
                    abi.encodePacked(
                        metadata,
                        '{"trait_type":"',
                        IAsset(assetContract).traitType(),
                        '","value":"',
                        IAsset(assetContract).assetTitle(tokenId),
                        '","creator":"',
                        IAsset(assetContract).assetCreator(tokenId).toString(),
                        '"},'
                    )
                );
            }
        }

        metadata = string(
            abi.encodePacked(
                metadata,
                '{"trait_type":"Equipped Asset Amount","value":"',
                equippedAmount.toString()
            )
        );

        return
            string(
                abi.encodePacked(
                    metadata,
                    '"}],"image":"data:image/svg_xml;base64,',
                    abi.encodePacked(getImage(_avatarId)).encode(),
                    '"}'
                )
            );
    }
}
