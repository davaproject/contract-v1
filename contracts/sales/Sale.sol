//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {IRandomBox} from "./IRandomBox.sol";

interface IPartCollection {
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function totalSupply(uint256 id) external view returns (uint256);

    function maxSupply(uint256 id) external view returns (uint256);
}

contract Sale is EIP712, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant WHITELIST_TYPE_HASH =
        keccak256("Whitelist(uint256 ticketAmount,address beneficiary)");
    bytes32 public constant PARTS_TYPE_HASH =
        keccak256("PartDistInfo(bytes32 rawData)");

    uint256 public constant MAX_MINT_PER_TICKET = 3;
    uint256 public constant PRE_ALLOCATED_AMOUNT = 500;

    uint256 public constant PRICE = 0.05 ether;
    uint256 public constant MAX_MINT_PER_ACCOUNT = 30;

    uint256 public immutable PRE_SALE_OPENING_TIME;
    uint256 public immutable PRE_SALE_CLOSING_TIME;
    uint256 public immutable PUBLIC_SALE_OPENING_TIME;

    // Supply
    uint256 private constant MAX_TOTAL_SUPPLY = 10000;
    uint256 public totalClaimedAmount = 0;
    uint256 public totalPreSaleAmount = 0;
    uint256 public totalPublicSaleAmount = 0;

    mapping(address => uint256) public preSaleMintAmountOf;
    mapping(address => uint256) public publicSaleMintAmountOf;

    // Parts
    mapping(bytes1 => EnumerableSet.UintSet) internal _partIds;
    mapping(bytes32 => bool) internal _processedPartDistInfo;

    IDava public dava;
    IPartCollection public davaOfficial;
    IRandomBox private _randomBox;

    struct Whitelist {
        uint256 ticketAmount;
        address beneficiary;
    }

    struct PreSaleReq {
        uint8 vSig;
        bytes32 rSig;
        bytes32 sSig;
        Whitelist whitelist;
    }

    /**
        To reduce gas cost, partTypes consist of 2 big parts
        1. partTypeIndexes in fist 3 bytes
        2. Salt in remaining bytes
        for example, 0x010ba00000....000000ab02
     */
    struct PartDistInfo {
        bytes32 rawData;
    }

    struct PartsReq {
        uint8 vSig;
        bytes32 rSig;
        bytes32 sSig;
        PartDistInfo partDistInfo;
    }

    constructor(
        IDava dava_,
        IPartCollection davaOfficial_,
        IRandomBox randomBox_,
        uint256 presaleStart,
        uint256 presaleEnd,
        uint256 publicStart
    ) EIP712("AvatarSale", "V1") {
        dava = dava_;
        davaOfficial = davaOfficial_;
        _randomBox = randomBox_;
        PRE_SALE_OPENING_TIME = presaleStart;
        PRE_SALE_CLOSING_TIME = presaleEnd;
        PUBLIC_SALE_OPENING_TIME = publicStart;
    }

    modifier onlyDuringPreSale() {
        require(
            block.timestamp >= PRE_SALE_OPENING_TIME,
            "Sale: preSale has not started yet"
        );
        require(
            block.timestamp <= PRE_SALE_CLOSING_TIME,
            "Sale: preSale has ended"
        );
        _;
    }

    modifier onlyDuringPublicSale() {
        require(
            block.timestamp >= PUBLIC_SALE_OPENING_TIME,
            "Sale: publicSale has not started yet"
        );
        _;
    }

    function setPartIds(bytes1 partTypeIndex, uint256[] calldata partIds)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < partIds.length; i += 1) {
            _partIds[partTypeIndex].add(partIds[i]);
        }
    }

    function claim(address[] calldata recipients, bytes32[] calldata partData)
        external
        onlyOwner
    {
        require(
            recipients.length == partData.length,
            "Sale: invalid arguments"
        );
        require(
            totalClaimedAmount + recipients.length <= PRE_ALLOCATED_AMOUNT,
            "Sale: exceeds pre allocated mint amount"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintAvatarWithParts(totalClaimedAmount, partData[i]);

            totalClaimedAmount += 1;
        }
    }

    // this is for public sale.
    function mint(PartsReq[] calldata partsReqs)
        external
        payable
        onlyDuringPublicSale
    {
        uint256 purchaseAmount = partsReqs.length;
        require(!soldOut(), "Sale: sold out");
        require(
            purchaseAmount <=
                MAX_MINT_PER_ACCOUNT - publicSaleMintAmountOf[msg.sender],
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT"
        );
        _checkEthAmount(purchaseAmount, msg.value);

        publicSaleMintAmountOf[msg.sender] += purchaseAmount;

        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            _verifyPartDistInfoSig(partsReqs[i]);

            uint256 davaId = _getMintableId();
            totalPublicSaleAmount += 1;

            _mintAvatarWithParts(davaId, partsReqs[i].partDistInfo.rawData);
        }
    }

    // this is for pre sale.
    function mintWithWhitelist(
        PreSaleReq calldata preSaleReq,
        PartsReq[] calldata partsReqs
    ) external payable onlyDuringPreSale {
        uint256 purchaseAmount = partsReqs.length;
        require(
            msg.sender == preSaleReq.whitelist.beneficiary,
            "Sale: msg.sender is not whitelisted"
        );
        require(
            purchaseAmount <=
                (preSaleReq.whitelist.ticketAmount * MAX_MINT_PER_TICKET) -
                    preSaleMintAmountOf[msg.sender],
            "Sale: exceeds assigned amount"
        );
        _checkEthAmount(purchaseAmount, msg.value);
        _verifyWhitelistSig(preSaleReq);

        preSaleMintAmountOf[msg.sender] += purchaseAmount;

        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            _verifyPartDistInfoSig(partsReqs[i]);

            uint256 davaId = _getMintableId();
            totalPreSaleAmount += 1;

            _mintAvatarWithParts(davaId, partsReqs[i].partDistInfo.rawData);
        }
    }

    function withdrawFunds(address payable receiver) external onlyOwner {
        uint256 amount = address(this).balance;
        receiver.transfer(amount);
    }

    function _mintAvatarWithParts(uint256 avatarId, bytes32 partData) internal {
        require(
            !_processedPartDistInfo[partData],
            "Sale: already used partDistInfo"
        );
        _processedPartDistInfo[partData] = true;

        dava.mint(address(this), avatarId);
        address avatar = dava.getAvatar(avatarId);

        bytes1[] memory partTypeIndexes = _retrievePartTypeIndexes(partData);

        Part[] memory parts = new Part[](3);
        for (uint256 i = 0; i < 3; i += 1) {
            uint256 partId = _mintParts(partTypeIndexes[i], avatar);
            parts[i] = Part(address(davaOfficial), partId);
        }

        IAvatar(avatar).dress(parts, new bytes32[](0));
        dava.transferFrom(address(this), msg.sender, avatarId);
    }

    function _mintParts(bytes1 partTypeIndex, address receiver)
        internal
        returns (uint256)
    {
        uint256 randomIndex = _randomBox.getRandomNumber(
            _partIds[partTypeIndex].length()
        );
        uint256 partId = _partIds[partTypeIndex].at(randomIndex);
        davaOfficial.mint(receiver, partId, 1, "0x");

        if (
            davaOfficial.totalSupply(partId) == davaOfficial.maxSupply(partId)
        ) {
            _partIds[partTypeIndex].remove(partId);
        }

        return partId;
    }

    function soldOut() public view returns (bool) {
        return (totalPreSaleAmount +
            totalPublicSaleAmount +
            PRE_ALLOCATED_AMOUNT ==
            MAX_TOTAL_SUPPLY);
    }

    function _verifyWhitelistSig(PreSaleReq calldata preSaleReq) internal view {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    WHITELIST_TYPE_HASH,
                    preSaleReq.whitelist.ticketAmount,
                    msg.sender
                )
            )
        );

        address signer = ecrecover(
            digest,
            preSaleReq.vSig,
            preSaleReq.rSig,
            preSaleReq.sSig
        );
        require(signer == owner(), "Sale: invalid signature");
    }

    function _verifyPartDistInfoSig(PartsReq calldata partsReq) internal view {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(PARTS_TYPE_HASH, partsReq.partDistInfo.rawData)
            )
        );

        address signer = ecrecover(
            digest,
            partsReq.vSig,
            partsReq.rSig,
            partsReq.sSig
        );
        require(signer == owner(), "Sale: invalid signature");
    }

    function _retrievePartTypeIndexes(bytes32 partData)
        internal
        pure
        returns (bytes1[] memory)
    {
        bytes1[] memory partTypeIndexes = new bytes1[](3);
        partTypeIndexes[0] = bytes1(partData);
        partTypeIndexes[1] = bytes1(partData << 8);
        partTypeIndexes[2] = bytes1(partData << 16);

        return partTypeIndexes;
    }

    function _getMintableId() private view returns (uint256) {
        uint256 id = PRE_ALLOCATED_AMOUNT +
            totalPreSaleAmount +
            totalPublicSaleAmount;
        require(id < MAX_TOTAL_SUPPLY, "Sale: exceeds max supply");

        return id;
    }

    function _checkEthAmount(uint256 purchaseAmount, uint256 paidEth)
        private
        pure
    {
        uint256 requiredEth = purchaseAmount * PRICE;
        require(paidEth >= requiredEth, "Sale: not enough eth");
    }
}
