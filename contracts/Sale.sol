//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDava.sol";

contract Sale is EIP712, Ownable {
    bytes32 public constant TYPE_HASH =
        keccak256("Whitelist(uint256 ticketAmount,address beneficiary)");

    uint256 public constant PRE_ALLOCATED_AMOUNT = 500;

    uint256 public constant PRICE = 0.095 ether;
    uint256 public constant MAX_MINT_PER_ACCOUNT = 50;
    uint256 public constant MAX_MINT_PER_TRANSACTION = 30;

    uint256 public constant PRE_SALE_OPENING_TIME = 10000;
    uint256 public constant PRE_SALE_CLOSING_TIME = 10000;
    uint256 public constant PUBLIC_SALE_OPENING_TIME = 10000;

    bool public soldOut = false;

    // Supply
    uint256 private constant MAX_TOTAL_SUPPLY = 10000;
    uint256 public totalAllocatedAmount = 0;
    uint256 public totalPreSaleAmount = 0;
    uint256 public totalPublicSaleAmount = 0;

    mapping(address => uint256) public preSaleMintAmountOf;
    mapping(address => uint256) public publicSaleMintAmountOf;

    IDava public dava;

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

    event PreMint(address indexed receiver, uint256 amount);
    event JoinPublicSale(address indexed buyer, uint256 amount);
    event JoinPreSale(address indexed buyer, uint256 amount);
    event WithdrawFunds(address indexed receiver, uint256 amount);
    event SoldOut();

    constructor(IDava dava_) EIP712("AvatarSale", "V1") {
        dava = dava_;
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

    function preMint(
        address[] calldata receiverList,
        uint256[] calldata amountList
    ) external onlyOwner {
        require(
            receiverList.length == amountList.length,
            "Sale: invalid arguments"
        );

        for (uint256 i = 0; i < receiverList.length; i++) {
            require(
                amountList[i] <= PRE_ALLOCATED_AMOUNT - totalAllocatedAmount,
                "Sale: exceeds max allocated amount"
            );
            totalAllocatedAmount += amountList[i];

            for (uint256 j = 0; j < amountList[i]; j += 1) {
                dava.mint(receiverList[i], dava.totalSupply());
            }
        }
    }

    function joinPublicSale(uint256 purchaseAmount)
        external
        payable
        onlyDuringPublicSale
    {
        require(!soldOut, "Sale: sold out");
        require(
            purchaseAmount <= MAX_MINT_PER_TRANSACTION,
            "Sale: can not purchase more than MAX_MINT_PER_TRANSACTION in a transaction"
        );
        require(
            purchaseAmount <= MAX_TOTAL_SUPPLY - dava.totalSupply(),
            "Sale: exceeds max supply"
        );
        require(
            purchaseAmount <=
                MAX_MINT_PER_ACCOUNT - publicSaleMintAmountOf[msg.sender],
            "Sale: can not purchase more than MAX_MINT_PER_ACCOUNT"
        );
        _checkEthAmount(purchaseAmount, msg.value);

        publicSaleMintAmountOf[msg.sender] += purchaseAmount;
        totalPublicSaleAmount += purchaseAmount;

        if (dava.totalSupply() + purchaseAmount == MAX_TOTAL_SUPPLY) {
            soldOut = true;
            emit SoldOut();
        }

        for (uint256 i = 0; i < purchaseAmount; i += 1) {
            dava.mint(msg.sender, dava.totalSupply());
        }

        emit JoinPublicSale(msg.sender, purchaseAmount);
    }

    function joinPreSale(uint256 purchaseAmount, PreSaleReq calldata preSaleReq)
        external
        payable
        onlyDuringPreSale
    {
        require(
            purchaseAmount <= MAX_MINT_PER_TRANSACTION,
            "Sale: can not purchase more than MAX_MINT_PER_TRANSACTION in a transaction"
        );
        require(
            msg.sender == preSaleReq.whitelist.beneficiary,
            "Sale: msg.sender is not whitelisted"
        );
        require(
            purchaseAmount <=
                preSaleReq.whitelist.ticketAmount -
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
            dava.mint(msg.sender, dava.totalSupply());
        }

        emit JoinPreSale(msg.sender, purchaseAmount);
    }

    function withdrawFunds(address payable receiver) external onlyOwner {
        uint256 amount = address(this).balance;
        receiver.transfer(amount);

        emit WithdrawFunds(receiver, amount);
    }

    function _checkEthAmount(uint256 purchaseAmount, uint256 paidEth)
        private
        pure
    {
        uint256 requiredEth = purchaseAmount * PRICE;
        require(paidEth >= requiredEth, "Sale: not enough eth");
    }
}
