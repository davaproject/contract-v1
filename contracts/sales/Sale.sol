//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDava.sol";

contract Sale is EIP712, Ownable {
    bytes32 public constant TYPE_HASH =
        keccak256("Whitelist(uint256 ticketAmount,address beneficiary)");

    uint256 public constant MAX_MINT_PER_TICKET = 3;
    uint256 public constant PRE_ALLOCATED_AMOUNT = 500;

    uint256 public constant PRICE = 0.095 ether;
    uint256 public constant MAX_MINT_PER_ACCOUNT = 30;

    uint256 public immutable PRE_SALE_OPENING_TIME;
    uint256 public immutable PRE_SALE_CLOSING_TIME;
    uint256 public immutable PUBLIC_SALE_OPENING_TIME;

    // Supply
    uint256 private constant MAX_TOTAL_SUPPLY = 10000;
    uint256 public totalPreSaleAmount = 0;
    uint256 public totalPublicSaleAmount = 0;

    mapping(address => uint256) public preSaleMintAmountOf;
    mapping(address => uint256) public publicSaleMintAmountOf;

    IDava public dava;

    struct AllocInfo {
        address recipient;
        uint256 tokenId;
    }

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

    event SoldOut();

    constructor(
        IDava dava_,
        uint256 presaleStart,
        uint256 presaleEnd,
        uint256 publicStart
    ) EIP712("AvatarSale", "V1") {
        dava = dava_;
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

    function claim(AllocInfo[] memory list) external onlyOwner {
        for (uint256 i = 0; i < list.length; i++) {
            require(
                list[i].tokenId < PRE_ALLOCATED_AMOUNT,
                "Sale: exceeds max allocated amount"
            );
            dava.mint(list[i].recipient, list[i].tokenId);
        }
    }

    function joinPublicSale(uint256 purchaseAmount)
        external
        payable
        onlyDuringPublicSale
    {
        require(!soldOut(), "Sale: sold out");
        require(
            purchaseAmount <= MAX_MINT_PER_ACCOUNT,
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT in a transaction"
        );
        require(
            purchaseAmount <=
                MAX_MINT_PER_ACCOUNT - publicSaleMintAmountOf[msg.sender],
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT"
        );
        _checkEthAmount(purchaseAmount, msg.value);

        publicSaleMintAmountOf[msg.sender] += purchaseAmount;
        totalPublicSaleAmount += purchaseAmount;

        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            dava.mint(msg.sender, _getMintableId());
        }
    }

    function joinPreSale(uint256 purchaseAmount, PreSaleReq calldata preSaleReq)
        external
        payable
        onlyDuringPreSale
    {
        require(
            purchaseAmount <= MAX_MINT_PER_ACCOUNT,
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT in a transaction"
        );
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

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TYPE_HASH,
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

        preSaleMintAmountOf[msg.sender] += purchaseAmount;
        totalPreSaleAmount += purchaseAmount;
        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            dava.mint(msg.sender, _getMintableId());
        }
    }

    function withdrawFunds(address payable receiver) external onlyOwner {
        uint256 amount = address(this).balance;
        receiver.transfer(amount);
    }

    function soldOut() public view returns (bool) {
        return (totalPreSaleAmount +
            totalPublicSaleAmount +
            PRE_ALLOCATED_AMOUNT ==
            MAX_TOTAL_SUPPLY);
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
