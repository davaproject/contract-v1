//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {ERC1155Holder, ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {AccessControl, IAccessControl, IERC165} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IRandomizer} from "./IRandomizer.sol";

contract Drops is ERC1155Holder, EIP712, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant SNAPSHOT_TYPE_HASH =
        keccak256("SnapShot(uint256 amount,address beneficiary)");

    IERC1155 public erc1155;
    IRandomizer private _randomizer;

    uint16 public totalClaimedAmount = 0;
    mapping(address => uint256) public claimedAmountOf;
    EnumerableSet.UintSet internal _partsIds;

    uint256 public openedAt;
    uint256 public closedAt;

    struct SnapShot {
        uint256 amount;
        address beneficiary;
    }

    struct ClaimReq {
        uint8 vSig;
        bytes32 rSig;
        bytes32 sSig;
        SnapShot snapshot;
    }

    modifier whenOpened() {
        require(block.timestamp >= openedAt, "Drops: not opened");
        require(block.timestamp <= closedAt, "Drops: closed");
        _;
    }

    constructor(IERC1155 erc1155_, IRandomizer randomizer_)
        EIP712("DavaDrops", "V1")
    {
        erc1155 = erc1155_;
        _randomizer = randomizer_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setSchedule(uint256 openedAt_, uint256 closedAt_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        openedAt = openedAt_;
        closedAt = closedAt_;
    }

    function setRandomizer(IRandomizer randomizer_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _randomizer = randomizer_;
    }

    function setERC1155(IERC1155 erc1155_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        erc1155 = erc1155_;
    }

    function reset() external onlyRole(DEFAULT_ADMIN_ROLE) {
        totalClaimedAmount = 0;
    }

    function claim(ClaimReq calldata claimReq, uint16 claimedAmount)
        external
        whenOpened
    {
        require(
            msg.sender == claimReq.snapshot.beneficiary,
            "Drops: not authorized"
        );
        require(
            claimedAmount <=
                claimReq.snapshot.amount - claimedAmountOf[msg.sender],
            "Drops: exceeds assigned amount"
        );
        require(claimedAmount > 0, "Drops: can not claim 0");

        _verifyClaimSig(claimReq);

        claimedAmountOf[msg.sender] += claimedAmount;

        uint8[] memory indexList = _randomizer.getIndexList(
            totalClaimedAmount,
            claimedAmount
        );
        totalClaimedAmount += claimedAmount;

        uint256[] memory ids = new uint256[](claimedAmount);
        uint256[] memory amounts = new uint256[](claimedAmount);

        uint256 amountOfUniqueId = 1;
        ids[0] = indexList[0];
        amounts[0] = 1;
        for (uint256 i = 1; i < claimedAmount; i += 1) {
            bool isNewId = true;
            for (uint256 j = 0; j < amountOfUniqueId; j += 1) {
                if (ids[j] == indexList[i]) {
                    amounts[j] += 1;
                    isNewId = false;
                    break;
                }
            }

            if (isNewId) {
                ids[amountOfUniqueId] = _partsIds.at(indexList[i]);
                amounts[amountOfUniqueId] = 1;
                amountOfUniqueId += 1;
            }
        }

        erc1155.safeBatchTransferFrom(
            address(this),
            claimReq.snapshot.beneficiary,
            ids,
            amounts,
            ""
        );
    }

    function retrieveAll(address receiver)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256[] memory ids = new uint256[](_partsIds.length());
        uint256[] memory amounts = new uint256[](_partsIds.length());

        uint256 amountOfPartIds = _partsIds.length();
        for (uint256 i = 0; i < amountOfPartIds; i += 1) {
            ids[i] = _partsIds.at(amountOfPartIds - i - 1);
            _partsIds.remove(ids[i]);
            amounts[i] = erc1155.balanceOf(address(this), ids[i]);
        }

        erc1155.safeBatchTransferFrom(
            address(this),
            receiver,
            ids,
            amounts,
            ""
        );
    }

    function onERC1155Received(
        address,
        address,
        uint256 id,
        uint256,
        bytes memory
    ) public override returns (bytes4) {
        if (!_partsIds.contains(id)) {
            _partsIds.add(id);
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory ids,
        uint256[] memory,
        bytes memory
    ) public override returns (bytes4) {
        for (uint256 i = 0; i < ids.length; i += 1) {
            if (!_partsIds.contains(ids[i])) {
                _partsIds.add(ids[i]);
            }
        }

        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Receiver, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _verifyClaimSig(ClaimReq calldata claimReq) internal view {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SNAPSHOT_TYPE_HASH,
                    claimReq.snapshot.amount,
                    claimReq.snapshot.beneficiary
                )
            )
        );

        address signer = ecrecover(
            digest,
            claimReq.vSig,
            claimReq.rSig,
            claimReq.sSig
        );
        require(hasRole(DEFAULT_ADMIN_ROLE, signer), "Sale: invalid signature");
    }
}
