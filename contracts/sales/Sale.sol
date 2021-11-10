//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {IRandomBox} from "./IRandomBox.sol";

interface IPartCollection {
    function unsafeMintBatch(
        address account,
        uint256[] calldata partIds,
        uint256[] calldata amounts
    ) external;
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
    uint256 public constant MAX_MINT_PER_TX = 30;

    uint256 public immutable PRE_SALE_OPENING_TIME;
    uint256 public immutable PRE_SALE_CLOSING_TIME;
    uint256 public immutable PUBLIC_SALE_OPENING_TIME;
    uint256 public publicSaleClosingTime;

    // Supply
    uint16 private constant MAX_TOTAL_SUPPLY = 10000;
    uint16 public totalClaimedAmount = 0;
    uint16 public totalPreSaleAmount = 0;
    uint16 public totalPublicSaleAmount = 0;

    mapping(address => uint256) public preSaleMintAmountOf;

    // Parts
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
        publicSaleClosingTime = 2**256 - 1;
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
        require(
            block.timestamp <= publicSaleClosingTime,
            "Sale: publicSale has ended"
        );
        _;
    }

    function setPublicSaleClosingTime(uint256 closingTime_) external onlyOwner {
        publicSaleClosingTime = closingTime_;
    }

    function claim(address[] calldata recipients) external onlyOwner {
        require(
            totalClaimedAmount + uint16(recipients.length) <=
                PRE_ALLOCATED_AMOUNT,
            "Sale: exceeds pre allocated mint amount"
        );

        for (uint16 i = 0; i < uint16(recipients.length); i++) {
            _mintAvatarWithParts(totalClaimedAmount + i);
        }
        totalClaimedAmount += uint16(recipients.length);
    }

    // this is for public sale.
    function mint(uint256 purchaseAmount)
        external
        payable
        onlyDuringPublicSale
    {
        require(!soldOut(), "Sale: sold out");
        require(
            purchaseAmount <= MAX_MINT_PER_TX,
            "Sale: can not purchase more than MAX_MINT_PER_TX"
        );
        _checkEthAmount(purchaseAmount, msg.value);

        uint16 davaId = _getMintableId();
        for (uint16 i = 0; i < uint16(purchaseAmount); i += 1) {
            _mintAvatarWithParts(davaId + i);
        }
        totalPublicSaleAmount += uint16(purchaseAmount);
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

        uint16 davaId = _getMintableId();
        for (uint16 i = 0; i < uint16(purchaseAmount); i += 1) {
            _mintAvatarWithParts(davaId + i);
        }
        totalPreSaleAmount += uint16(purchaseAmount);
    }

    function withdrawFunds(address payable receiver) external onlyOwner {
        uint256 amount = address(this).balance;
        receiver.transfer(amount);
    }

    function _mintAvatarWithParts(uint16 avatarId) internal {
        address avatar = dava.mint(address(this), uint256(avatarId));

        uint256[] memory partIds = _randomBox.getPartIds(avatarId);
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1;
        amounts[1] = 1;
        amounts[2] = 1;

        davaOfficial.unsafeMintBatch(avatar, partIds, amounts);
        Part[] memory parts = new Part[](PARTS_PER_AVATAR);
        for (uint256 i = 0; i < PARTS_PER_AVATAR; i += 1) {
            parts[i] = Part(address(davaOfficial), uint96(partIds[i]));
        }
        IAvatar(avatar).dress(parts, new bytes32[](0));
        dava.transferFrom(address(this), msg.sender, avatarId);
    }

    function soldOut() public view returns (bool) {
        return (totalPreSaleAmount +
            totalPublicSaleAmount +
            uint160(PRE_ALLOCATED_AMOUNT) ==
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

    function _getMintableId() private view returns (uint16) {
        uint16 id = uint16(PRE_ALLOCATED_AMOUNT) +
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
