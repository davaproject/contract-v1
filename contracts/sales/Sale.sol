//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {IRandomBox} from "./IRandomBox.sol";

interface IPartCollection {
    function mintBatch(
        address account,
        uint256[] calldata partIds,
        uint256[] calldata amounts,
        bytes memory data
    ) external;

    function totalSupply(uint256 id) external view returns (uint256);

    function maxSupply(uint256 id) external view returns (uint256);
}

contract Sale is EIP712, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant WHITELIST_TYPE_HASH =
        keccak256("Whitelist(uint256 ticketAmount,address beneficiary)");

    uint256 public constant PARTS_PER_AVATAR = 3;
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
    // 0x(partType1)(partType2)(partType3) => amount
    mapping(bytes3 => uint256) internal _amountOfGroups;
    bytes3[] internal _groups;
    mapping(bytes1 => EnumerableSet.UintSet) internal _partIds;

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

    function setPartGroups(
        bytes3[] calldata partGroups,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(partGroups.length == amounts.length, "Sale: invalid arguments");

        for (uint256 i = 0; i < partGroups.length; i += 1) {
            _amountOfGroups[partGroups[i]] = amounts[i];
            _groups.push(partGroups[i]);
        }
    }

    function setPartIds(bytes1 partTypeIndex, uint256[] calldata partIds)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < partIds.length; i += 1) {
            _partIds[partTypeIndex].add(partIds[i]);
        }
    }

    function claim(address[] calldata recipients) external onlyOwner {
        require(
            totalClaimedAmount + recipients.length <= PRE_ALLOCATED_AMOUNT,
            "Sale: exceeds pre allocated mint amount"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintAvatarWithParts(totalClaimedAmount);

            totalClaimedAmount += 1;
        }
    }

    // this is for public sale.
    function mint(uint256 purchaseAmount)
        external
        payable
        onlyDuringPublicSale
    {
        require(!soldOut(), "Sale: sold out");
        require(
            purchaseAmount <=
                MAX_MINT_PER_ACCOUNT - publicSaleMintAmountOf[msg.sender],
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT"
        );
        _checkEthAmount(purchaseAmount, msg.value);

        publicSaleMintAmountOf[msg.sender] += purchaseAmount;

        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            uint256 davaId = _getMintableId();
            totalPublicSaleAmount += 1;

            _mintAvatarWithParts(davaId);
        }
    }

    // this is for pre sale.
    function mintWithWhitelist(
        PreSaleReq calldata preSaleReq,
        uint256 purchaseAmount
    ) external payable onlyDuringPreSale {
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
            uint256 davaId = _getMintableId();
            totalPreSaleAmount += 1;

            _mintAvatarWithParts(davaId);
        }
    }

    function withdrawFunds(address payable receiver) external onlyOwner {
        uint256 amount = address(this).balance;
        receiver.transfer(amount);
    }

    function _mintAvatarWithParts(uint256 avatarId) internal {
        dava.mint(address(this), avatarId);
        address avatar = dava.getAvatar(avatarId);

        uint256[] memory partIds = _retrievePartIds();

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1;
        amounts[1] = 1;
        amounts[2] = 1;
        davaOfficial.mintBatch(avatar, partIds, amounts, "0x");

        Part[] memory parts = new Part[](PARTS_PER_AVATAR);
        for (uint256 i = 0; i < PARTS_PER_AVATAR; i += 1) {
            parts[i] = Part(address(davaOfficial), partIds[i]);
        }

        IAvatar(avatar).dress(parts, new bytes32[](0));
        dava.transferFrom(address(this), msg.sender, avatarId);
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

    function _retrievePartIds() internal returns (uint256[] memory) {
        uint256 randomIndex = _randomBox.getRandomNumber(_groups.length);
        bytes3 group = _groups[randomIndex];
        _amountOfGroups[group] -= 1;
        if (_amountOfGroups[group] == 0) {
            if (randomIndex == _groups.length - 1) {
                _groups.pop();
            } else {
                _groups[randomIndex] = _groups[_groups.length - 1];
                _groups.pop();
            }
        }

        uint256[] memory partIds = new uint256[](PARTS_PER_AVATAR);
        for (uint256 i = 0; i < PARTS_PER_AVATAR; i += 1) {
            bytes1 partIndex = bytes1(group << (8 * i));
            randomIndex = _randomBox.getRandomNumber(
                _partIds[partIndex].length()
            );
            uint256 partId = (_partIds[partIndex].at(randomIndex));
            partIds[i] = partId;

            if (
                davaOfficial.totalSupply(partId) + 1 ==
                davaOfficial.maxSupply(partId)
            ) {
                _partIds[partIndex].remove(partId);
            }
        }

        return partIds;
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
